import { useLiveNode, useLiveStylePart } from '../../hooks/useLiveNode.js';
import StartStop from './StartStop.jsx';

/** Speed readout + 0-100 km/h timer + start/stop button. */
export default function SpeedPanel() {
  const kmhRef = useLiveNode((el, s) => {
    el.textContent = String(Math.round(Math.abs(s.speed)));
  });
  const barRef = useLiveStylePart(
    (s) => Math.abs(s.speed),
    (v) => ({
      width: `${Math.min(100, v / 3).toFixed(1)}%`,
    }),
  );
  const runRef = useLiveNode((el, s) => {
    if (s.zeroToHundred) {
      el.textContent = `0-100: ${s.zeroToHundred.toFixed(2)}s`;
      el.style.color = '#34d399';
    } else if (s.launchActive) {
      el.textContent = 'LAUNCH ARMED';
      el.style.color = '#fb923c';
    } else {
      el.textContent = '0-100: READY';
      el.style.color = '#64748b';
    }
  });

  return (
    <div className="flex h-full w-full flex-col items-center justify-between px-2 py-1.5 sm:px-3.5 sm:py-2.5">
      <div className="w-full text-center">
        <div className="text-[7px] sm:text-[9px] tracking-[0.22em] text-slate-500">SPEED</div>
        <div className="flex items-end justify-center gap-1">
          <span
            ref={kmhRef}
            className="font-mono text-2xl sm:text-3xl lg:text-[38px] font-bold leading-none tabular-nums text-slate-100"
          >
            0
          </span>
          <span className="mb-0.5 text-[8px] sm:text-[10px] text-slate-400">km/h</span>
        </div>
        <div className="mt-1 h-1 sm:h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            ref={barRef}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
            style={{ width: '0%' }}
          />
        </div>
        <div
          ref={runRef}
          className="mt-0.5 font-mono text-[7px] sm:text-[8px] font-semibold tracking-wider text-slate-500"
        >
          0-100: READY
        </div>
      </div>
      <StartStop />
    </div>
  );
}
