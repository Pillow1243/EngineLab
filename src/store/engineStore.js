import { create } from 'zustand';
import { SHIFT_LOCK_TIME } from '../sim/constants.js';

const c01 = (v) => Math.min(1, Math.max(0, v));

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
  limiterHit: false,
  _crankT: 0,
  _prevThrottle: 0,

  /* ---------- discrete fields (drive React re-renders) ---------- */
  gearMode: 'D', // 'R' | 'N' | 'D'
  gearPos: 1, // 1..7
  view: 'front', // camera preset
  audioOn: false,

  /* ---------- actions ---------- */
  start() {
    if (get().running) return;
    set({ running: true, cranking: true, _crankT: 0, audioOn: true });
  },
  stop() {
    set({ running: false, cranking: false, throttle: 0, brake: 0 });
  },
  togglePower() {
    get().running ? get().stop() : get().start();
  },
  setGearMode(m) {
    if (get().gearMode === m) return;
    set({ gearMode: m, gearPos: 1, shiftLock: SHIFT_LOCK_TIME * 0.7 });
  },
  selectGear(i) {
    const s = get();
    if (s.gearMode === 'D' && i === s.gearPos) return;
    set({ gearMode: 'D', gearPos: i, shiftLock: SHIFT_LOCK_TIME });
  },
  shiftUp() {
    const s = get();
    if (s.gearMode === 'D' && s.gearPos < 7) {
      set({ gearPos: s.gearPos + 1, shiftLock: SHIFT_LOCK_TIME });
    }
  },
  shiftDown() {
    const s = get();
    if (s.gearMode === 'D' && s.gearPos > 1) {
      set({ gearPos: s.gearPos - 1, shiftLock: SHIFT_LOCK_TIME });
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
}));
