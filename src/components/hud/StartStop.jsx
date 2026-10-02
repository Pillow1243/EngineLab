import { useEngineStore } from '../../store/engineStore.js';
import { togglePower } from '../../store/actions.js';

/** Prominent engine start / stop button (responsive across mobile & desktop). */
export default function StartStop() {
  const running = useEngineStore((s) => s.running);
  const cranking = useEngineStore((s) => s.cranking);

  const cls = running
    ? 'ring-2 ring-red-500/60 text-red-300 shadow-[0_0_30px_-5px_rgba(239,68,68,0.55)]'
    : cranking
      ? 'ring-2 ring-amber-400/70 text-amber-300 animate-pulse-soft'
      : 'ring-2 ring-emerald-400/60 text-emerald-300 shadow-[0_0_30px_-5px_rgba(16,185,129,0.45)]';

  return (
    <button
      type="button"
      onClick={togglePower}
      className={`flex h-14 w-14 sm:h-16 sm:w-16 lg:h-[84px] lg:w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] transition-all duration-150 active:scale-95 ${cls}`}
      aria-label={running ? 'Stop engine' : cranking ? 'Engine is cranking' : 'Start engine'}
      aria-pressed={running}
      aria-busy={cranking}
    >
      <svg
        className="h-4 w-4 sm:h-5 sm:w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M12 3v8" />
        <path d="M6.3 6.5a8 8 0 1 0 11.4 0" />
      </svg>
      <span className="text-[8px] sm:text-[10px] font-bold tracking-[0.16em]">
        {running ? 'STOP' : cranking ? 'CRANK' : 'START'}
      </span>
      <span className="hidden lg:block text-[7px] text-slate-500">
        {running ? '엔진 정지' : '엔진 시동'}
      </span>
    </button>
  );
}
