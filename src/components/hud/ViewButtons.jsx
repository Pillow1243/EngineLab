import { useEngineStore } from '../../store/engineStore.js';

const VIEWS = [
  { id: 'front', ko: '정면', en: 'FRONT' },
  { id: 'side', ko: '측면', en: 'SIDE' },
  { id: 'top', ko: '상단', en: 'TOP' },
  { id: 'detail', ko: '디테일', en: 'DETAIL' },
  { id: 'turbo', ko: '터보', en: 'TURBO' },
];

/** Camera preset buttons (top-right of the 3D viewport, responsive on mobile). */
export default function ViewButtons() {
  const view = useEngineStore((s) => s.view);
  const setView = useEngineStore((s) => s.setView);

  return (
    <div className="absolute right-2.5 top-2.5 sm:right-4 sm:top-3.5 z-10 flex flex-wrap justify-end gap-1 sm:gap-1.5 max-w-[46%] sm:max-w-none">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          className={`rounded-lg border px-2 py-1 sm:px-3 sm:py-1.5 text-[8px] sm:text-[10px] font-semibold tracking-wider backdrop-blur-xl transition-all duration-150 active:scale-[0.95] ${
            view === v.id
              ? 'border-cyan-400/50 bg-cyan-400/20 text-cyan-200 shadow-[0_0_16px_-3px_rgba(34,211,238,0.55)]'
              : 'border-white/10 bg-black/45 text-slate-300 hover:bg-white/[0.08] hover:text-slate-100'
          }`}
        >
          <span className="hidden md:inline mr-1.5 opacity-70">{v.ko}</span>
          {v.en}
        </button>
      ))}
    </div>
  );
}
