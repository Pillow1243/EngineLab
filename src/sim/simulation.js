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
  ENGINES,
  ASPIRATIONS,
  UPGRADES,
  ECU_MODES,
} from './constants.js';

/* ------------------------------------------------------------------ */
/*  Tuning constants                                                   */
/* ------------------------------------------------------------------ */
const G = 9.81;
const F_RR = 0.015 * CAR_MASS * G; // rolling resistance [N]
const DRAG_C = 0.42; // 0.5 · ρ · CdA
const BRAKE_FORCE = 9500; // full brake [N]
const CLUTCH_T = 0.17; // engine torque per rpm of slip [Nm/rpm]
const CLUTCH_F = 6.13; // wheel force per rpm of slip [N/rpm]
const REST_SLIP = 55; // rpm — below this (and above min lock rpm) clutch locks

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Resolve active engine + tuning specs from state (with safe defaults for headless tests). */
export function resolveSpecs(s = {}) {
  const eng = ENGINES[s.engineType] || ENGINES.I5_29;
  const asp = ASPIRATIONS[s.aspiration] || ASPIRATIONS.SINGLE_TURBO;
  const intern = UPGRADES.internals[s.internalsUpgrade] || UPGRADES.internals.STOCK;
  const exh = UPGRADES.exhaust[s.exhaustUpgrade] || UPGRADES.exhaust.SPORT;
  const trans = UPGRADES.transmission[s.transUpgrade] || UPGRADES.transmission.STREET;
  const tire = UPGRADES.tires[s.tireUpgrade] || UPGRADES.tires.STREET;
  const ecu = ECU_MODES[s.ecuMode] || ECU_MODES.SPORT;

  const idleRpm = eng.idleRpm || IDLE_RPM;
  const redline = eng.redline + intern.rpmBonus;
  const limitRpm = eng.limitRpm + intern.rpmBonus;
  const inertia = Math.max(0.12, (eng.inertia + (asp.inertiaDelta || 0)) * intern.inertiaMult);
  const maxBoost = asp.maxBoost * ecu.boostMult;
  const torqueScale =
    (eng.baseTorqueNm / 340) *
    asp.naTorqueBonus *
    intern.torqueMult *
    exh.torqueMult;

  return {
    eng,
    asp,
    intern,
    exh,
    trans,
    tire,
    ecu,
    idleRpm,
    redline,
    limitRpm,
    inertia,
    maxBoost,
    torqueScale,
  };
}

/* ------------------------------------------------------------------ */
/*  Engine torque curve (naturally aspirated base, Nm)                 */
/* ------------------------------------------------------------------ */
export function baseTorque(rpm, s) {
  if (rpm < 220) return 0;
  const specs = s ? resolveSpecs(s) : null;
  const peakCenter = specs ? specs.eng.peakRpm : 2150;
  const limit = specs ? specs.limitRpm : LIMIT_RPM;
  const scale = specs ? specs.torqueScale : 1;

  const rise = sstep(220, 1320, rpm);
  const peak = 1 + 0.16 * Math.exp(-((rpm - peakCenter) ** 2) / (2 * 950 ** 2));
  // VTEC high-cam kick for the I4 above 5600 RPM
  const vtecKick =
    specs?.eng.id === 'I4_20' ? 0.18 * sstep(5400, 6200, rpm) : 0;
  const droop = 1 - 0.28 * sstep(limit * 0.56, limit * 0.88, rpm);
  return 340 * scale * rise * (peak + vtecKick) * droop;
}

/* ------------------------------------------------------------------ */
/*  Engine state helpers (shared with HUD telemetry)                   */
/* ------------------------------------------------------------------ */
/** Instantaneous engine torque (Nm) for a given state — shared with HUD. */
export function engineTorque(rpm, throttle, boost, s) {
  const idle = s ? resolveSpecs(s).idleRpm : IDLE_RPM;
  let eff = throttle;
  if (rpm < idle + 150 && throttle < 0.08) {
    eff = Math.max(eff, clamp((idle + 70 - rpm) / idle, 0, 1) * 0.62);
  }
  const nosBonus = s?.nosInstalled !== false && s?.nosActive && throttle > 0.5 && rpm > 2200 ? 155 : 0;
  return baseTorque(rpm, s) * (0.2 + 0.8 * eff) * (1 + 1.02 * boost) + nosBonus;
}

/** Instantaneous horsepower (metric PS / HP) from torque & RPM. */
export function enginePowerHP(rpm, throttle, boost, s) {
  if (rpm <= 25) return 0;
  const t = engineTorque(rpm, throttle, boost, s);
  return (t * rpm) / 7127;
}

export function getMode(s) {
  if (s.cranking) return { label: 'CRANKING', color: '#fbbf24' };
  if (s.launchActive) return { label: 'LAUNCH CTRL', color: '#f97316' };
  if (s.nosInstalled !== false && s.nosActive && s.running && s.throttle > 0.4) return { label: 'N₂O SHOT!', color: '#38bdf8' };
  if (s.shiftLock > 0.05) return { label: 'SHIFTING', color: '#f59e0b' };
  if (!s.running) return { label: s.rpm > 50 ? 'COAST' : 'STOPPED', color: '#64748b' };
  if (s.backfireFlash > 0.05) return { label: 'OVERRUN POP', color: '#fb923c' };
  if (s.boost > 0.5) return { label: 'BOOST', color: '#22d3ee' };
  if (s.throttle < 0.08 && s.rpm < 1200) return { label: 'IDLE', color: '#34d399' };
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
  const specs = resolveSpecs(s);
  const { asp, exh, trans, tire, ecu, idleRpm, limitRpm, inertia, maxBoost } = specs;

  let { rpm, throttle, brake, boost, spool, speed, shiftLock, cranking, running } = s;
  const gearMode = s.gearMode;
  let gearPos = s.gearPos;
  const autoShift = !!s.autoShift;

  let _crankT = s._crankT ?? 0;
  let _prevThrottle = s._prevThrottle ?? 0;
  let bovFlash = Math.max(0, (s.bovFlash ?? 0) - dt);
  let backfireFlash = Math.max(0, (s.backfireFlash ?? 0) - dt);
  let _burbleWindow = Math.max(0, (s._burbleWindow ?? 0) - dt);
  let _burbleCd = Math.max(0, (s._burbleCd ?? 0) - dt);
  let limiterHit = s.limiterHit ?? false;
  let wheelspin = false;
  let egt = s.egt ?? 320;
  let oilTemp = s.oilTemp ?? 82;
  let zeroToHundred = s.zeroToHundred ?? null;
  let _runTimer = s._runTimer ?? 0;
  let _runArmed = s._runArmed ?? true;

  const ratio = gearMode === 'D' ? GEAR_RATIOS[gearPos - 1] : gearMode === 'R' ? REVERSE_RATIO : 0;
  const driveSign = gearMode === 'R' ? -1 : 1;

  /* ---------------- starter cranking ---------------- */
  if (cranking) {
    _crankT += dt;
    rpm += (idleRpm + 50 - rpm) * Math.min(1, dt * 3.2);
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
      wheelspin: false,
      limiterHit: false,
      events,
    };
  }

  /* ---------------- engine off: coast down ---------------- */
  if (!running) {
    rpm = Math.max(0, rpm - (420 + rpm * 1.8) * dt);
    if (rpm < 25) rpm = 0;
    const v = speed / 3.6;
    const fDrag = DRAG_C * v * Math.abs(v);
    const rr = v !== 0 ? F_RR * Math.sign(v) : 0;
    const fBrake = (brake * BRAKE_FORCE + 280) * (v !== 0 ? Math.sign(v) : 0);
    const nextV = v - ((fDrag + rr + fBrake) / CAR_MASS) * dt;
    speed = Math.abs(nextV) < 0.08 || nextV * v < 0 ? 0 : nextV * 3.6;
    egt += (240 - egt) * Math.min(1, dt * 0.15);
    oilTemp += (75 - oilTemp) * Math.min(1, dt * 0.05);
    return {
      rpm,
      speed,
      boost: 0,
      spool: Math.max(0, spool - dt * 2.5),
      shiftLock: 0,
      _crankT: 0,
      _prevThrottle: 0,
      bovFlash: 0,
      backfireFlash: 0,
      launchActive: false,
      wheelspin: false,
      limiterHit: false,
      egt,
      oilTemp,
      events,
    };
  }

  /* ---------------- launch control detection ---------------- */
  const launchActive =
    Math.abs(speed) < 2.5 &&
    brake > 0.35 &&
    throttle > 0.45 &&
    (gearMode === 'D' || gearMode === 'N');

  /* ---------------- forced induction: NA / Single / Twin / Supercharger ---------------- */
  const mappedThrottle = throttle > 0 ? Math.pow(clamp(throttle, 0, 1), ecu.throttleExp) : 0;

  if (asp.id === 'NA') {
    boost = 0;
    spool = 0;
  } else if (asp.id === 'SUPERCHARGER') {
    // Roots / Twin-Screw positive-displacement supercharger: instant low-end boost right off idle!
    const scCurve = 0.42 + 0.58 * sstep(idleRpm, limitRpm * 0.62, rpm);
    const scTarget = mappedThrottle > 0.08 ? mappedThrottle * scCurve * maxBoost : 0;
    boost += (scTarget - boost) * Math.min(1, dt / 0.05);
    boost = clamp(boost, 0, 1.8);
    spool = clamp((rpm / limitRpm) * 1.15, 0, 1.2);
  } else {
    // Single Turbo or Twin-Turbo
    let boostTarget =
      mappedThrottle > 0.12
        ? Math.pow(mappedThrottle, 1.08) *
          sstep(asp.spoolRpmStart, asp.spoolRpmFull, rpm) *
          maxBoost
        : ecu.id === 'TRACK' && rpm > 3200
          ? 0.28
          : 0;
    if (launchActive && rpm > 2600) {
      boostTarget = Math.max(boostTarget, Math.min(maxBoost, 1.05));
    }
    boost += (boostTarget - boost) * Math.min(1, dt / (mappedThrottle > 0.25 ? asp.spoolTauUp : 0.82));
    boost = clamp(boost, 0, 2.25);

    const spoolTarget =
      0.12 +
      0.88 *
        sstep(800, 6600, rpm) *
        (0.35 + 0.65 * Math.max(mappedThrottle, launchActive ? 0.85 : 0));
    const tauUp = asp.id === 'TWIN_TURBO' ? 0.28 : 0.45;
    spool += (spoolTarget - spool) * Math.min(1, dt / (spoolTarget > spool ? tauUp : 1.6));
    spool = clamp(spool, 0, 1.25);
  }

  /* ---------------- blow-off valve & overrun burbles ---------------- */
  const isTurbo = asp.id === 'SINGLE_TURBO' || asp.id === 'TWIN_TURBO';
  if (_prevThrottle > 0.5 && throttle < 0.22 && rpm > 2600) {
    if (isTurbo && boost > 0.38) {
      const flutter = ecu.id === 'TRACK' || asp.id === 'TWIN_TURBO' || boost > 0.85;
      events.push({ type: 'bov', strength: clamp(boost / 1.38, 0.3, 1.2), flutter });
      bovFlash = 0.7;
    }
    const burbleTotal = clamp(ecu.burbleChance + exh.burbleAdd, 0, 1);
    if (rpm > 3200 && burbleTotal > 0.1) {
      _burbleWindow = ecu.id === 'TRACK' || exh.id === 'TITANIUM' ? 1.25 : 0.65;
    }
  }

  // Overrun exhaust pops & bangs while decelerating off-throttle at high RPM
  const burbleChance = clamp(ecu.burbleChance + exh.burbleAdd, 0, 1);
  if (_burbleWindow > 0 && throttle < 0.08 && rpm > 2700 && _burbleCd <= 0) {
    if (Math.random() < burbleChance) {
      const intensity =
        clamp((rpm - 2400) / 5200, 0.3, 1) *
        (exh.id === 'TITANIUM' ? 1.15 : ecu.id === 'TRACK' ? 1.0 : 0.7);
      events.push({ type: 'backfire', intensity });
      backfireFlash = 0.18;
    }
    _burbleCd = 0.065 + Math.random() * 0.1;
  }

  /* ---------------- engine torque & limiters ---------------- */
  let torque = engineTorque(rpm, mappedThrottle, boost, s);
  const activeLimit = launchActive ? LAUNCH_RPM : limitRpm;

  if (rpm > activeLimit) {
    torque *= clamp(1 - (rpm - activeLimit) / 140, 0, 1);
    if (!limiterHit) {
      limiterHit = true;
      events.push({ type: launchActive ? 'launchPop' : 'limiter' });
      if (launchActive) backfireFlash = 0.15;
    }
  } else if (rpm < activeLimit - 220) {
    limiterHit = false;
  }
  const engFriction = 14 + 0.02 * rpm;

  /* ---------------- shift lockout ---------------- */
  if (shiftLock > 0) shiftLock = Math.max(0, shiftLock - dt);
  const locking = shiftLock > 0;

  /* ---------------- vehicle & gearbox dynamics (bug-free DCT model) ---------------- */
  const v = speed / 3.6; // signed m/s (+ forward, - reverse)
  const vAlongGear = v * driveSign; // speed in the direction of the selected gear
  const wheelRpm =
    ratio > 0 && vAlongGear > 0
      ? (vAlongGear / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (ratio * FINAL_DRIVE)
      : 0;

  const fDrag = DRAG_C * v * Math.abs(v);
  const fBrake = brake * BRAKE_FORCE;
  const rr = v !== 0 ? F_RR * Math.sign(v) : 0;
  const tractionMax = CAR_MASS * G * tire.mu;

  const brakeDir = (fDrive) =>
    v !== 0 ? Math.sign(v) : fDrive !== 0 ? -Math.sign(fDrive) : 0;

  // Moving opposite to selected gear (e.g. switched to R while rolling forward):
  // DCT opens clutch and applies automatic hill/direction brake until stopped
  const wrongWay = ratio > 0 && v * driveSign < -0.25;

  // DCT disengages clutch during shift sync, hard braking, or wrong-way motion
  const clutchOut = locking || brake > 0.45 || wrongWay;

  if (gearMode === 'N' || launchActive) {
    // Neutral free-revving or held on 2-step launch limiter
    const pumping = 0.08 * Math.max(0, rpm - (idleRpm + 520));
    rpm += ((torque - engFriction - 0.02 * rpm - pumping) / inertia) * dt;
    const a = -(fDrag + rr + fBrake * brakeDir(0)) / CAR_MASS;
    speed = launchActive ? 0 : (v + a * dt) * 3.6;
    if (Math.abs(v + a * dt) < 0.02) speed = 0;
  } else if (clutchOut) {
    if (wrongWay) {
      // Gently bring vehicle to a stop before engaging opposite direction
      rpm += (idleRpm - rpm) * Math.min(1, dt * 5);
      const stopBrake = Math.max(fBrake, 6500) * Math.sign(v);
      const a = -(fDrag + rr + stopBrake) / CAR_MASS;
      const nextV = v + a * dt;
      speed = nextV * v <= 0 || Math.abs(nextV) < 0.05 ? 0 : nextV * 3.6;
    } else if (locking) {
      // DCT Shift Synchronization:
      // If moving and rpm > target gear's wheelRpm, bleed rpm down toward wheelRpm (classic upshift drop).
      // If parked or near idle, never drop below idleRpm!
      const syncFloor = Math.max(idleRpm, wheelRpm * 0.96);
      if (rpm > syncFloor + 40) {
        rpm = Math.max(syncFloor, rpm - (150 + rpm * 0.55) * dt);
      } else {
        rpm += (syncFloor - rpm) * Math.min(1, dt * 6);
      }
      const a = -(fDrag + rr * 0.4 + fBrake * brakeDir(0)) / CAR_MASS;
      speed = (v + a * dt) * 3.6;
      if (Math.abs(v + a * dt) < 0.02 && fBrake > 0) speed = 0;
    } else {
      // Clutch disengaged under hard braking: engine settles smoothly toward idleRpm (or revs if gas is pressed)
      if (throttle > 0.15) {
        const pumping = 0.08 * Math.max(0, rpm - (idleRpm + 520));
        rpm += ((torque - engFriction - 0.02 * rpm - pumping) / inertia) * dt;
      } else {
        const decay = 150 + rpm * 0.5;
        rpm = Math.max(idleRpm, rpm - decay * dt);
      }
      const a = -(fDrag + rr * 0.4 + fBrake * brakeDir(0)) / CAR_MASS;
      const nextV = v + a * dt;
      speed = Math.abs(nextV) < 0.03 || (v !== 0 && nextV * v < 0) ? 0 : nextV * 3.6;
    }
  } else {
    const slip = rpm - wheelRpm;
    const atRest = Math.abs(v) < 0.6;
    const creep = atRest && throttle < 0.12 && brake < 0.05 ? 0.15 : 1;

    // Anti-stall rule: Clutch ONLY locks when wheelRpm is comfortably above idle!
    // Below (idleRpm + 140), the DCT wet clutch automatically feathers so the engine NEVER stalls or drops below idle.
    const minLockRpm = idleRpm + 140;
    const canLock = wheelRpm >= minLockRpm && Math.abs(slip) < REST_SLIP;

    if (canLock) {
      /* -------- clutch locked: engine + wheels are coupled -------- */
      let rawDrive = (((torque - engFriction) * (ratio * FINAL_DRIVE)) / WHEEL_RADIUS) * driveSign;
      const overTraction = Math.abs(rawDrive) > tractionMax && throttle > 0.5;
      let fDrive = clamp(rawDrive, -tractionMax, tractionMax);

      let a = (fDrive - fDrag - rr - fBrake * brakeDir(fDrive)) / CAR_MASS;
      // engine braking (pumping losses) when off the throttle in gear
      if (throttle < 0.06) {
        a -= (((0.028 * rpm) * (ratio * FINAL_DRIVE)) / WHEEL_RADIUS) * driveSign / CAR_MASS;
      }
      const nextV = v + a * dt;
      speed = Math.abs(nextV) < 0.02 && fBrake > Math.abs(fDrive) ? 0 : nextV * 3.6;

      const newWheelRpm =
        (Math.abs(speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (ratio * FINAL_DRIVE);
      if (overTraction) {
        wheelspin = true;
        // Driven wheels spin slightly above road speed during wheelspin
        const spinSurge = Math.min(950, (Math.abs(rawDrive) - tractionMax) * 0.12);
        rpm = Math.max(idleRpm, newWheelRpm + spinSurge);
      } else {
        rpm = Math.max(idleRpm, newWheelRpm);
      }
    } else {
      /* -------- clutch slipping / feathering: launch, low-speed anti-stall, downshift -------- */
      // If wheelRpm is below idle and throttle is released, decouple negative slip so wheels never drag engine below idle
      const effectiveSlip =
        wheelRpm < minLockRpm && throttle < 0.08 ? Math.max(0, slip) : slip;
      const slipClamp = clamp(effectiveSlip, -2200, 2200);
      const clutchT = slipClamp * CLUTCH_T * creep;
      let clutchF = slipClamp * CLUTCH_F * creep * driveSign;

      if (Math.abs(clutchF) > tractionMax) {
        wheelspin = true;
        clutchF = clamp(clutchF, -tractionMax, tractionMax);
      }

      rpm += ((torque - engFriction - 0.02 * rpm - clutchT) / inertia) * dt;

      // DCT creep at standstill when brake & throttle are released
      let a = (clutchF - fDrag - rr - fBrake * brakeDir(clutchF)) / CAR_MASS;
      if (throttle < 0.05 && brake < 0.03 && Math.abs(v) < 2.2) {
        a = (1.9 * driveSign - v) * 0.6;
      }

      const nextV = v + a * dt;
      speed = Math.abs(nextV) < 0.02 && fBrake > Math.abs(clutchF) ? 0 : nextV * 3.6;

      // Anti-stall floor: while running, engine RPM never sags below idleRpm
      if (rpm < idleRpm) {
        rpm += (idleRpm - rpm) * Math.min(1, dt * 10);
      }
      if (Math.abs(v) < 0.15 && brake > 0.25 && throttle < 0.15) {
        rpm += (idleRpm - rpm) * Math.min(1, dt * 6);
        speed = 0;
      }
    }
  }

  /* ---------------- Standstill Auto-Reset to 1st Gear & Auto-Shift ---------------- */
  // Real DCT behavior: coming to a complete stop in D automatically selects 1st gear
  if (gearMode === 'D' && Math.abs(speed) < 1.0 && throttle < 0.08 && gearPos > 1 && !locking) {
    gearPos = 1;
  }

  if (autoShift && gearMode === 'D' && !locking && !launchActive) {
    const upRpm = Math.min(limitRpm - 350, ecu.shiftUpRpm + specs.intern.rpmBonus * 0.7);
    if (rpm > upRpm && gearPos < 7 && throttle > 0.18 && speed > 12) {
      gearPos += 1;
      shiftLock = trans.shiftTime;
      events.push({ type: 'shift', dir: 'up' });
    } else if (
      rpm < ecu.shiftDownRpm &&
      gearPos > 1 &&
      (throttle < 0.35 || brake > 0.2) &&
      Math.abs(speed) > 8
    ) {
      gearPos -= 1;
      shiftLock = trans.shiftTime * 0.85;
      const nextRatio = GEAR_RATIOS[gearPos - 1];
      const targetRpm =
        (Math.abs(speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (nextRatio * FINAL_DRIVE);
      rpm = Math.min(limitRpm - 250, Math.max(rpm, targetRpm * 0.95));
      events.push({ type: 'downshiftBlip' });
    }
  }

  /* ---------------- thermal model (EGT & Oil Temp) ---------------- */
  const egtTarget =
    310 +
    420 * clamp(rpm / limitRpm, 0, 1) * (0.35 + 0.65 * mappedThrottle) +
    190 * clamp(boost / 1.5, 0, 1.3) +
    (s.nosInstalled !== false && s.nosActive && throttle > 0.5 ? 110 : 0) +
    (backfireFlash > 0 ? 85 : 0);
  egt += (egtTarget - egt) * Math.min(1, dt * (egtTarget > egt ? 0.55 : 0.22));
  egt = clamp(egt, 240, 1020);

  const oilTarget = 84 + 24 * clamp(rpm / limitRpm, 0, 1) + 9 * clamp(boost / 1.5, 0, 1.2);
  oilTemp += (oilTarget - oilTemp) * Math.min(1, dt * 0.08);
  oilTemp = clamp(oilTemp, 70, 125);

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
  rpm = clamp(rpm, 0, limitRpm + 160);
  speed = clamp(speed, -360, 360);
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
    wheelspin,
    limiterHit,
    egt,
    oilTemp,
    zeroToHundred,
    _runTimer,
    _runArmed,
    events,
  };
}
