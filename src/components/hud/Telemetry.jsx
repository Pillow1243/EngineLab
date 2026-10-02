import { useLiveNode } from '../../hooks/useLiveNode.js';
import { useEngineStore } from '../../store/engineStore.js';
import { engineTorque, enginePowerHP } from '../../sim/simulation.js';
import { GEAR_RATIOS, REVERSE_RATIO, FINAL_DRIVE } from '../../sim/constants.js';

function Row({ k, children }) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      <span className="text-[7px] sm:text-[8px] tracking-[0.16em] text-slate-500">{k}</span>
      {children}
    </div>
  );
}

/** Compact live telemetry column (Power HP, Torque Nm, EGT °C, Ratio, Traction). */
export default function Telemetry() {
  const gearMode = useEngineStore((s) => s.gearMode);
  const gearPos = useEngineStore((s) => s.gearPos);

  const ratio = gearMode === 'D' ? GEAR_RATIOS[gearPos - 1] : gearMode === 'R' ? REVERSE_RATIO : 0;

  const powerRef = useLiveNode((el, s) => {
    const hp = s.rpm > 25 ? enginePowerHP(s.rpm, s.throttle, s.boost) : 0;
    el.textContent = `${Math.round(hp)} HP`;
  });

  const torqueRef = useLiveNode((el, s) => {
    const t = s.rpm > 25 ? engineTorque(s.rpm, s.throttle, s.boost) : 0;
    el.textContent = `${Math.round(t)} Nm`;
  });

  const egtRef = useLiveNode((el, s) => {
    const egt = Math.round(s.egt ?? 320);
    el.textContent = `${egt} °C`;
    el.style.color = egt > 820 ? '#fb923c' : '#e2e8f0';
  });

  const gripRef = useLiveNode((el, s) => {
    if (s.launchActive) {
      el.textContent = '2-STEP LC';
      el.style.color = '#fb923c';
      return;
    }
    const spin = Math.abs(s.speed) < 35 && s.throttle > 0.65 && s.rpm > 3400 && s.gearMode === 'D' && s.gearPos === 1;
    el.textContent = spin ? 'WHEELSPIN' : 'GRIP';
    el.style.color = spin ? '#fbbf24' : '#34d399';
  });

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 sm:gap-1.5 px-3 py-1.5">
      <div className="mb-0.5 text-[8px] sm:text-[9px] tracking-[0.22em] text-slate-500">TELEMETRY</div>
      <Row k="POWER">
        <span ref={powerRef} className="font-mono text-[10px] sm:text-[11px] font-bold text-cyan-300 tabular-nums">
          0 HP
        </span>
      </Row>
      <Row k="TORQUE">
        <span ref={torqueRef} className="font-mono text-[10px] sm:text-[11px] font-semibold text-slate-200 tabular-nums">
          0 Nm
        </span>
      </Row>
      <Row k="EXH TEMP">
        <span ref={egtRef} className="font-mono text-[10px] sm:text-[11px] font-semibold text-slate-200 tabular-nums">
          320 °C
        </span>
      </Row>
      <Row k="RATIO">
        <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-slate-200 tabular-nums">
          {ratio > 0 ? (ratio * FINAL_DRIVE).toFixed(2) : '—'}
        </span>
      </Row>
      <Row k="TRACTION">
        <span ref={gripRef} className="font-mono text-[9px] sm:text-[10px] font-bold tracking-wider text-emerald-400">
          GRIP
        </span>
      </Row>
    </div>
  );
}
