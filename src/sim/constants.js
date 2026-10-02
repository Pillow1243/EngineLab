// Central physics constants for the Inline-5 Turbo powertrain.
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

export const SHIFT_LOCK_TIME = 0.42; // seconds of DCT clutch lockout per shift

export const GEAR_NAMES = ['1', '2', '3', '4', '5', '6', '7'];

export const ECU_MODES = {
  COMFORT: {
    id: 'COMFORT',
    label: 'COMFORT',
    fa: 'شهری',
    maxBoost: 1.2,
    throttleExp: 1.25,
    shiftUpRpm: 6200,
    shiftDownRpm: 2100,
    burbleChance: 0.15,
    color: '#38bdf8',
  },
  SPORT: {
    id: 'SPORT',
    label: 'SPORT',
    fa: 'اسپرت',
    maxBoost: 1.38,
    throttleExp: 1.0,
    shiftUpRpm: 7200,
    shiftDownRpm: 2800,
    burbleChance: 0.65,
    color: '#22d3ee',
  },
  TRACK: {
    id: 'TRACK',
    label: 'TRACK+',
    fa: 'پیست / مسابقه',
    maxBoost: 1.52,
    throttleExp: 0.82,
    shiftUpRpm: 7900,
    shiftDownRpm: 3400,
    burbleChance: 1.0,
    color: '#f97316',
  },
};
