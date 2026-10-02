import { useEngineStore } from '../../store/engineStore.js';
import { togglePower } from '../../store/actions.js';

/** Prominent engine start / stop button. */
export default function StartStop() {
  const running = useEngineStore((s) => s.running);
  const cranking = useEngineStore((s) => s.cranking);

  const cls = running
    ? 'ring-2 ring-red-500/60 text-red-300 shadow-[0_0_35px_-6px_rgba(239,68,68,0.55)]'
    : cranking
      ? 'ring-2 ring-amber-400/70 text-amber-300 animate-pulse-soft'
      : 'ring-2 ring-emerald-400/60 text-emerald-300 shadow-[0_0_35px_-6px_rgba(16,185,129,0.45)]';

  return (
    <button
      onClick={togglePower}
      className={`flex h-[92px] w-[92px] flex-col items-center justify-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] transition-all duration-150 active:scale-95 ${cls}`}
      aria-label="Engine start/stop"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 3v8" />
        <path d="M6.3 6.5a8 8 0 1 0 11.4 0" />
      </svg>
      <span className="text-[10px] font-bold tracking-[0.18em]">
        {running ? 'STOP' : cranking ? 'CRANK' : 'START'}
      </span>
      <span className="text-[8px] text-slate-500">{running ? '엔진 정지' : '엔진 시동'}</span>
    </button>
  );
}
