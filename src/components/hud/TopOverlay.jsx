import { useEngineStore } from '../../store/engineStore.js';
import { toggleMuteAudio } from '../../store/actions.js';

function Pill({ children, tone = 'slate', onClick, active }) {
  const tones = {
    slate: 'text-slate-400 ring-white/10 bg-black/40',
    cyan: 'text-cyan-200 ring-cyan-400/40 bg-cyan-400/15',
    emerald: 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/15',
    amber: 'text-amber-300 ring-amber-400/40 bg-amber-400/15',
  };
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold tracking-[0.14em] ring-1 backdrop-blur-md transition-all ${
        tones[tone]
      } ${onClick ? 'pointer-events-auto cursor-pointer hover:brightness-125 active:scale-95' : ''} ${
        active ? 'shadow-[0_0_12px_-2px_rgba(34,211,238,0.5)]' : ''
      }`}
    >
      {children}
    </Tag>
  );
}

/** Title block + interactive audio/X-ray status pills (top-left of the 3D viewport). */
export default function TopOverlay() {
  const audioOn = useEngineStore((s) => s.audioOn);
  const muted = useEngineStore((s) => s.muted);
  const running = useEngineStore((s) => s.running);
  const xray = useEngineStore((s) => s.xray);
  const toggleXray = useEngineStore((s) => s.toggleXray);

  return (
    <div className="pointer-events-none absolute left-2.5 top-2.5 sm:left-4 sm:top-3.5 z-10 max-w-[62%] sm:max-w-none">
      <div className="text-[7px] sm:text-[9px] font-semibold tracking-[0.28em] sm:tracking-[0.35em] text-cyan-400/85">
        ENGINE LAB · POWERTRAIN SIMULATOR
      </div>
      <h1 className="mt-0.5 text-sm sm:text-xl font-bold tracking-wide text-slate-100 leading-tight">
        Inline-5 Turbo <span className="text-[10px] sm:text-sm font-medium text-slate-400">직렬5 터보</span>
      </h1>
      <div className="mt-1 sm:mt-1.5 flex flex-wrap gap-1 sm:gap-1.5">
        <Pill>2.9L · 7-DCT</Pill>
        <Pill
          onClick={toggleXray}
          tone={xray ? 'cyan' : 'slate'}
          active={xray}
        >
          {xray ? '◉ X-RAY ON · 투시' : '○ X-RAY · 투시'}
        </Pill>
        <Pill
          onClick={toggleMuteAudio}
          tone={audioOn && !muted ? 'emerald' : 'slate'}
        >
          {muted ? '✕ MUTED' : audioOn ? '● AUDIO LIVE' : '○ AUDIO'}
        </Pill>
        <Pill tone={running ? 'cyan' : 'slate'}>
          {running ? 'ENGINE ON' : 'OFF'}
        </Pill>
      </div>
    </div>
  );
}
