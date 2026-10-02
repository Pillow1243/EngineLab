// Central physics constants for the Inline-5 Turbo powertrain.
export const IDLE_RPM = 880;
export const REDLINE = 7000;
export const LIMIT_RPM = 8500;

// 7-speed dual-clutch gear ratios (1st..7th) + reverse
export const GEAR_RATIOS = [3.55, 2.21, 1.53, 1.18, 0.94, 0.78, 0.64];
export const REVERSE_RATIO = 3.4;
export const FINAL_DRIVE = 3.91;

export const WHEEL_RADIUS = 0.315; // m
export const CAR_MASS = 1500; // kg

export const SHIFT_LOCK_TIME = 0.42; // seconds of DCT clutch lockout per shift

export const GEAR_NAMES = ['1', '2', '3', '4', '5', '6', '7'];
