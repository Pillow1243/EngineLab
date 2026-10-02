import { useLiveNode } from '../../hooks/useLiveNode.js';
import { useEngineStore } from '../../store/engineStore.js';
import { ENGINES } from '../../sim/constants.js';
import { visualAngle } from '../scene/engineGeometry.js';

/**
 * Bottom-left & bottom-right 3D viewport HUD overlay:
 * - Big translucent gear indicator
 * - Live Cylinder Firing Order Sequencer (adapts to 4, 5, 6, or 8 cylinders!)
 * - Live EGT (°C) & Oil temperature pill
 */
export default function GearOverlay() {
  const engineType = useEngineStore((s) => s.engineType);
  const spec = ENGINES[engineType] || ENGINES.I5_29;

  const gearRef = useLiveNode((el, s) => {
    el.textContent = s.gearMode === 'D' ? String(s.gearPos) : s.gearMode;
    el.style.opacity = s.running ? 0.92 : 0.3;
  });
  const labelRef = useLiveNode((el, s) => {
    const autoTxt = s.autoShift ? 'AUTO' : 'MANUAL';
    el.textContent =
      s.gearMode === 'D'
        ? `GEAR ${s.gearPos}/7 · ${autoTxt}`
        : s.gearMode === 'R'
          ? 'REVERSE · 후진'
          : 'NEUTRAL · 중립';
  });
  const tempRef = useLiveNode((el, s) => {
    const egt = Math.round(s.egt ?? 320);
    const oil = Math.round(s.oilTemp ?? 82);
    el.textContent = `EGT ${egt}°C · OIL ${oil}°C`;
    el.style.color = egt > 780 ? '#fb923c' : '#94a3b8';
  });
  const cylDotsRef = useLiveNode((el, s) => {
    const children = el.children;
    const n = children ? children.length : 0;
    if (!n) return;
    const on = s.running && s.rpm > 120;
    const idx = Math.floor(((visualAngle.value / (Math.PI * 2)) * n) % n);
    for (let i = 0; i < n; i++) {
      const active = on && i === idx;
      children[i].style.background = active ? (s.nosActive ? '#38bdf8' : '#fb923c') : 'rgba(255,255,255,0.12)';
      children[i].style.boxShadow = active ? `0 0 8px ${s.nosActive ? '#38bdf8' : '#f97316'}` : 'none';
      children[i].style.color = active ? '#04060a' : '#94a3b8';
    }
  });

  return (
    <>
      <div className="pointer-events-none absolute bottom-2.5 left-3 sm:bottom-4 sm:left-5 z-10 flex items-end gap-2 sm:gap-3">
        <div>
          <div className="mb-0.5 text-[7px] sm:text-[9px] tracking-[0.28em] text-slate-500">
            GEAR · 기어
          </div>
          <div
            ref={gearRef}
            className="text-4xl sm:text-6xl font-black leading-none text-slate-100/90 drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]"
          >
            D
          </div>
        </div>
        <div className="mb-1 flex flex-col gap-0.5">
          <div
            ref={labelRef}
            className="text-[8px] sm:text-[10px] font-semibold tracking-[0.18em] text-cyan-300/85"
          >
            GEAR 1/7 · MANUAL
          </div>
          <div
            ref={tempRef}
            className="font-mono text-[8px] sm:text-[9px] tracking-wider text-slate-400"
          >
            EGT 320°C · OIL 82°C
          </div>
        </div>
      </div>

      {/* Live Firing Order Sequencer (adapts to I4 / I5 / I6 / V8) */}
      <div className="pointer-events-none absolute bottom-2.5 right-3 sm:bottom-4 sm:right-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 backdrop-blur-md">
        <span className="text-[7px] sm:text-[8px] font-semibold tracking-[0.16em] text-slate-400">
          FIRING
        </span>
        <div ref={cylDotsRef} className="flex items-center gap-1">
          {spec.firingOrder.map((cyl, i) => (
            <span
              key={`${cyl}-${i}`}
              className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full font-mono text-[8px] sm:text-[9px] font-bold transition-colors duration-75"
            >
              {cyl}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
