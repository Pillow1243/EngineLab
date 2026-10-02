import { useLiveNode } from '../../hooks/useLiveNode.js';

/** Big translucent gear indicator (bottom-left of the 3D viewport). */
export default function GearOverlay() {
  const gearRef = useLiveNode((el, s) => {
    el.textContent = s.gearMode === 'D' ? String(s.gearPos) : s.gearMode;
    el.style.opacity = s.running ? 0.9 : 0.25;
  });
  const labelRef = useLiveNode((el, s) => {
    el.textContent =
      s.gearMode === 'D' ? `GEAR ${s.gearPos}/7 · DCT` : s.gearMode === 'R' ? 'REVERSE · 후진' : 'NEUTRAL · 공랭';
  });

  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-10 flex items-end gap-3">
      <div>
        <div className="mb-1 text-[9px] tracking-[0.3em] text-slate-500">GEAR · 기어</div>
        <div
          ref={gearRef}
          className="text-6xl font-black leading-none text-slate-100/90 drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]"
        >
          D
        </div>
      </div>
      <div ref={labelRef} className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-cyan-300/80">
        GEAR 1/7 · DCT
      </div>
    </div>
  );
}
