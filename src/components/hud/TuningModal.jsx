import { useEngineStore } from '../../store/engineStore.js';
import { ENGINES, ASPIRATIONS, UPGRADES } from '../../sim/constants.js';
import { resolveSpecs, engineTorque, enginePowerHP } from '../../sim/simulation.js';

function OptionCard({ active, onClick, title, sub, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all active:scale-[0.97] ${
        active
          ? 'border-cyan-400/70 bg-cyan-400/15 text-slate-100 shadow-[0_0_18px_-4px_rgba(34,211,238,0.55)]'
          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex w-full items-center justify-between gap-1">
        <span className="text-[11px] sm:text-xs font-bold tracking-wider text-slate-100">{title}</span>
        {badge ? (
          <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[8px] font-bold text-cyan-300">
            {badge}
          </span>
        ) : null}
      </div>
      {sub ? <span className="mt-1 text-[9px] sm:text-[10px] text-slate-400">{sub}</span> : null}
    </button>
  );
}

/**
 * Full-featured Engine Swap & Parts Tuning Garage Modal.
 * Computes live estimated Peak HP, Peak Torque, Redline, and draws an SVG Dyno curve.
 */
export default function TuningModal() {
  const open = useEngineStore((s) => s.tuningOpen);
  const setOpen = useEngineStore((s) => s.setTuningOpen);
  const state = useEngineStore();

  if (!open) return null;

  const specs = resolveSpecs(state);
  const { limitRpm, redline, maxBoost } = specs;

  // Sample dyno curve across RPM range
  const ptsTq = [];
  const ptsHp = [];
  let peakHp = 0;
  let peakTq = 0;
  for (let r = 1000; r <= limitRpm; r += 250) {
    const tq = engineTorque(r, 1, maxBoost, state);
    const hp = enginePowerHP(r, 1, maxBoost, state);
    if (tq > peakTq) peakTq = tq;
    if (hp > peakHp) peakHp = hp;
    const x = 24 + ((r - 1000) / (limitRpm - 1000)) * 232;
    const yTq = 86 - Math.min(76, (tq / 1400) * 76);
    const yHp = 86 - Math.min(76, (hp / 1400) * 76);
    ptsTq.push(`${x.toFixed(1)},${yTq.toFixed(1)}`);
    ptsHp.push(`${x.toFixed(1)},${yHp.toFixed(1)}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-5 backdrop-blur-md">
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#070b12]/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-400">
              GARAGE & DYNO TUNING WORKSHOP · کارگاه تیونینگ و تعویض موتور
            </div>
            <h2 className="text-sm sm:text-lg font-extrabold tracking-wide text-slate-100">
              {specs.eng.name} · {specs.asp.label}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-3.5 py-1.5 text-xs font-bold tracking-wider text-cyan-200 hover:bg-cyan-400/25 active:scale-95"
          >
            DONE · بستن ✕
          </button>
        </div>

        {/* Scrollable Workshop Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-3.5 sm:p-6">
          {/* Top Summary + Live Dyno Graph */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[9px] font-bold tracking-[0.22em] text-slate-400">
                BUILD DYNO ESTIMATE · قدرت نهایی
              </div>
              <div className="my-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-slate-500">PEAK POWER</div>
                  <div className="font-mono text-2xl font-black text-cyan-300">
                    {Math.round(peakHp)} <span className="text-xs font-normal text-slate-400">HP</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">PEAK TORQUE</div>
                  <div className="font-mono text-2xl font-black text-amber-300">
                    {Math.round(peakTq)} <span className="text-xs font-normal text-slate-400">Nm</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-slate-400">
                <span>REDLINE: <strong className="font-mono text-red-400">{redline} RPM</strong></span>
                <span>MAX BOOST: <strong className="font-mono text-cyan-300">{maxBoost.toFixed(2)} bar</strong></span>
              </div>
            </div>

            {/* SVG Dyno Curve */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 md:col-span-2">
              <div className="mb-1 flex items-center justify-between px-1 text-[9px] tracking-wider text-slate-400">
                <span>DYNO CURVE (1000 – {limitRpm} RPM)</span>
                <div className="flex gap-3">
                  <span className="text-cyan-300">━ POWER (HP)</span>
                  <span className="text-amber-400">━ TORQUE (Nm)</span>
                </div>
              </div>
              <svg viewBox="0 0 270 96" className="h-24 w-full">
                {[25, 50, 75].map((y) => (
                  <line key={y} x1="20" y1={y} x2="260" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                <polyline fill="none" stroke="#fbbf24" strokeWidth="2.2" points={ptsTq.join(' ')} />
                <polyline fill="none" stroke="#22d3ee" strokeWidth="2.4" points={ptsHp.join(' ')} />
              </svg>
            </div>
          </div>

          {/* 1. Engine Block Selection */}
          <div>
            <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
              1. ENGINE BLOCK SWAP · انتخاب موتور (تغییر کامل مدل سه‌بعدی و صدا)
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.values(ENGINES).map((e) => (
                <OptionCard
                  key={e.id}
                  active={state.engineType === e.id}
                  onClick={() => state.setEngineType(e.id)}
                  title={e.name}
                  badge={`${e.cylinders} CYL`}
                  sub={`${e.fa} · Firing ${e.firingOrderStr} · ${e.baseTorqueNm} Nm`}
                />
              ))}
            </div>
          </div>

          {/* 2. Forced Induction / Aspiration */}
          <div>
            <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
              2. ASPIRATION & TURBO SYSTEM · سیستم تنفس (بدون توربو / تک توربو / دابل توربو / سوپرشارژر)
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.values(ASPIRATIONS).map((a) => (
                <OptionCard
                  key={a.id}
                  active={state.aspiration === a.id}
                  onClick={() => state.setAspiration(a.id)}
                  title={a.short}
                  badge={a.maxBoost > 0 ? `${a.maxBoost} bar` : 'ITB NA'}
                  sub={a.fa}
                />
              ))}
            </div>
          </div>

          {/* 3. Internals & Exhaust */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
                3. ENGINE INTERNALS · پیستون و شاتون
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(UPGRADES.internals).map((u) => (
                  <OptionCard
                    key={u.id}
                    active={state.internalsUpgrade === u.id}
                    onClick={() => state.setInternalsUpgrade(u.id)}
                    title={u.short}
                    badge={u.rpmBonus > 0 ? `+${u.rpmBonus} RPM` : 'OEM'}
                    sub={u.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
                4. EXHAUST SYSTEM · سیستم اگزوز و بک‌فایر
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(UPGRADES.exhaust).map((u) => (
                  <OptionCard
                    key={u.id}
                    active={state.exhaustUpgrade === u.id}
                    onClick={() => state.setExhaustUpgrade(u.id)}
                    title={u.short}
                    sub={u.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 4. Transmission & Tires */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
                5. TRANSMISSION · گیربکس و سرعت تعویض
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(UPGRADES.transmission).map((u) => (
                  <OptionCard
                    key={u.id}
                    active={state.transUpgrade === u.id}
                    onClick={() => state.setTransUpgrade(u.id)}
                    title={u.short}
                    badge={`${Math.round(u.shiftTime * 1000)}ms`}
                    sub={u.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
                6. TIRES & COMPOUND · تایر و چسبندگی لانچ
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(UPGRADES.tires).map((u) => (
                  <OptionCard
                    key={u.id}
                    active={state.tireUpgrade === u.id}
                    onClick={() => state.setTireUpgrade(u.id)}
                    title={u.short}
                    badge={`${u.mu}G`}
                    sub={u.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
