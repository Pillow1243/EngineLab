import { useEngineStore } from '../../store/engineStore.js';
import { toggleMuteAudio } from '../../store/actions.js';
import { audioEngine } from '../../audio/AudioEngine.js';
import { ENGINES, ASPIRATIONS } from '../../sim/constants.js';

function Pill({ children, tone = 'slate', onClick, active }) {
  const tones = {
    slate: 'text-slate-300 ring-white/15 bg-black/45',
    cyan: 'text-cyan-200 ring-cyan-400/50 bg-cyan-400/20',
    emerald: 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/15',
    amber: 'text-amber-200 ring-amber-400/50 bg-amber-500/20',
  };
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={`rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold tracking-[0.12em] ring-1 backdrop-blur-md transition-all ${
        tones[tone]
      } ${onClick ? 'pointer-events-auto cursor-pointer hover:brightness-125 active:scale-95' : ''} ${
        active ? 'shadow-[0_0_12px_-2px_rgba(34,211,238,0.55)]' : ''
      }`}
    >
      {children}
    </Tag>
  );
}

/**
 * Top-left 3D viewport overlay:
 * - Shows active Engine + Aspiration title
 * - Quick Engine Switcher (I4 / I5 / I6 / V8)
 * - Prominent "🔧 TUNING / GARAGE" button, X-Ray toggle, and Audio Mute toggle
 */
export default function TopOverlay() {
  const audioOn = useEngineStore((s) => s.audioOn);
  const muted = useEngineStore((s) => s.muted);
  const volume = useEngineStore((s) => s.volume);
  const setVolume = useEngineStore((s) => s.setVolume);
  const xray = useEngineStore((s) => s.xray);
  const engineType = useEngineStore((s) => s.engineType);
  const aspiration = useEngineStore((s) => s.aspiration);
  const toggleXray = useEngineStore((s) => s.toggleXray);
  const toggleTuningOpen = useEngineStore((s) => s.toggleTuningOpen);
  const setEngineType = useEngineStore((s) => s.setEngineType);

  const eng = ENGINES[engineType] || ENGINES.I5_29;
  const asp = ASPIRATIONS[aspiration] || ASPIRATIONS.SINGLE_TURBO;

  return (
    <div className="hud-safe-tl pointer-events-none absolute z-10 max-w-[65%] sm:max-w-none">
      <div className="text-[7px] sm:text-[9px] font-semibold tracking-[0.26em] text-cyan-400/90">
        ENGINE LAB · POWERTRAIN & DYNO SIMULATOR
      </div>
      <h1 className="mt-0.5 text-xs sm:text-xl font-bold tracking-wide text-slate-100 leading-tight">
        {eng.name}{' '}
        <span className="text-[10px] sm:text-sm font-semibold text-cyan-300/90">
          · {asp.short}
        </span>
      </h1>

      {/* Quick Engine Swap Bar + Garage Button */}
      <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
        <Pill onClick={toggleTuningOpen} tone="amber" active>
          🔧 TUNING / GARAGE · تیونینگ
        </Pill>
        {Object.values(ENGINES).map((e) => (
          <Pill
            key={e.id}
            onClick={() => setEngineType(e.id)}
            tone={engineType === e.id ? 'cyan' : 'slate'}
            active={engineType === e.id}
          >
            {e.short}
          </Pill>
        ))}
        <Pill onClick={toggleXray} tone={xray ? 'cyan' : 'slate'} active={xray}>
          {xray ? '◉ X-RAY' : '○ X-RAY'}
        </Pill>
        <Pill
          onClick={toggleMuteAudio}
          tone={muted ? 'amber' : audioOn ? 'emerald' : 'slate'}
          active={!muted && audioOn}
        >
          {muted ? '✕ MUTED' : audioOn ? '● AUDIO' : '○ SOUND'}
        </Pill>
      </div>

      <div className="pointer-events-auto mt-1.5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-md">
        <button
          type="button"
          onClick={toggleMuteAudio}
          aria-label={muted ? 'Unmute engine sound' : 'Mute engine sound'}
          aria-pressed={muted}
          className="rounded-full text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" />}
          </svg>
        </button>
        <span className="text-[7px] font-bold tracking-[0.18em] text-slate-400">SOUND</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(volume * 100)}
          aria-label="Engine sound volume"
          className="volume-range w-[72px] sm:w-[88px]"
          onChange={(event) => {
            const next = Number(event.target.value) / 100;
            setVolume(next);
            audioEngine.setVolume(next);
          }}
        />
        <span className="w-7 text-right font-mono text-[8px] tabular-nums text-slate-300">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
