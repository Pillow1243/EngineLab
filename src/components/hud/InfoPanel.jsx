import { useLiveNode } from '../../hooks/useLiveNode.js';
import { getMode } from '../../sim/simulation.js';

function Spec({ k, v, sub }) {
  return (
    <div className="min-w-0">
      <div className="text-[8px] tracking-[0.2em] text-slate-600">{k}</div>
      <div className="truncate text-[10px] font-semibold text-slate-200">{v}</div>
      {sub ? <div className="truncate text-[8px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

/** Engine identity + live state badge. */
export default function InfoPanel() {
  const modeRef = useLiveNode((el, s) => {
    const m = getMode(s);
    el.textContent = m.label;
    el.style.color = m.color;
    el.style.boxShadow = `0 0 14px -4px ${m.color}`;
  });

  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-4 py-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />
          <h2 className="text-sm font-bold tracking-[0.2em] text-slate-100">INLINE-5 TURBO</h2>
        </div>
        <p className="ml-4 mt-0.5 text-[10px] text-slate-400">직렬5 터보 · 2.9L</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Spec k="DRIVE" v="7-SPEED DUAL-CLUTCH" sub="7단 더블클러치" />
        <Spec k="MAP" v="BASE IDLE – CRUISE" />
        <Spec k="IDLE" v="880 RPM" />
        <Spec k="REDLINE" v="7000 RPM" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[8px] tracking-[0.25em] text-slate-600">STATE</span>
        <span
          ref={modeRef}
          className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-widest text-slate-500 ring-1 ring-white/10"
        >
          STOPPED
        </span>
      </div>
    </div>
  );
}
