import { useEngineStore } from '../../store/engineStore.js';
import { useLiveNode, useLiveStylePart } from '../../hooks/useLiveNode.js';
import { GEAR_RATIOS, SHIFT_LOCK_TIME } from '../../sim/constants.js';

/**
 * R/N/D mode selector + AUTO DCT toggle + 7-gear selector with shift paddles
 * and a live shift-lockout progress bar. Fully responsive for Android & desktop.
 */
export default function GearStrip() {
  const gearMode = useEngineStore((s) => s.gearMode);
  const gearPos = useEngineStore((s) => s.gearPos);
  const autoShift = useEngineStore((s) => s.autoShift);
  const setGearMode = useEngineStore((s) => s.setGearMode);
  const selectGear = useEngineStore((s) => s.selectGear);
  const shiftUp = useEngineStore((s) => s.shiftUp);
  const shiftDown = useEngineStore((s) => s.shiftDown);
  const toggleAutoShift = useEngineStore((s) => s.toggleAutoShift);

  const lockBarRef = useLiveStylePart(
    (s) => s.shiftLock,
    (l) => ({
      width: `${Math.min(100, (l / SHIFT_LOCK_TIME) * 100).toFixed(1)}%`,
      opacity: l > 0 ? 1 : 0,
    }),
  );
  const dctRef = useLiveNode((el, s) => {
    const on = s.shiftLock > 0;
    el.textContent = on ? 'SHIFTING…' : s.launchActive ? '2-STEP LC' : 'READY';
    el.style.color = on ? '#fbbf24' : s.launchActive ? '#fb923c' : '#64748b';
  });

  const modeBtn = (m) => (
    <button
      key={m}
      type="button"
      onClick={() => setGearMode(m)}
      aria-pressed={gearMode === m}
      className={`chip flex h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center text-xs sm:text-sm font-black ${
        gearMode === m ? 'chip-active' : ''
      }`}
      aria-label={`Gear mode ${m}`}
    >
      {m}
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className="flex items-center gap-1">{['R', 'N', 'D'].map(modeBtn)}</div>

        <button
          type="button"
          onClick={toggleAutoShift}
          aria-label={autoShift ? 'Disable automatic shifting' : 'Enable automatic shifting'}
          aria-pressed={autoShift}
          className={`chip h-8 sm:h-10 lg:h-11 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-extrabold tracking-wider shrink-0 ${
            autoShift
              ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300 shadow-[0_0_12px_-3px_rgba(52,211,153,0.5)]'
              : 'text-slate-400'
          }`}
          title="Toggle Automatic / Manual DCT Shifting (Key: A)"
        >
          {autoShift ? 'AUTO' : 'MAN'}
        </button>

        <div className="mx-0.5 h-7 sm:h-8 w-px bg-white/10 shrink-0" />

        <div className="grid flex-1 grid-cols-7 gap-1">
          {GEAR_RATIOS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectGear(i + 1)}
              aria-label={`Select gear ${i + 1}`}
              aria-pressed={gearMode === 'D' && gearPos === i + 1}
              className={`chip flex h-8 sm:h-10 lg:h-11 items-center justify-center font-mono text-xs sm:text-sm font-bold transition-all ${
                gearMode === 'D' && gearPos === i + 1
                  ? 'chip-active scale-[1.03]'
                  : gearMode !== 'D'
                    ? 'opacity-35'
                    : ''
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="mx-0.5 h-7 sm:h-8 w-px bg-white/10 shrink-0" />
        <div className="flex sm:flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={shiftDown}
            className="chip h-8 sm:h-[22px] lg:h-[25px] px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-bold"
            aria-label="Shift down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={shiftUp}
            className="chip h-8 sm:h-[22px] lg:h-[25px] px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-bold"
            aria-label="Shift up"
          >
            ▲
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="truncate text-[7px] sm:text-[8px] tracking-[0.16em] text-slate-500">
          7-DCT · 더블클러치 · REV-MATCH
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded bg-white/5">
          <div
            ref={lockBarRef}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: 0, transition: 'opacity 0.2s' }}
          />
        </div>
        <span
          ref={dctRef}
          className="w-16 shrink-0 text-right text-[8px] sm:text-[9px] font-bold tracking-widest text-slate-500"
        >
          READY
        </span>
      </div>
    </div>
  );
}
