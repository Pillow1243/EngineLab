import { useEngineStore } from '../../store/engineStore.js';

const VIEWS = [
  { id: 'front', ko: '정면', en: 'FRONT' },
  { id: 'side', ko: '측면', en: 'SIDE' },
  { id: 'top', ko: '상단', en: 'TOP' },
  { id: 'detail', ko: '디테일', en: 'DETAIL' },
];

/** Camera preset buttons (top-right of the 3D viewport). */
export default function ViewButtons() {
  const view = useEngineStore((s) => s.view);
  const setView = useEngineStore((s) => s.setView);

  return (
    <div className="absolute right-4 top-4 z-10 flex gap-1.5">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold tracking-wider backdrop-blur-xl transition-all duration-150 active:scale-[0.96] ${
            view === v.id
              ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200 shadow-[0_0_16px_-3px_rgba(34,211,238,0.55)]'
              : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
          }`}
        >
          <span className="mr-1.5 opacity-70">{v.ko}</span>
          {v.en}
        </button>
      ))}
    </div>
  );
}
