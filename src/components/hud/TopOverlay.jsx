import { useEngineStore } from '../../store/engineStore.js';

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-400 ring-white/10',
    cyan: 'text-cyan-300 ring-cyan-400/30',
    emerald: 'text-emerald-300 ring-emerald-400/30',
  };
  return (
    <span className={`rounded-full bg-white/[0.04] px-2 py-0.5 text-[8px] font-semibold tracking-[0.15em] ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Title block + status pills (top-left of the 3D viewport). */
export default function TopOverlay() {
  const audioOn = useEngineStore((s) => s.audioOn);
  const running = useEngineStore((s) => s.running);

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10">
      <div className="text-[9px] font-semibold tracking-[0.35em] text-cyan-400/80">
        ENGINE LAB · POWERTRAIN SIMULATOR
      </div>
      <h1 className="mt-0.5 text-xl font-bold tracking-wide text-slate-100">
        Inline-5 Turbo <span className="text-sm font-medium text-slate-500">직렬5 터보</span>
      </h1>
      <div className="mt-1.5 flex gap-1.5">
        <Pill>2.9L · 7-DCT</Pill>
        <Pill>터보차저 1.38 bar</Pill>
        <Pill tone={audioOn ? 'emerald' : 'slate'}>
          {audioOn ? '● AUDIO LIVE' : '○ AUDIO OFF'}
        </Pill>
        <Pill tone={running ? 'cyan' : 'slate'}>{running ? 'ENGINE ON' : 'ENGINE OFF'}</Pill>
      </div>
    </div>
  );
}
