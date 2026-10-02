import { useRef } from 'react';
import { useEngineStore } from '../../store/engineStore.js';
import { useLiveNode, useLiveStylePart } from '../../hooks/useLiveNode.js';
import { audioEngine } from '../../audio/AudioEngine.js';

const c01 = (v) => Math.min(1, Math.max(0, v));

function Pedal({ id, label, ko, from, to }) {
  const pressed = useRef(false);

  const valueSel = id === 'accel' ? (s) => s.throttle : (s) => s.brake;
  const setter =
    id === 'accel'
      ? (v) => useEngineStore.getState().setThrottle(v)
      : (v) => useEngineStore.getState().setBrake(v);

  const fillRef = useLiveStylePart(valueSel, (v) => ({ height: `${(v * 100).toFixed(1)}%` }));
  const pctRef = useLiveNode((el, s) => {
    const v = valueSel(s);
    const percent = Math.round(v * 100);
    el.textContent = String(percent);
    el.setAttribute('aria-valuenow', String(percent));
    el.setAttribute('aria-valuetext', `${percent}%`);
    el.style.color = v > 0.02 ? from : '#64748b';
  });

  const applyFromPointer = (e) => {
    if (!pressed.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const raw = 1 - (e.clientY - r.top) / Math.max(1, r.height);
    setter(c01(raw * 1.12));
  };

  const handlePedalKeyDown = (e) => {
    const current = valueSel(useEngineStore.getState());
    const step = e.shiftKey ? 0.2 : 0.05;
    let next;
    if (e.code === 'ArrowUp' || e.code === 'ArrowRight') next = current + step;
    else if (e.code === 'ArrowDown' || e.code === 'ArrowLeft') next = current - step;
    else if (e.code === 'Home') next = 0;
    else if (e.code === 'End') next = 1;
    else return;
    e.preventDefault();
    setter(c01(next));
  };

  return (
    <div className="flex flex-1 h-full max-w-[92px] select-none flex-col items-center justify-center gap-0.5">
      <div
        className="relative w-full flex-1 min-h-[70px] max-h-[126px] cursor-pointer touch-none overflow-hidden rounded-xl sm:rounded-2xl border border-white/15 bg-black/50 shadow-inner"
        onPointerDown={(e) => {
          e.preventDefault();
          audioEngine.ensure();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          pressed.current = true;
          applyFromPointer(e);
        }}
        onPointerMove={applyFromPointer}
        onPointerUp={() => {
          pressed.current = false;
          setter(0);
        }}
        onPointerCancel={() => {
          pressed.current = false;
          setter(0);
        }}
        onContextMenu={(e) => e.preventDefault()}
        role="slider"
        tabIndex={0}
        aria-label={`${label} pedal`}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-valuetext="0%"
        onKeyDown={handlePedalKeyDown}
      >
        {[20, 40, 60, 80].map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute inset-x-3 h-[2px] rounded bg-white/[0.06]"
            style={{ bottom: `${t}%` }}
          />
        ))}
        {[0, 25, 50, 75, 100].map((t) => (
          <div key={t} className="absolute left-1.5 h-px w-2 bg-white/20" style={{ bottom: `${t}%` }} />
        ))}
        <div
          ref={fillRef}
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{
            height: '0%',
            background: `linear-gradient(180deg, ${to}, ${from})`,
            boxShadow: `0 0 18px -2px ${from}`,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-1.5 text-center text-[7px] sm:text-[8px] font-bold tracking-[0.16em] text-slate-300">
          {label}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex items-baseline justify-center gap-0.5">
          <span ref={pctRef} className="font-mono text-base sm:text-xl font-bold tabular-nums text-slate-500">
            0
          </span>
          <span className="text-[8px] sm:text-[9px] text-slate-400">%</span>
        </div>
      </div>
      <div className="hidden sm:block text-[8px] tracking-wider text-slate-500">{ko}</div>
    </div>
  );
}

/** Interactive multi-touch Brake, Throttle & N₂O Nitrous Purge/Shot controls. */
export default function Pedals() {
  const nosActive = useEngineStore((s) => s.nosActive);
  const nosInstalled = useEngineStore((s) => s.nosInstalled);
  const setNosActive = useEngineStore((s) => s.setNosActive);

  return (
    <div className="flex h-full w-full flex-col items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="flex w-full items-center justify-between">
        <span className="text-[7px] sm:text-[8px] tracking-[0.18em] text-slate-500">
          PEDALS · HOLD BOTH = LAUNCH
        </span>
        {/* N₂O Nitrous Oxide Hold Button */}
        <button
          type="button"
          title={nosInstalled ? 'Hold throttle and N₂O together. This button never changes throttle.' : 'Install the N₂O kit in the garage to use this control.'}
          aria-label={nosInstalled ? 'Hold to activate nitrous oxide while applying throttle' : 'Nitrous oxide kit is not installed'}
          aria-pressed={nosInstalled && nosActive}
          disabled={!nosInstalled}
          onPointerDown={(e) => {
            e.preventDefault();
            audioEngine.ensure();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* ignore unsupported pointer capture */
            }
            setNosActive(true);
          }}
          onPointerUp={() => setNosActive(false)}
          onPointerCancel={() => setNosActive(false)}
          onLostPointerCapture={() => setNosActive(false)}
          onKeyDown={(e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
              e.preventDefault();
              audioEngine.ensure();
              setNosActive(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.code === 'Space' || e.code === 'Enter') setNosActive(false);
          }}
          onBlur={() => setNosActive(false)}
          className={`rounded-md border px-2 py-0.5 font-mono text-[8px] sm:text-[9px] font-extrabold tracking-wider transition-all ${
            nosInstalled && nosActive
              ? 'border-cyan-300 bg-cyan-400/30 text-white shadow-[0_0_16px_rgba(56,189,248,0.85)] scale-95'
              : nosInstalled
                ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
                : 'cursor-not-allowed border-white/10 bg-white/[0.02] text-slate-600'
          }`}
        >
          {nosInstalled ? '⚡ N₂O SHOT' : 'N₂O OFF'}
        </button>
      </div>

      <div className="flex w-full flex-1 min-h-0 items-stretch justify-center gap-2 sm:gap-3 py-0.5">
        <Pedal id="brake" label="BRAKE" ko="브레이크" from="#f87171" to="#7f1d1d" />
        <Pedal id="accel" label="THROTTLE" ko="가속" from="#34d399" to="#0e7490" />
      </div>
      <div className="hidden lg:block text-[7px] tracking-wider text-slate-600">
        DRAG PEDALS · ↑/W GAS · ↓/S BRAKE · SHIFT N₂O
      </div>
    </div>
  );
}
