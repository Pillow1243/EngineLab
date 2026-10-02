import {
  IDLE_RPM,
  GEAR_RATIOS,
  REVERSE_RATIO,
  FINAL_DRIVE,
  WHEEL_RADIUS,
  CAR_MASS,
  LIMIT_RPM,
  LAUNCH_RPM,
  SHIFT_LOCK_TIME,
  ECU_MODES,
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
/*  Engine state helpers (shared with HUD telemetry)                   */
/* ------------------------------------------------------------------ */
/** Instantaneous engine torque (Nm) for a given state — shared with HUD. */
export function engineTorque(rpm, throttle, boost) {
  let eff = throttle;
  if (rpm < IDLE_RPM + 130 && throttle < 0.08) {
    eff = Math.max(eff, clamp((IDLE_RPM + 60 - rpm) / IDLE_RPM, 0, 1) * 0.6);
  }
  return baseTorque(rpm) * (0.2 + 0.8 * eff) * (1 + 1.02 * boost);
}

/** Instantaneous horsepower (metric PS / HP) from torque & RPM. */
export function enginePowerHP(rpm, throttle, boost) {
  if (rpm <= 25) return 0;
  const t = engineTorque(rpm, throttle, boost);
  return (t * rpm) / 7127;
}

export function getMode(s) {
  if (s.cranking) return { label: 'CRANKING', color: '#fbbf24' };
  if (s.launchActive) return { label: 'LAUNCH CTRL', color: '#f97316' };
  if (s.shiftLock > 0.05) return { label: 'SHIFTING', color: '#f59e0b' };
  if (!s.running) return { label: s.rpm > 50 ? 'COAST' : 'STOPPED', color: '#64748b' };
  if (s.backfireFlash > 0.05) return { label: 'OVERRUN POP', color: '#fb923c' };
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
  let gearPos = s.gearPos;
  const ecu = ECU_MODES[s.ecuMode] || ECU_MODES.SPORT;
  const autoShift = !!s.autoShift;

  let _crankT = s._crankT ?? 0;
  let _prevThrottle = s._prevThrottle ?? 0;
  let bovFlash = Math.max(0, (s.bovFlash ?? 0) - dt);
  let backfireFlash = Math.max(0, (s.backfireFlash ?? 0) - dt);
  let _burbleWindow = Math.max(0, (s._burbleWindow ?? 0) - dt);
  let _burbleCd = Math.max(0, (s._burbleCd ?? 0) - dt);
  let limiterHit = s.limiterHit ?? false;
  let egt = s.egt ?? 320; // exhaust gas temp °C
  let oilTemp = s.oilTemp ?? 82; // oil temp °C
  let zeroToHundred = s.zeroToHundred ?? null;
  let _runTimer = s._runTimer ?? 0;
  let _runArmed = s._runArmed ?? true;

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
      backfireFlash: 0,
      launchActive: false,
      limiterHit: false,
      events,
    };
  }

  /* ---------------- engine off: coast down ---------------- */
  if (!running) {
    rpm = Math.max(0, rpm - (420 + rpm * 1.8) * dt);
    if (rpm < 25) rpm = 0;
    egt += (240 - egt) * Math.min(1, dt * 0.15);
    oilTemp += (75 - oilTemp) * Math.min(1, dt * 0.05);
    return {
      rpm,
      speed: 0,
      boost: 0,
      spool: Math.max(0, spool - dt * 2.5),
      shiftLock: 0,
      _crankT: 0,
      _prevThrottle: 0,
      bovFlash: 0,
      backfireFlash: 0,
      launchActive: false,
      limiterHit: false,
      egt,
      oilTemp,
      events,
    };
  }

  /* ---------------- launch control detection ---------------- */
  // Active when stopped in D 1st (or N) while holding both brake and throttle
  const launchActive =
    Math.abs(speed) < 2.5 &&
    brake > 0.35 &&
    throttle > 0.45 &&
    (gearMode === 'D' || gearMode === 'N');

  /* ---------------- turbo boost & spool ---------------- */
  const mappedThrottle = throttle > 0 ? Math.pow(clamp(throttle, 0, 1), ecu.throttleExp) : 0;
  let boostTarget =
    mappedThrottle > 0.12
      ? Math.pow(mappedThrottle, 1.08) * sstep(1350, 3350, rpm) * ecu.maxBoost
      : ecu.id === 'TRACK' && rpm > 3200
        ? 0.28 // anti-lag keeps mild positive pressure
        : 0;
  if (launchActive && rpm > 2800) {
    boostTarget = Math.max(boostTarget, 0.95); // two-step launch builds boost on the line
  }
  boost += (boostTarget - boost) * Math.min(1, dt / (mappedThrottle > 0.25 ? 0.48 : 0.85));
  boost = clamp(boost, 0, 1.55);

  const spoolTarget =
    0.12 + 0.88 * sstep(800, 6800, rpm) * (0.35 + 0.65 * Math.max(mappedThrottle, launchActive ? 0.8 : 0));
  spool += (spoolTarget - spool) * Math.min(1, dt / (spoolTarget > spool ? 0.45 : 1.7));
  spool = clamp(spool, 0, 1.2);

  /* ---------------- blow-off valve & overrun burbles ---------------- */
  if (_prevThrottle > 0.5 && throttle < 0.22 && boost > 0.4 && rpm > 2600) {
    const flutter = ecu.id === 'TRACK' || boost > 0.85;
    events.push({ type: 'bov', strength: clamp(boost / 1.38, 0.3, 1), flutter });
    bovFlash = 0.7;
    if (rpm > 3400 && ecu.burbleChance > 0) {
      _burbleWindow = ecu.id === 'TRACK' ? 1.15 : 0.65;
    }
  }

  // Overrun exhaust pops & bangs while decelerating off-throttle at high RPM
  if (_burbleWindow > 0 && throttle < 0.08 && rpm > 2900 && _burbleCd <= 0) {
    if (Math.random() < ecu.burbleChance) {
      const intensity = clamp((rpm - 2600) / 5200, 0.25, 1) * (ecu.id === 'TRACK' ? 1.0 : 0.68);
      events.push({ type: 'backfire', intensity });
      backfireFlash = 0.16;
    }
    _burbleCd = 0.07 + Math.random() * 0.11;
  }

  /* ---------------- engine torque & limiters ---------------- */
  let torque = engineTorque(rpm, mappedThrottle, boost);
  const activeLimit = launchActive ? LAUNCH_RPM : LIMIT_RPM;

  if (rpm > activeLimit) {
    torque *= clamp(1 - (rpm - activeLimit) / 140, 0, 1);
    if (!limiterHit) {
      limiterHit = true;
      events.push({ type: launchActive ? 'launchPop' : 'limiter' });
      if (launchActive) backfireFlash = 0.14;
    }
  } else if (rpm < activeLimit - 220) {
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

  if (gearMode === 'N' || launchActive) {
    // free revving — wheels only (or held on the 2-step launch limiter)
    const pumping = 0.08 * Math.max(0, rpm - 1400);
    rpm += ((torque - engFriction - 0.02 * rpm - pumping) / INERTIA) * dt;
    const a = -(fDrag + rr + fBrake * brakeDir(0)) / CAR_MASS;
    speed = launchActive ? 0 : (v + a * dt) * 3.6;
    if (Math.abs(v + a * dt) < 0.02) speed = 0;
  } else if (clutchOut) {
    // clutch disengaged: engine bleeds rpm on its own, car coasts under the brake
    rpm = Math.max(0, rpm - (150 + rpm * (locking ? 0.55 : 0.5)) * dt);
    // holding the brake at a standstill: idle-hold (stable tach while stopped in gear)
    if (Math.abs(v) < 0.2 && brake > 0.25 && throttle < 0.15) {
      rpm += (IDLE_RPM - rpm) * Math.min(1, dt * 6);
    }
    const a = -(fDrag + rr * 0.4 + fBrake * brakeDir(0)) / CAR_MASS;
    speed = (v + a * dt) * 3.6;
    if (Math.abs(v + a * dt) < 0.02 && fBrake > 0) speed = 0;
  } else {
    const slip = rpm - wheelRpm;
    const atRest = Math.abs(v) < 0.6;
    const creep = atRest && throttle < 0.12 && brake < 0.05 ? 0.15 : 1;

    if (Math.abs(slip) < REST_SLIP) {
      /* -------- clutch locked: engine + wheels are one system -------- */
      let fDrive = (((torque - engFriction) * (ratio * FINAL_DRIVE)) / WHEEL_RADIUS) * driveSign;
      fDrive = clamp(fDrive, -TRACTION, TRACTION);
      let a = (fDrive - fDrag - rr - fBrake * brakeDir(fDrive)) / CAR_MASS;
      // engine braking (pumping losses) when off the throttle in gear
      if (throttle < 0.06) {
        a -= (((0.028 * rpm) * (ratio * FINAL_DRIVE)) / WHEEL_RADIUS) * driveSign / CAR_MASS;
      }
      // DCT creep: gentle auto-crawl at a standstill
      if (throttle < 0.05 && brake < 0.03 && Math.abs(v) < 2.5) {
        a = (2.0 * driveSign - v) * 0.6;
      }
      speed = (v + a * dt) * 3.6;
      if (Math.abs(v + a * dt) < 0.02 && fBrake > Math.abs(fDrive)) speed = 0;
      rpm =
        (Math.abs(speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (ratio * FINAL_DRIVE);
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
      if (Math.abs(v) < 0.15 && brake > 0.25 && throttle < 0.15) {
        rpm += (IDLE_RPM - rpm) * Math.min(1, dt * 5);
        speed = 0;
      }
    }
  }

  /* ---------------- optional automatic DCT shifting ---------------- */
  if (autoShift && gearMode === 'D' && !locking && !launchActive) {
    if (rpm > ecu.shiftUpRpm && gearPos < 7 && throttle > 0.18 && speed > 12) {
      gearPos += 1;
      shiftLock = SHIFT_LOCK_TIME * 0.85;
      events.push({ type: 'shift', dir: 'up' });
    } else if (
      rpm < ecu.shiftDownRpm &&
      gearPos > 1 &&
      (throttle < 0.35 || brake > 0.2) &&
      Math.abs(speed) > 8
    ) {
      gearPos -= 1;
      shiftLock = SHIFT_LOCK_TIME * 0.7;
      // rev-match blip
      const nextRatio = GEAR_RATIOS[gearPos - 1];
      const targetRpm =
        (Math.abs(speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (nextRatio * FINAL_DRIVE);
      rpm = Math.min(LIMIT_RPM - 300, Math.max(rpm, targetRpm * 0.95));
      events.push({ type: 'downshiftBlip' });
    }
  }

  /* ---------------- thermal model (EGT & Oil Temp) ---------------- */
  const egtTarget =
    310 +
    410 * clamp(rpm / LIMIT_RPM, 0, 1) * (0.35 + 0.65 * mappedThrottle) +
    195 * clamp(boost / 1.5, 0, 1) +
    (backfireFlash > 0 ? 85 : 0);
  egt += (egtTarget - egt) * Math.min(1, dt * (egtTarget > egt ? 0.55 : 0.22));
  egt = clamp(egt, 240, 995);

  const oilTarget = 84 + 24 * clamp(rpm / LIMIT_RPM, 0, 1) + 9 * clamp(boost / 1.5, 0, 1);
  oilTemp += (oilTarget - oilTemp) * Math.min(1, dt * 0.08);
  oilTemp = clamp(oilTemp, 70, 122);

  /* ---------------- 0–100 km/h automatic stopwatch ---------------- */
  if (Math.abs(speed) < 1.2) {
    _runArmed = true;
    _runTimer = 0;
  } else if (_runArmed && speed > 1.2 && gearMode === 'D') {
    _runTimer += dt;
    if (speed >= 100) {
      zeroToHundred = Number(_runTimer.toFixed(2));
      _runArmed = false;
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
    gearPos,
    _crankT,
    _prevThrottle: throttle,
    bovFlash,
    backfireFlash,
    _burbleWindow,
    _burbleCd,
    launchActive,
    limiterHit,
    egt,
    oilTemp,
    zeroToHundred,
    _runTimer,
    _runArmed,
    events,
  };
}
