import { useLiveNode, useLiveStylePart } from '../../hooks/useLiveNode.js';
import StartStop from './StartStop.jsx';

/** Speed readout + start/stop button. */
export default function SpeedPanel() {
  const kmhRef = useLiveNode((el, s) => {
    el.textContent = String(Math.round(Math.abs(s.speed)));
  });
  const barRef = useLiveStylePart((s) => Math.abs(s.speed), (v) => ({
    width: `${Math.min(100, v / 3).toFixed(1)}%`,
  }));

  return (
    <div className="flex h-full flex-col items-center justify-between px-4 py-3">
      <div>
        <div className="mb-0.5 text-center text-[9px] tracking-[0.25em] text-slate-500">VEHICLE SPEED</div>
        <div className="flex items-end justify-center gap-1.5">
          <span ref={kmhRef} className="font-mono text-[40px] font-bold leading-none tabular-nums text-slate-100">
            0
          </span>
          <span className="mb-1 text-[10px] text-slate-400">km/h</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div ref={barRef} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: '0%' }} />
        </div>
      </div>
      <StartStop />
    </div>
  );
}
