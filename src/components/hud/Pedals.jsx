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
    el.textContent = String(Math.round(v * 100));
    el.style.color = v > 0.02 ? from : '#64748b';
  });

  const applyFromPointer = (e) => {
    if (!pressed.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    // Top 15% of pedal gives 100% full throttle/brake so thumb doesn't have to reach the very edge
    const raw = 1 - (e.clientY - r.top) / Math.max(1, r.height);
    setter(c01(raw * 1.12));
  };

  return (
    <div className="flex flex-1 h-full max-w-[96px] select-none flex-col items-center justify-center gap-0.5">
      <div
        className="relative w-full flex-1 min-h-[72px] max-h-[126px] cursor-pointer touch-none overflow-hidden rounded-xl sm:rounded-2xl border border-white/15 bg-black/50 shadow-inner"
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
        aria-label={`${label} pedal`}
      >
        {/* Metallic pedal grip grooves */}
        {[20, 40, 60, 80].map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute inset-x-3 h-[2px] rounded bg-white/[0.06]"
            style={{ bottom: `${t}%` }}
          />
        ))}
        {/* tick marks */}
        {[0, 25, 50, 75, 100].map((t) => (
          <div key={t} className="absolute left-1.5 h-px w-2 bg-white/20" style={{ bottom: `${t}%` }} />
        ))}
        {/* fill */}
        <div
          ref={fillRef}
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{
            height: '0%',
            background: `linear-gradient(180deg, ${to}, ${from})`,
            boxShadow: `0 0 18px -2px ${from}`,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-1.5 text-center text-[7px] sm:text-[8px] font-bold tracking-[0.18em] text-slate-300">
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

/** Interactive multi-touch accelerator & brake pedals (pointer, touch, keyboard). */
export default function Pedals() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2">
      <div className="text-[7px] sm:text-[9px] tracking-[0.22em] text-slate-500">
        PEDALS · HOLD BOTH = LAUNCH
      </div>
      <div className="flex w-full flex-1 min-h-0 items-stretch justify-center gap-2 sm:gap-3 py-0.5">
        <Pedal id="brake" label="BRAKE" ko="브레이크" from="#f87171" to="#7f1d1d" />
        <Pedal id="accel" label="THROTTLE" ko="가속" from="#34d399" to="#0e7490" />
      </div>
      <div className="hidden lg:block text-[7px] tracking-wider text-slate-600">
        DRAG VERTICAL · ↑/W GAS · ↓/S BRAKE
      </div>
    </div>
  );
}
