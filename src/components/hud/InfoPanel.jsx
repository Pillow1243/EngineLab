import { useEngineStore } from '../../store/engineStore.js';
import { useLiveNode } from '../../hooks/useLiveNode.js';
import { getMode, enginePowerHP, engineTorque } from '../../sim/simulation.js';
import { ECU_MODES } from '../../sim/constants.js';

function Spec({ k, v, sub }) {
  return (
    <div className="min-w-0">
      <div className="text-[7px] sm:text-[8px] tracking-[0.18em] text-slate-600">{k}</div>
      <div className="truncate text-[9px] sm:text-[10px] font-semibold text-slate-200">{v}</div>
      {sub ? <div className="hidden sm:block truncate text-[8px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

/** Engine identity + interactive ECU Drive Mode selector + live state badge. */
export default function InfoPanel() {
  const ecuMode = useEngineStore((s) => s.ecuMode);
  const setEcuMode = useEngineStore((s) => s.setEcuMode);

  const modeRef = useLiveNode((el, s) => {
    const m = getMode(s);
    el.textContent = m.label;
    el.style.color = m.color;
    el.style.boxShadow = `0 0 14px -4px ${m.color}`;
  });

  // Compact live HP/Torque readout visible on mobile portrait inside InfoPanel
  const mobilePerfRef = useLiveNode((el, s) => {
    const tq = s.rpm > 25 ? Math.round(engineTorque(s.rpm, s.throttle, s.boost)) : 0;
    const hp = s.rpm > 25 ? Math.round(enginePowerHP(s.rpm, s.throttle, s.boost)) : 0;
    el.textContent = `${hp} HP · ${tq} Nm`;
  });

  return (
    <div className="flex h-full w-full flex-col justify-between px-2.5 py-2 sm:px-4 sm:py-2.5">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />
            <h2 className="truncate text-[11px] sm:text-sm font-bold tracking-[0.16em] text-slate-100">
              INLINE-5 TURBO
            </h2>
          </div>
          <p className="ml-3.5 text-[8px] sm:text-[10px] text-slate-400">직렬5 터보 · 2.9L DOHC</p>
        </div>

        <span
          ref={modeRef}
          className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold tracking-widest text-slate-400 ring-1 ring-white/10"
        >
          STOPPED
        </span>
      </div>

      {/* Interactive ECU Drive Map Selector (Comfort / Sport / Track+) */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[7px] sm:text-[8px] tracking-[0.2em] text-slate-500">
            ECU MAP · 맵핑
          </span>
          <span
            ref={mobilePerfRef}
            className="sm:hidden font-mono text-[9px] font-bold text-cyan-300 tabular-nums"
          >
            0 HP · 0 Nm
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {Object.values(ECU_MODES).map((m) => {
            const active = ecuMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setEcuMode(m.id)}
                className={`rounded-md border py-1 text-[8px] sm:text-[9px] font-bold tracking-wider transition-all active:scale-95 ${
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

      <div className="hidden sm:grid grid-cols-2 gap-x-3 gap-y-1">
        <Spec k="DRIVE" v="7-SPEED DUAL-CLUTCH" sub="7단 더블클러치" />
        <Spec k="FIRING" v="1 - 2 - 4 - 5 - 3" sub="720° 4-STROKE" />
      </div>
    </div>
  );
}
