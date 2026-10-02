import { useEngineStore } from '../../store/engineStore.js';
import { useLiveNode } from '../../hooks/useLiveNode.js';
import { getMode, enginePowerHP, engineTorque } from '../../sim/simulation.js';
import { ECU_MODES, ASPIRATIONS } from '../../sim/constants.js';

/**
 * Engine identity + Quick Forced-Induction Switcher (NA / 1x Turbo / 2x Bi-Turbo / Supercharger)
 * + Interactive ECU Map Selector (Comfort / Sport / Track+).
 */
export default function InfoPanel() {
  const ecuMode = useEngineStore((s) => s.ecuMode);
  const aspiration = useEngineStore((s) => s.aspiration);
  const setEcuMode = useEngineStore((s) => s.setEcuMode);
  const setAspiration = useEngineStore((s) => s.setAspiration);
  const toggleTuningOpen = useEngineStore((s) => s.toggleTuningOpen);

  const modeRef = useLiveNode((el, s) => {
    const m = getMode(s);
    el.textContent = m.label;
    el.style.color = m.color;
    el.style.boxShadow = `0 0 14px -4px ${m.color}`;
  });

  const mobilePerfRef = useLiveNode((el, s) => {
    const tq = s.rpm > 25 ? Math.round(engineTorque(s.rpm, s.throttle, s.boost, s)) : 0;
    const hp = s.rpm > 25 ? Math.round(enginePowerHP(s.rpm, s.throttle, s.boost, s)) : 0;
    el.textContent = `${hp} HP · ${tq} Nm`;
  });

  const aspButtons = [
    { id: 'NA', label: 'NA (ITB)' },
    { id: 'SINGLE_TURBO', label: '1x TURBO' },
    { id: 'TWIN_TURBO', label: '2x TURBO' },
    { id: 'SUPERCHARGER', label: 'SUPERCHG' },
  ];

  return (
    <div className="flex h-full w-full flex-col justify-between px-2.5 py-1.5 sm:px-3.5 sm:py-2">
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={toggleTuningOpen}
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider text-amber-200 hover:bg-amber-400/20 active:scale-95"
        >
          <span>⚙ UPGRADE PARTS · ارتقا</span>
        </button>

        <span
          ref={modeRef}
          className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold tracking-widest text-slate-400 ring-1 ring-white/10"
        >
          STOPPED
        </span>
      </div>

      {/* Quick Forced Induction Switcher (NA / Single Turbo / Twin-Turbo / Supercharger) */}
      <div>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[7px] sm:text-[8px] tracking-[0.18em] text-slate-500">
            ASPIRATION · توربو / تنفس
          </span>
          <span
            ref={mobilePerfRef}
            className="sm:hidden font-mono text-[8px] font-bold text-cyan-300 tabular-nums"
          >
            0 HP · 0 Nm
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {aspButtons.map((a) => {
            const active = aspiration === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspiration(a.id)}
                aria-pressed={active}
                className={`rounded-md border py-1 text-[7px] sm:text-[8px] font-bold tracking-wider transition-all active:scale-95 ${
                  active
                    ? 'border-cyan-400/60 bg-cyan-400/20 text-cyan-200 shadow-[0_0_10px_-3px_rgba(34,211,238,0.55)]'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]'
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive ECU Drive Map Selector (Comfort / Sport / Track+) */}
      <div>
        <div className="mb-0.5 text-[7px] sm:text-[8px] tracking-[0.18em] text-slate-500">
          ECU MAP · مود رانندگی
        </div>
        <div className="grid grid-cols-3 gap-1">
          {Object.values(ECU_MODES).map((m) => {
            const active = ecuMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setEcuMode(m.id)}
                aria-pressed={active}
                className={`rounded-md border py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-bold tracking-wider transition-all active:scale-95 ${
                  active
                    ? 'border-cyan-400/60 bg-cyan-400/20 text-cyan-200 shadow-[0_0_12px_-3px_rgba(34,211,238,0.55)]'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
