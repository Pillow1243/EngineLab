import { create } from 'zustand';
import {
  GEAR_RATIOS,
  FINAL_DRIVE,
  WHEEL_RADIUS,
  UPGRADES,
} from '../sim/constants.js';
import { resolveSpecs } from '../sim/simulation.js';

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
  wheelspin: false,
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

  /* ---------- Engine Garage & Tuning Workshop state ---------- */
  engineType: 'I5_29', // 'I4_20' | 'I5_29' | 'I6_30' | 'V8_40'
  aspiration: 'SINGLE_TURBO', // 'NA' | 'SINGLE_TURBO' | 'TWIN_TURBO' | 'SUPERCHARGER'
  internalsUpgrade: 'STOCK', // 'STOCK' | 'FORGED'
  exhaustUpgrade: 'SPORT', // 'STOCK' | 'SPORT' | 'TITANIUM'
  transUpgrade: 'STREET', // 'STREET' | 'RACE_DOG'
  tireUpgrade: 'STREET', // 'STREET' | 'SEMI_SLICK' | 'DRAG_SLICK'
  nosInstalled: true,
  nosActive: false,
  tuningOpen: false,

  /* ---------- actions ---------- */
  start() {
    if (get().running) return;
    vibrate([25, 40, 60]);
    set({ running: true, cranking: true, _crankT: 0, audioOn: true });
  },
  stop() {
    vibrate(20);
    set({
      running: false,
      cranking: false,
      throttle: 0,
      brake: 0,
      launchActive: false,
      nosActive: false,
    });
  },
  togglePower() {
    get().running ? get().stop() : get().start();
  },
  setGearMode(m) {
    const s = get();
    if (s.gearMode === m) return;
    vibrate(15);
    const shiftT = (UPGRADES.transmission[s.transUpgrade] || UPGRADES.transmission.STREET).shiftTime;
    const lock = Math.abs(s.speed) > 2 ? shiftT * 0.7 : 0.08;
    set({
      gearMode: m,
      gearPos: 1,
      shiftLock: lock,
      _pendingEvent: { type: 'shift', dir: 'mode' },
    });
  },
  selectGear(i) {
    const s = get();
    if (s.gearMode === 'D' && i === s.gearPos) return;
    vibrate(12);
    const { limitRpm, trans } = resolveSpecs(s);
    const moving = Math.abs(s.speed) > 5 && s.running;
    const isDown = s.gearMode === 'D' && i < s.gearPos && moving;
    let nextRpm = s.rpm;
    if (isDown) {
      const nextRatio = GEAR_RATIOS[i - 1];
      const targetRpm =
        (Math.abs(s.speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (nextRatio * FINAL_DRIVE);
      nextRpm = Math.min(limitRpm - 220, Math.max(s.rpm, targetRpm * 0.94));
    }
    set({
      gearMode: 'D',
      gearPos: i,
      rpm: nextRpm,
      shiftLock: moving ? trans.shiftTime : 0.08,
      _pendingEvent: isDown ? { type: 'downshiftBlip' } : { type: 'shift', dir: 'up' },
    });
  },
  shiftUp() {
    const s = get();
    if (s.gearMode === 'D' && s.gearPos < 7) {
      vibrate(14);
      const { trans } = resolveSpecs(s);
      const moving = Math.abs(s.speed) > 5 && s.running;
      set({
        gearPos: s.gearPos + 1,
        shiftLock: moving ? trans.shiftTime : 0.08,
        _pendingEvent: { type: 'shift', dir: 'up' },
      });
    }
  },
  shiftDown() {
    const s = get();
    if (s.gearMode === 'D' && s.gearPos > 1) {
      vibrate([12, 20, 12]);
      const { limitRpm, trans } = resolveSpecs(s);
      const nextGear = s.gearPos - 1;
      let nextRpm = s.rpm;
      const moving = Math.abs(s.speed) > 6 && s.running;
      if (moving) {
        const nextRatio = GEAR_RATIOS[nextGear - 1];
        const targetRpm =
          (Math.abs(s.speed) / 3.6 / WHEEL_RADIUS) *
          (60 / (2 * Math.PI)) *
          (nextRatio * FINAL_DRIVE);
        nextRpm = Math.min(limitRpm - 220, Math.max(s.rpm, targetRpm * 0.95));
      }
      set({
        gearPos: nextGear,
        rpm: nextRpm,
        shiftLock: moving ? trans.shiftTime * 0.85 : 0.08,
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
  setNosActive(v) {
    set({ nosActive: !!v });
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
  setEngineType(engineType) {
    vibrate([15, 30]);
    set({ engineType, zeroToHundred: null });
  },
  setAspiration(aspiration) {
    vibrate(15);
    set({ aspiration, boost: 0, spool: 0, zeroToHundred: null });
  },
  setInternalsUpgrade(internalsUpgrade) {
    vibrate(12);
    set({ internalsUpgrade, zeroToHundred: null });
  },
  setExhaustUpgrade(exhaustUpgrade) {
    vibrate(12);
    set({ exhaustUpgrade });
  },
  setTransUpgrade(transUpgrade) {
    vibrate(12);
    set({ transUpgrade });
  },
  setTireUpgrade(tireUpgrade) {
    vibrate(12);
    set({ tireUpgrade, zeroToHundred: null });
  },
  toggleTuningOpen() {
    vibrate(10);
    set((s) => ({ tuningOpen: !s.tuningOpen }));
  },
  setTuningOpen(v) {
    set({ tuningOpen: !!v });
  },
}));
