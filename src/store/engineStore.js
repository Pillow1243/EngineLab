import { create } from 'zustand';
import {
  SHIFT_LOCK_TIME,
  GEAR_RATIOS,
  FINAL_DRIVE,
  WHEEL_RADIUS,
  LIMIT_RPM,
} from '../sim/constants.js';

const c01 = (v) => Math.min(1, Math.max(0, v));

const vibrate = (pattern) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore on unsupported devices */
  }
};

export const useEngineStore = create((set, get) => ({
  /* ---------- fast fields (written by the simulation loop each frame) ---------- */
  running: false,
  cranking: false,
  rpm: 0,
  throttle: 0,
  brake: 0,
  boost: 0,
  spool: 0,
  speed: 0, // signed km/h
  shiftLock: 0, // seconds remaining of DCT lockout
  bovFlash: 0,
  backfireFlash: 0,
  launchActive: false,
  limiterHit: false,
  egt: 320, // °C
  oilTemp: 82, // °C
  zeroToHundred: null, // best/last 0-100 km/h in seconds
  _crankT: 0,
  _prevThrottle: 0,
  _burbleWindow: 0,
  _burbleCd: 0,
  _runTimer: 0,
  _runArmed: true,
  _pendingEvent: null,

  /* ---------- discrete fields (drive React re-renders) ---------- */
  gearMode: 'D', // 'R' | 'N' | 'D'
  gearPos: 1, // 1..7
  view: 'front', // 'front' | 'side' | 'top' | 'detail' | 'turbo'
  xray: false, // translucent cutaway block & head
  ecuMode: 'SPORT', // 'COMFORT' | 'SPORT' | 'TRACK'
  autoShift: false, // automatic 7-DCT shifting
  audioOn: false,
  muted: false,

  /* ---------- actions ---------- */
  start() {
    if (get().running) return;
    vibrate([25, 40, 60]);
    set({ running: true, cranking: true, _crankT: 0, audioOn: true });
  },
  stop() {
    vibrate(20);
    set({ running: false, cranking: false, throttle: 0, brake: 0, launchActive: false });
  },
  togglePower() {
    get().running ? get().stop() : get().start();
  },
  setGearMode(m) {
    if (get().gearMode === m) return;
    vibrate(15);
    set({ gearMode: m, gearPos: 1, shiftLock: SHIFT_LOCK_TIME * 0.7 });
  },
  selectGear(i) {
    const s = get();
    if (s.gearMode === 'D' && i === s.gearPos) return;
    vibrate(12);
    const isDown = s.gearMode === 'D' && i < s.gearPos && Math.abs(s.speed) > 8;
    let nextRpm = s.rpm;
    if (isDown && s.running) {
      const nextRatio = GEAR_RATIOS[i - 1];
      const targetRpm =
        (Math.abs(s.speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (nextRatio * FINAL_DRIVE);
      nextRpm = Math.min(LIMIT_RPM - 250, Math.max(s.rpm, targetRpm * 0.92));
    }
    set({
      gearMode: 'D',
      gearPos: i,
      rpm: nextRpm,
      shiftLock: SHIFT_LOCK_TIME,
      _pendingEvent: isDown ? { type: 'downshiftBlip' } : { type: 'shift', dir: 'up' },
    });
  },
  shiftUp() {
    const s = get();
    if (s.gearMode === 'D' && s.gearPos < 7) {
      vibrate(14);
      set({
        gearPos: s.gearPos + 1,
        shiftLock: SHIFT_LOCK_TIME,
        _pendingEvent: { type: 'shift', dir: 'up' },
      });
    }
  },
  shiftDown() {
    const s = get();
    if (s.gearMode === 'D' && s.gearPos > 1) {
      vibrate([12, 20, 12]);
      const nextGear = s.gearPos - 1;
      let nextRpm = s.rpm;
      const moving = Math.abs(s.speed) > 8 && s.running;
      if (moving) {
        const nextRatio = GEAR_RATIOS[nextGear - 1];
        const targetRpm =
          (Math.abs(s.speed) / 3.6 / WHEEL_RADIUS) *
          (60 / (2 * Math.PI)) *
          (nextRatio * FINAL_DRIVE);
        nextRpm = Math.min(LIMIT_RPM - 250, Math.max(s.rpm, targetRpm * 0.94));
      }
      set({
        gearPos: nextGear,
        rpm: nextRpm,
        shiftLock: SHIFT_LOCK_TIME * 0.85,
        _pendingEvent: moving ? { type: 'downshiftBlip' } : { type: 'shift', dir: 'down' },
      });
    }
  },
  setThrottle(v) {
    set({ throttle: c01(v) });
  },
  setBrake(v) {
    set({ brake: c01(v) });
  },
  setView(v) {
    set({ view: v });
  },
  toggleXray() {
    vibrate(10);
    set((s) => ({ xray: !s.xray }));
  },
  setEcuMode(m) {
    vibrate(12);
    set({ ecuMode: m });
  },
  cycleEcuMode() {
    const order = ['COMFORT', 'SPORT', 'TRACK'];
    const cur = get().ecuMode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    vibrate(12);
    set({ ecuMode: next });
  },
  toggleAutoShift() {
    vibrate(10);
    set((s) => ({ autoShift: !s.autoShift }));
  },
  toggleMute() {
    set((s) => ({ muted: !s.muted }));
  },
}));
