import { useLiveNode, useLiveText } from '../../hooks/useLiveNode.js';
import { useEngineStore } from '../../store/engineStore.js';
import { engineTorque } from '../../sim/simulation.js';
import { GEAR_RATIOS, REVERSE_RATIO, FINAL_DRIVE, WHEEL_RADIUS } from '../../sim/constants.js';

function Row({ k, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[8px] tracking-[0.18em] text-slate-600">{k}</span>
      {children}
    </div>
  );
}

/** Compact live telemetry column. */
export default function Telemetry() {
  const gearMode = useEngineStore((s) => s.gearMode);
  const gearPos = useEngineStore((s) => s.gearPos);

  const ratio = gearMode === 'D' ? GEAR_RATIOS[gearPos - 1] : gearMode === 'R' ? REVERSE_RATIO : 0;

  const torqueRef = useLiveNode((el, s) => {
    const t = s.rpm > 25 ? engineTorque(s.rpm, s.throttle, s.boost) : 0;
    el.textContent = `${Math.round(t)} Nm`;
  });
  const wheelRef = useLiveText(
    (s) => {
      const r = s.gearMode === 'D' ? GEAR_RATIOS[s.gearPos - 1] : s.gearMode === 'R' ? REVERSE_RATIO : 0;
      return (Math.abs(s.speed) / 3.6 / WHEEL_RADIUS) * (60 / (2 * Math.PI)) * (r * FINAL_DRIVE);
    },
    (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  );
  const gripRef = useLiveNode((el, s) => {
    const spin = Math.abs(s.speed) < 3 && s.throttle > 0.5 && s.rpm > 2500;
    el.textContent = spin ? 'WHEELSPIN' : 'GRIP';
    el.style.color = spin ? '#fbbf24' : '#34d399';
  });

  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-3.5">
      <div className="mb-0.5 text-[9px] tracking-[0.25em] text-slate-500">TELEMETRY</div>
      <Row k="TORQUE">
        <span ref={torqueRef} className="font-mono text-[11px] font-semibold text-slate-200 tabular-nums">
          0 Nm
        </span>
      </Row>
      <Row k="WHEEL">
        <span className="font-mono text-[11px] font-semibold text-slate-200 tabular-nums">
          <span ref={wheelRef}>0</span> <span className="text-slate-500">rpm</span>
        </span>
      </Row>
      <Row k="RATIO">
        <span className="font-mono text-[11px] font-semibold text-slate-200 tabular-nums">
          {ratio > 0 ? (ratio * FINAL_DRIVE).toFixed(2) : '—'}
        </span>
      </Row>
      <Row k="TRACTION">
        <span ref={gripRef} className="font-mono text-[10px] font-bold tracking-wider text-emerald-400">
          GRIP
        </span>
      </Row>
    </div>
  );
}
