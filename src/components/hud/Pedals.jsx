import { useRef } from 'react';
import { useEngineStore } from '../../store/engineStore.js';
import { useLiveNode, useLiveStylePart } from '../../hooks/useLiveNode.js';

const c01 = (v) => Math.min(1, Math.max(0, v));

function Pedal({ id, label, ko, from, to }) {
  const pressed = useRef(false);

  const valueSel = id === 'accel' ? (s) => s.throttle : (s) => s.brake;
  const setter = id === 'accel' ? (v) => useEngineStore.getState().setThrottle(v) : (v) => useEngineStore.getState().setBrake(v);

  const fillRef = useLiveStylePart(valueSel, (v) => ({ height: `${(v * 100).toFixed(1)}%` }));
  const pctRef = useLiveNode((el, s) => {
    const v = valueSel(s);
    el.textContent = String(Math.round(v * 100));
    el.style.color = v > 0.02 ? from : '#475569';
  });

  const applyFromPointer = (e) => {
    if (!pressed.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setter(c01(1 - (e.clientY - r.top) / r.height));
  };

  return (
    <div className="flex select-none flex-col items-center gap-1">
      <div
        className="relative h-[128px] w-[84px] cursor-pointer touch-none overflow-hidden rounded-2xl border border-white/10 bg-black/40"
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
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
        {/* tick marks */}
        {[0, 25, 50, 75, 100].map((t) => (
          <div key={t} className="absolute left-1.5 h-px w-2 bg-white/15" style={{ bottom: `${t}%` }} />
        ))}
        {/* fill */}
        <div
          ref={fillRef}
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '0%',
            background: `linear-gradient(180deg, ${to}, ${from})`,
            boxShadow: `0 0 18px -2px ${from}`,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-[8px] font-semibold tracking-[0.2em] text-slate-400">
          {label}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-baseline justify-center gap-0.5">
          <span ref={pctRef} className="font-mono text-xl font-bold tabular-nums text-slate-600">
            0
          </span>
          <span className="text-[9px] text-slate-500">%</span>
        </div>
      </div>
      <div className="text-[9px] tracking-wider text-slate-500">{ko}</div>
    </div>
  );
}

/** Interactive accelerator & brake pedals (pointer, touch, keyboard). */
export default function Pedals() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-3">
      <div className="text-[9px] tracking-[0.25em] text-slate-500">PEDALS · 페달</div>
      <div className="flex items-end gap-3">
        <Pedal id="brake" label="BRAKE" ko="브레이크" from="#f87171" to="#7f1d1d" />
        <Pedal id="accel" label="THROTTLE" ko="가속" from="#34d399" to="#0e7490" />
      </div>
      <div className="text-[8px] tracking-wider text-slate-600">HOLD / DRAG · ↑ ↓</div>
    </div>
  );
}
