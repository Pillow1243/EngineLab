// Central physics constants, Engine Garage presets & Tuning Parts catalog.
export const IDLE_RPM = 880;
export const REDLINE = 7000;
export const LIMIT_RPM = 8500;
export const LAUNCH_RPM = 4100;

// 7-speed dual-clutch gear ratios (1st..7th) + reverse
export const GEAR_RATIOS = [3.55, 2.21, 1.53, 1.18, 0.94, 0.78, 0.64];
export const REVERSE_RATIO = 3.4;
export const FINAL_DRIVE = 3.91;

export const WHEEL_RADIUS = 0.315; // m
export const CAR_MASS = 1500; // kg

export const SHIFT_LOCK_TIME = 0.32; // seconds of DCT clutch sync per shift

export const GEAR_NAMES = ['1', '2', '3', '4', '5', '6', '7'];

/* ------------------------------------------------------------------ */
/*  Engine Garage — 4 distinct engines (3D geometry + physics + sound) */
/* ------------------------------------------------------------------ */
export const ENGINES = {
  I4_20: {
    id: 'I4_20',
    name: 'Inline-4 2.0L',
    short: 'I4 2.0L',
    fa: '۴ سیلندر خطی',
    ko: '직렬4 · 2.0L',
    cylinders: 4,
    layout: 'inline',
    displacement: '2.0L',
    firingOrder: [1, 3, 4, 2],
    firingOrderStr: '1-3-4-2',
    crankPhases: [0, 180, 180, 0], // degrees
    fireAngles720: [0, 540, 180, 360],
    xs: [-0.48, -0.16, 0.16, 0.48],
    idleRpm: 920,
    redline: 7800,
    limitRpm: 9000,
    baseTorqueNm: 285,
    peakRpm: 3200,
    inertia: 0.145,
    firingMult: 2.0, // 4 cyl fires 2 times per crank rev
  },
  I5_29: {
    id: 'I5_29',
    name: 'Inline-5 2.9L',
    short: 'I5 2.9L',
    fa: '۵ سیلندر خطی',
    ko: '직렬5 · 2.9L',
    cylinders: 5,
    layout: 'inline',
    displacement: '2.9L',
    firingOrder: [1, 2, 4, 5, 3],
    firingOrderStr: '1-2-4-5-3',
    crankPhases: [0, 144, 216, 288, 72],
    fireAngles720: [0, 144, 576, 288, 432],
    xs: [-0.64, -0.32, 0, 0.32, 0.64],
    idleRpm: 880,
    redline: 7000,
    limitRpm: 8500,
    baseTorqueNm: 340,
    peakRpm: 2250,
    inertia: 0.23,
    firingMult: 2.5, // 5 cyl fires 2.5 times per crank rev
  },
  I6_30: {
    id: 'I6_30',
    name: 'Inline-6 3.0L',
    short: 'I6 3.0L',
    fa: '۶ سیلندر خطی (2JZ)',
    ko: '직렬6 · 3.0L',
    cylinders: 6,
    layout: 'inline',
    displacement: '3.0L',
    firingOrder: [1, 5, 3, 6, 2, 4],
    firingOrderStr: '1-5-3-6-2-4',
    crankPhases: [0, 240, 120, 120, 240, 0],
    fireAngles720: [0, 480, 240, 600, 120, 360],
    xs: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75],
    idleRpm: 820,
    redline: 7200,
    limitRpm: 8400,
    baseTorqueNm: 410,
    peakRpm: 2600,
    inertia: 0.26,
    firingMult: 3.0, // 6 cyl fires 3 times per crank rev
  },
  V8_40: {
    id: 'V8_40',
    name: 'V8 4.0L Cross-Plane',
    short: 'V8 4.0L',
    fa: '۸ سیلندر V8',
    ko: '8기통 V8 · 4.0L',
    cylinders: 8,
    layout: 'v8',
    displacement: '4.0L',
    firingOrder: [1, 8, 4, 3, 6, 5, 7, 2],
    firingOrderStr: '1-8-4-3-6-5-7-2',
    crankPhases: [0, 90, 270, 180, 90, 0, 180, 270],
    fireAngles720: [0, 630, 270, 180, 450, 360, 540, 90],
    xs: [-0.54, -0.18, 0.18, 0.54, -0.48, -0.12, 0.24, 0.6],
    idleRpm: 760,
    redline: 6800,
    limitRpm: 7900,
    baseTorqueNm: 520,
    peakRpm: 3100,
    inertia: 0.29,
    firingMult: 4.0, // 8 cyl fires 4 times per crank rev
  },
};

/* ------------------------------------------------------------------ */
/*  Forced Induction / Aspiration systems                              */
/* ------------------------------------------------------------------ */
export const ASPIRATIONS = {
  NA: {
    id: 'NA',
    label: 'NATURALLY ASPIRATED (ITB)',
    short: 'NA · بدون توربو',
    fa: 'تنفس طبیعی (ITB)',
    maxBoost: 0,
    naTorqueBonus: 1.14,
    spoolRate: 0,
    inertiaDelta: -0.02,
  },
  SINGLE_TURBO: {
    id: 'SINGLE_TURBO',
    label: 'SINGLE TURBO',
    short: '1x TURBO · تک توربو',
    fa: 'تک توربو بزرگ',
    maxBoost: 1.38,
    naTorqueBonus: 1.0,
    spoolRpmStart: 1400,
    spoolRpmFull: 3400,
    spoolTauUp: 0.48,
    inertiaDelta: 0,
  },
  TWIN_TURBO: {
    id: 'TWIN_TURBO',
    label: 'BI-TURBO / TWIN-TURBO',
    short: '2x BI-TURBO · دابل توربو',
    fa: 'دابل توربو (Bi-Turbo)',
    maxBoost: 1.85,
    naTorqueBonus: 1.04,
    spoolRpmStart: 1100,
    spoolRpmFull: 2550,
    spoolTauUp: 0.28,
    inertiaDelta: 0.01,
  },
  SUPERCHARGER: {
    id: 'SUPERCHARGER',
    label: 'TWIN-SCREW SUPERCHARGER',
    short: 'SUPERCHARGER · سوپرشارژر',
    fa: 'سوپرشارژر (بدون لگ)',
    maxBoost: 1.18,
    naTorqueBonus: 1.05,
    spoolRpmStart: 800,
    spoolRpmFull: 6500,
    spoolTauUp: 0.06,
    inertiaDelta: 0.02,
  },
};

/* ------------------------------------------------------------------ */
/*  Upgrade Parts Catalog                                              */
/* ------------------------------------------------------------------ */
export const UPGRADES = {
  internals: {
    STOCK: { id: 'STOCK', label: 'STOCK INTERNALS', short: 'STOCK', rpmBonus: 0, inertiaMult: 1.0, torqueMult: 1.0 },
    FORGED: {
      id: 'FORGED',
      label: 'FORGED PISTONS & CAMS',
      short: 'FORGED +600 RPM',
      rpmBonus: 600,
      inertiaMult: 0.8,
      torqueMult: 1.12,
    },
  },
  exhaust: {
    STOCK: { id: 'STOCK', label: 'STOCK EXHAUST', short: 'STOCK', torqueMult: 1.0, burbleAdd: 0, soundMult: 0.85 },
    SPORT: { id: 'SPORT', label: 'SPORT CAT-BACK', short: 'SPORT', torqueMult: 1.04, burbleAdd: 0.25, soundMult: 1.05 },
    TITANIUM: {
      id: 'TITANIUM',
      label: 'TITANIUM STRAIGHT-PIPE',
      short: 'TITANIUM PIPE',
      torqueMult: 1.09,
      burbleAdd: 0.6,
      soundMult: 1.28,
    },
  },
  transmission: {
    STREET: { id: 'STREET', label: '7-DCT STREET', short: '7-DCT', shiftTime: 0.32, whineMult: 1.0 },
    RACE_DOG: { id: 'RACE_DOG', label: '7-DCT RACE DOG-BOX', short: 'RACE DCT', shiftTime: 0.12, whineMult: 2.2 },
  },
  tires: {
    STREET: { id: 'STREET', label: 'STREET RADIAL', short: 'STREET', mu: 0.92 },
    SEMI_SLICK: { id: 'SEMI_SLICK', label: 'SEMI-SLICK R888', short: 'SEMI-SLICK', mu: 1.22 },
    DRAG_SLICK: { id: 'DRAG_SLICK', label: 'DRAG RADIAL SLICK', short: 'DRAG SLICK', mu: 1.55 },
  },
};

export const ECU_MODES = {
  COMFORT: {
    id: 'COMFORT',
    label: 'COMFORT',
    fa: 'شهری',
    boostMult: 0.86,
    throttleExp: 1.22,
    shiftUpRpm: 5800,
    shiftDownRpm: 2100,
    burbleChance: 0.12,
    color: '#38bdf8',
  },
  SPORT: {
    id: 'SPORT',
    label: 'SPORT',
    fa: 'اسپرت',
    boostMult: 1.0,
    throttleExp: 1.0,
    shiftUpRpm: 6900,
    shiftDownRpm: 2800,
    burbleChance: 0.6,
    color: '#22d3ee',
  },
  TRACK: {
    id: 'TRACK',
    label: 'TRACK+',
    fa: 'پیست / مسابقه',
    boostMult: 1.14,
    throttleExp: 0.82,
    shiftUpRpm: 7700,
    shiftDownRpm: 3400,
    burbleChance: 1.0,
    color: '#f97316',
  },
};
