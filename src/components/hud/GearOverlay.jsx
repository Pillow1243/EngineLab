import { useLiveNode } from '../../hooks/useLiveNode.js';
import { visualAngle } from '../scene/engineGeometry.js';

const FIRING_ORDER = [1, 2, 4, 5, 3];

/**
 * Bottom-left & bottom-right 3D viewport HUD overlay:
 * - Big translucent gear indicator
 * - Live 5-cylinder firing pulse visualizer (1-2-4-5-3)
 * - Live EGT (°C) & Oil temperature pill
 */
export default function GearOverlay() {
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
    if (!children || children.length < 5) return;
    const on = s.running && s.rpm > 120;
    // Highlight active firing cylinder along the 1-2-4-5-3 sequence
    const idx = Math.floor(((visualAngle.value / (Math.PI * 2)) * 5) % 5);
    for (let i = 0; i < 5; i++) {
      const active = on && i === idx;
      children[i].style.background = active ? '#fb923c' : 'rgba(255,255,255,0.12)';
      children[i].style.boxShadow = active ? '0 0 8px #f97316' : 'none';
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

      {/* Firing Order 1-2-4-5-3 live pulse strip (bottom-right of 3D view) */}
      <div className="pointer-events-none absolute bottom-2.5 right-3 sm:bottom-4 sm:right-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 backdrop-blur-md">
        <span className="text-[7px] sm:text-[8px] font-semibold tracking-[0.18em] text-slate-400">
          FIRING
        </span>
        <div ref={cylDotsRef} className="flex items-center gap-1">
          {FIRING_ORDER.map((cyl) => (
            <span
              key={cyl}
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
