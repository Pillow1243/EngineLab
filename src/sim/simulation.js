import {
  IDLE_RPM,
  GEAR_RATIOS,
  REVERSE_RATIO,
  FINAL_DRIVE,
  WHEEL_RADIUS,
  CAR_MASS,
  LIMIT_RPM,
} from './constants.js';

/* ------------------------------------------------------------------ */
/*  Tuning constants                                                   */
/* ------------------------------------------------------------------ */
const G = 9.81;
const INERTIA = 0.24; // effective rotational inertia (kg·m²)
const F_RR = 0.015 * CAR_MASS * G; // rolling resistance [N]
const DRAG_C = 0.42; // 0.5 · ρ · CdA
const BRAKE_FORCE = 9500; // full brake [N]
const TRACTION = CAR_MASS * G * 0.92; // traction limit [N]
const CLUTCH_T = 0.17; // engine torque per rpm of slip [Nm/rpm]
const CLUTCH_F = 6.13; // wheel force per rpm of slip [N/rpm] (≈ TRACTION/2200)
const REST_SLIP = 45; // rpm — below this the clutch is considered locked

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/*  Engine torque curve (naturally aspirated base, Nm)                 */
/* ------------------------------------------------------------------ */
export function baseTorque(rpm) {
  if (rpm < 240) return 0;
  const rise = sstep(240, 1350, rpm);
  const peak = 1 + 0.16 * Math.exp(-((rpm - 2150) ** 2) / (2 * 780 ** 2));
  const droop = 1 - 0.3 * sstep(4600, 7300, rpm);
  return 340 * rise * peak * droop;
}

/* ------------------------------------------------------------------ */
/*  Engine state helper (shared with HUD telemetry)                    */
/* ------------------------------------------------------------------ */
/** Instantaneous engine torque (Nm) for a given state — shared with HUD. */
export function engineTorque(rpm, throttle, boost) {
  let eff = throttle;
  if (rpm < IDLE_RPM + 130 && throttle < 0.08) {
    eff = Math.max(eff, clamp((IDLE_RPM + 60 - rpm) / IDLE_RPM, 0, 1) * 0.6);
  }
  return baseTorque(rpm) * (0.2 + 0.8 * eff) * (1 + 1.02 * boost);
}

export function getMode(s) {
  if (s.cranking) return { label: 'CRANKING', color: '#fbbf24' };
  if (s.shiftLock > 0.05) return { label: 'SHIFTING', color: '#f59e0b' };
  if (!s.running) return { label: s.rpm > 50 ? 'COAST' : 'STOPPED', color: '#64748b' };
  if (s.boost > 0.5) return { label: 'BOOST', color: '#22d3ee' };
  if (s.throttle < 0.08 && s.rpm < 1150) return { label: 'IDLE', color: '#34d399' };
  if (Math.abs(s.speed) > 110) return { label: 'OVERDRIVE', color: '#818cf8' };
  if (Math.abs(s.speed) < 4 && s.throttle > 0.5) return { label: 'LAUNCH', color: '#f97316' };
  if (s.throttle < 0.15 && Math.abs(s.speed) > 10) return { label: 'CRUISE', color: '#38bdf8' };
  return { label: 'ACCEL', color: '#4ade80' };
}

/* ------------------------------------------------------------------ */
/*  The step function. Pure: (state, dt) -> partial next state+events  */
/* ------------------------------------------------------------------ */
export function stepSim(s, dt) {
  const events = [];
  let { rpm, throttle, brake, boost, spool, speed, shiftLock, cranking, running } = s;
  const gearMode = s.gearMode;
  const gearPos = s.gearPos;
  let _crankT = s._crankT ?? 0;
  let _prevThrottle = s._prevThrottle ?? 0;
  let bovFlash = Math.max(0, (s.bovFlash ?? 0) - dt);
  let limiterHit = s.limiterHit ?? false;

  const ratio = gearMode === 'D' ? GEAR_RATIOS[gearPos - 1] : gearMode === 'R' ? REVERSE_RATIO : 0;
  const driveSign = gearMode === 'R' ? -1 : 1;

  /* ---------------- starter cranking ---------------- */
  if (cranking) {
    _crankT += dt;
    rpm += (930 - rpm) * Math.min(1, dt * 3.2);
    if (_crankT >= 1.05) {
      cranking = false;
      events.push({ type: 'ignition' });
    }
    return {
      rpm,
      speed: 0,
      boost: 0,
      spool: Math.max(0, spool - dt * 2),
      shiftLock: 0,
      cranking,
      _crankT,
      _prevThrottle: 0,
      bovFlash: 0,
      limiterHit: false,
      events,
    };
  }

  /* ---------------- engine off: coast down ---------------- */
  if (!running) {
    rpm = Math.max(0, rpm - (420 + rpm * 1.8) * dt);
    if (rpm < 25) rpm = 0;
    return {
      rpm,
      speed: 0,
      boost: 0,
      spool: Math.max(0, spool - dt * 2.5),
      shiftLock: 0,
      _crankT: 0,
      _prevThrottle: 0,
      bovFlash: 0,
      limiterHit: false,
      events,
    };
  }

  /* ---------------- turbo boost & spool ---------------- */
  const boostTarget =
    throttle > 0.12 ? Math.pow(throttle, 1.1) * sstep(1400, 3400, rpm) * 1.38 : 0;
  boost += (boostTarget - boost) * Math.min(1, dt / (throttle > 0.25 ? 0.5 : 0.85));
  boost = clamp(boost, 0, 1.5);

  const spoolTarget = 0.12 + 0.88 * sstep(800, 6800, rpm) * (0.35 + 0.65 * throttle);
  spool += (spoolTarget - spool) * Math.min(1, dt / (spoolTarget > spool ? 0.45 : 1.7));
  spool = clamp(spool, 0, 1.2);

  /* ---------------- blow-off valve ---------------- */
  if (_prevThrottle > 0.5 && throttle < 0.22 && boost > 0.4 && rpm > 2600) {
    events.push({ type: 'bov', strength: clamp(boost / 1.38, 0.3, 1) });
    bovFlash = 0.7;
  }

  /* ---------------- engine torque ---------------- */
  let torque = engineTorque(rpm, throttle, boost);
  if (rpm > LIMIT_RPM) {
    torque *= clamp(1 - (rpm - LIMIT_RPM) / 160, 0, 1);
    if (!limiterHit) {
      limiterHit = true;
      events.push({ type: 'limiter' });
    }
  } else if (rpm < LIMIT_RPM - 250) {
    limiterHit = false;
  }
  const engFriction = 14 + 0.02 * rpm;

  /* ---------------- shift lockout ---------------- */
  if (shiftLock > 0) shiftLock = Math.max(0, shiftLock - dt);
  const locking = shiftLock > 0;

  /* ---------------- vehicle dynamics ---------------- */
  const v = speed / 3.6; // signed m/s
  const wheelRpm = (Math.abs(v) / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (ratio * FINAL_DRIVE);
  const fDrag = DRAG_C * v * Math.abs(v);
  const fBrake = brake * BRAKE_FORCE;
  const rr = v !== 0 ? F_RR * Math.sign(v) : 0; // rolling resistance only while moving

  // brake opposes motion; at rest it opposes whatever would drive the car
  const brakeDir = (fDrive) =>
    v !== 0 ? Math.sign(v) : fDrive !== 0 ? -Math.sign(fDrive) : 0;

  // DCT disengages the clutch during a shift lockout OR under hard braking
  const clutchOut = locking || brake > 0.45;

  if (gearMode === 'N') {
    // free revving — wheels only
    const pumping = 0.08 * Math.max(0, rpm - 1400);
    rpm += ((torque - engFriction - 0.02 * rpm - pumping) / INERTIA) * dt;
    const a = -(fDrag + rr + fBrake * brakeDir(0)) / CAR_MASS;
    speed = (v + a * dt) * 3.6;
    if (Math.abs(v + a * dt) < 0.02) speed = 0;
  } else if (clutchOut) {
    // clutch disengaged: engine bleeds rpm on its own, car coasts under the brake
    rpm = Math.max(0, rpm - (150 + rpm * (locking ? 0.55 : 0.5)) * dt);
    // holding the brake at a standstill: idle-hold (stable tach while stopped in gear)
    if (Math.abs(v) < 0.2 && brake > 0.25) rpm += (IDLE_RPM - rpm) * Math.min(1, dt * 6);
    const a = -(fDrag + rr * 0.4 + fBrake * brakeDir(0)) / CAR_MASS;
    speed = (v + a * dt) * 3.6;
    if (Math.abs(v + a * dt) < 0.02 && fBrake > 0) speed = 0;
  } else {
    const slip = rpm - wheelRpm;
    const atRest = Math.abs(v) < 0.6;
    const creep = atRest && throttle < 0.12 && brake < 0.05 ? 0.15 : 1;

    if (Math.abs(slip) < REST_SLIP) {
      /* -------- clutch locked: engine + wheels are one system -------- */
      let fDrive = ((torque - engFriction) * (ratio * FINAL_DRIVE)) / WHEEL_RADIUS * driveSign;
      fDrive = clamp(fDrive, -TRACTION, TRACTION);
      let a = (fDrive - fDrag - rr - fBrake * brakeDir(fDrive)) / CAR_MASS;
      // engine braking (pumping losses) when off the throttle in gear
      if (throttle < 0.06) {
        a -= ((0.028 * rpm) * (ratio * FINAL_DRIVE)) / WHEEL_RADIUS * driveSign / CAR_MASS;
      }
      // DCT creep: gentle auto-crawl at a standstill
      if (throttle < 0.05 && brake < 0.03 && Math.abs(v) < 2.5) {
        a = (2.0 * driveSign - v) * 0.6;
      }
      speed = (v + a * dt) * 3.6;
      if (Math.abs(v + a * dt) < 0.02 && fBrake > Math.abs(fDrive)) speed = 0;
      rpm =
        ((Math.abs(speed) / 3.6) / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (ratio * FINAL_DRIVE);
    } else {
      /* -------- clutch slipping: launch / engine-brake / downshift -------- */
      const slipClamp = clamp(slip, -2200, 2200);
      const clutchT = slipClamp * CLUTCH_T * creep;
      const clutchF = slipClamp * CLUTCH_F * creep * driveSign;

      rpm += ((torque - engFriction - 0.02 * rpm - clutchT) / INERTIA) * dt;
      const a = (clutchF - fDrag - rr - fBrake * brakeDir(clutchF)) / CAR_MASS;
      speed = (v + a * dt) * 3.6;
      if (Math.abs(v + a * dt) < 0.02 && fBrake > Math.abs(clutchF)) speed = 0;

      // idle-hold when stopped in gear with the brake applied (modern DCT behaviour)
      if (Math.abs(v) < 0.15 && brake > 0.25) {
        rpm += (IDLE_RPM - rpm) * Math.min(1, dt * 5);
        speed = 0;
      }
    }
  }

  /* ---------------- safety clamps ---------------- */
  rpm = clamp(rpm, 0, LIMIT_RPM + 160);
  speed = clamp(speed, -320, 320);
  if (!Number.isFinite(rpm)) rpm = 0;
  if (!Number.isFinite(speed)) speed = 0;

  return {
    rpm,
    speed,
    boost,
    spool,
    shiftLock,
    _crankT,
    _prevThrottle: throttle,
    bovFlash,
    limiterHit,
    events,
  };
}
