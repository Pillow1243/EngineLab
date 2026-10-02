import { useEngineStore } from '../../store/engineStore.js';
import { useLiveNode, useLiveStylePart } from '../../hooks/useLiveNode.js';
import { GEAR_RATIOS, FINAL_DRIVE, SHIFT_LOCK_TIME } from '../../sim/constants.js';

/**
 * R/N/D mode selector + 7-gear DCT selector with shift direction
 * buttons and a live shift-lockout progress bar.
 */
export default function GearStrip() {
  const gearMode = useEngineStore((s) => s.gearMode);
  const gearPos = useEngineStore((s) => s.gearPos);
  const setGearMode = useEngineStore((s) => s.setGearMode);
  const selectGear = useEngineStore((s) => s.selectGear);
  const shiftUp = useEngineStore((s) => s.shiftUp);
  const shiftDown = useEngineStore((s) => s.shiftDown);

  const lockBarRef = useLiveStylePart((s) => s.shiftLock, (l) => ({
    width: `${Math.min(100, (l / SHIFT_LOCK_TIME) * 100).toFixed(1)}%`,
    opacity: l > 0 ? 1 : 0,
  }));
  const dctRef = useLiveNode((el, s) => {
    const on = s.shiftLock > 0;
    el.textContent = on ? 'SHIFTING…' : 'READY';
    el.style.color = on ? '#fbbf24' : '#475569';
  });

  const modeBtn = (m) => (
    <button
      key={m}
      onClick={() => setGearMode(m)}
      className={`chip flex h-11 w-11 items-center justify-center text-sm font-black ${
        gearMode === m ? 'chip-active' : ''
      }`}
      aria-label={`Gear mode ${m}`}
    >
      {m}
    </button>
  );

  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-4">
      <div className="flex items-center gap-2">
        {['R', 'N', 'D'].map(modeBtn)}
        <div className="mx-1 h-9 w-px bg-white/10" />

        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {GEAR_RATIOS.map((_, i) => (
            <button
              key={i}
              onClick={() => selectGear(i + 1)}
              className={`chip flex h-11 items-center justify-center font-mono text-sm font-bold transition-all ${
                gearMode === 'D' && gearPos === i + 1
                  ? 'chip-active scale-[1.04]'
                  : gearMode !== 'D'
                    ? 'opacity-30'
                    : ''
              }`}
              aria-label={`Gear ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="mx-1 h-9 w-px bg-white/10" />
        <div className="flex flex-col gap-1">
          <button onClick={shiftUp} className="chip h-[27px] px-3 text-[11px] font-bold" aria-label="Shift up">
            ▲ UP
          </button>
          <button onClick={shiftDown} className="chip h-[27px] px-3 text-[11px] font-bold" aria-label="Shift down">
            ▼ DN
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[8px] tracking-[0.18em] text-slate-600">
          7-DCT · TWIN CLUTCH · 7단 더블클러치
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded bg-white/5">
          <div
            ref={lockBarRef}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: 0, transition: 'opacity 0.2s' }}
          />
        </div>
        <span ref={dctRef} className="w-16 text-right text-[9px] font-bold tracking-widest text-slate-600">
          READY
        </span>
      </div>
    </div>
  );
}
