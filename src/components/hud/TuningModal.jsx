import { useEffect, useMemo, useRef } from 'react';
import { useEngineStore } from '../../store/engineStore.js';
import { ENGINES, ASPIRATIONS, UPGRADES, BUILD_PRESETS } from '../../sim/constants.js';
import { resolveSpecs, engineTorque, enginePowerHP } from '../../sim/simulation.js';

function OptionCard({ active, onClick, title, sub, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
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
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.focus();
    const keepFocusInside = (event) => {
      if (event.key !== 'Tab' || !dialog) return;
      const items = dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog?.addEventListener('keydown', keepFocusInside);
    return () => {
      dialog?.removeEventListener('keydown', keepFocusInside);
      previousFocus?.focus?.();
    };
  }, [open]);
  const engineType = useEngineStore((s) => s.engineType);
  const aspiration = useEngineStore((s) => s.aspiration);
  const internalsUpgrade = useEngineStore((s) => s.internalsUpgrade);
  const exhaustUpgrade = useEngineStore((s) => s.exhaustUpgrade);
  const transUpgrade = useEngineStore((s) => s.transUpgrade);
  const tireUpgrade = useEngineStore((s) => s.tireUpgrade);
  const ecuMode = useEngineStore((s) => s.ecuMode);
  const autoShift = useEngineStore((s) => s.autoShift);
  const nosInstalled = useEngineStore((s) => s.nosInstalled);
  const setEngineType = useEngineStore((s) => s.setEngineType);
  const setAspiration = useEngineStore((s) => s.setAspiration);
  const setInternalsUpgrade = useEngineStore((s) => s.setInternalsUpgrade);
  const setExhaustUpgrade = useEngineStore((s) => s.setExhaustUpgrade);
  const setTransUpgrade = useEngineStore((s) => s.setTransUpgrade);
  const setTireUpgrade = useEngineStore((s) => s.setTireUpgrade);
  const setNosInstalled = useEngineStore((s) => s.setNosInstalled);
  const applyBuildPreset = useEngineStore((s) => s.applyBuildPreset);

  const config = useMemo(
    () => ({
      engineType,
      aspiration,
      internalsUpgrade,
      exhaustUpgrade,
      transUpgrade,
      tireUpgrade,
      ecuMode,
      autoShift,
      nosInstalled,
    }),
    [engineType, aspiration, internalsUpgrade, exhaustUpgrade, transUpgrade, tireUpgrade, ecuMode, autoShift, nosInstalled],
  );
  const specs = resolveSpecs(config);
  const { limitRpm, redline, maxBoost } = specs;
  const dyno = useMemo(() => {
    const ptsTq = [];
    const ptsHp = [];
    let peakHp = 0;
    let peakTq = 0;
    for (let r = 1000; r <= limitRpm; r += 250) {
      const tq = engineTorque(r, 1, maxBoost, config);
      const hp = enginePowerHP(r, 1, maxBoost, config);
      peakTq = Math.max(peakTq, tq);
      peakHp = Math.max(peakHp, hp);
      const x = 24 + ((r - 1000) / (limitRpm - 1000)) * 232;
      const yTq = 86 - Math.min(76, (tq / 1400) * 76);
      const yHp = 86 - Math.min(76, (hp / 1400) * 76);
      ptsTq.push(`${x.toFixed(1)},${yTq.toFixed(1)}`);
      ptsHp.push(`${x.toFixed(1)},${yHp.toFixed(1)}`);
    }
    return { ptsTq: ptsTq.join(' '), ptsHp: ptsHp.join(' '), peakHp, peakTq };
  }, [config, limitRpm, maxBoost]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 backdrop-blur-md sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="garage-title"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#070b12]/95 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-400">
              GARAGE & DYNO TUNING WORKSHOP · کارگاه تیونینگ و تعویض موتور
            </div>
            <h2 id="garage-title" className="text-sm sm:text-lg font-extrabold tracking-wide text-slate-100">
              {specs.eng.name} · {specs.asp.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-3.5 py-1.5 text-xs font-bold tracking-wider text-cyan-200 hover:bg-cyan-400/25 active:scale-95"
          >
            DONE · بستن ✕
          </button>
        </div>

        {/* Scrollable Workshop Body */}
        <div
          tabIndex={0}
          aria-label="Tuning workshop settings"
          className="flex-1 space-y-4 overflow-y-auto p-3.5 sm:p-6"
        >
          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3" aria-label="One-click build presets">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[9px] font-bold tracking-[0.22em] text-slate-300">QUICK BUILDS</div>
              <div className="text-[8px] text-slate-500">Your setup is saved on this device</div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BUILD_PRESETS.map((preset) => {
                const active = Object.entries(preset.config).every(([key, value]) => config[key] === value);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyBuildPreset(preset.id)}
                    aria-pressed={active}
                    className={`rounded-lg border p-2 text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      active
                        ? 'border-cyan-400/55 bg-cyan-400/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={`block text-[9px] font-extrabold tracking-wide ${active ? 'text-cyan-200' : 'text-slate-200'}`}>
                      {preset.name}
                    </span>
                    <span className="mt-0.5 block text-[8px] leading-snug text-slate-500">{preset.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </section>

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
                    {Math.round(dyno.peakHp)} <span className="text-xs font-normal text-slate-400">HP</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">PEAK TORQUE</div>
                  <div className="font-mono text-2xl font-black text-amber-300">
                    {Math.round(dyno.peakTq)} <span className="text-xs font-normal text-slate-400">Nm</span>
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
                <polyline fill="none" stroke="#fbbf24" strokeWidth="2.2" points={dyno.ptsTq} />
                <polyline fill="none" stroke="#22d3ee" strokeWidth="2.4" points={dyno.ptsHp} />
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
                  active={engineType === e.id}
                  onClick={() => setEngineType(e.id)}
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
                  active={aspiration === a.id}
                  onClick={() => setAspiration(a.id)}
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
                    active={internalsUpgrade === u.id}
                    onClick={() => setInternalsUpgrade(u.id)}
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
                    active={exhaustUpgrade === u.id}
                    onClick={() => setExhaustUpgrade(u.id)}
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
                    active={transUpgrade === u.id}
                    onClick={() => setTransUpgrade(u.id)}
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
                    active={tireUpgrade === u.id}
                    onClick={() => setTireUpgrade(u.id)}
                    title={u.short}
                    badge={`${u.mu}G`}
                    sub={u.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-bold tracking-[0.22em] text-cyan-400">
              7. N₂O NITROUS SYSTEM · نیتروژن اکسید
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <OptionCard
                active={nosInstalled}
                onClick={() => setNosInstalled(true)}
                title="N₂O KIT INSTALLED"
                badge="+155 Nm"
                sub="Hold the nitrous control together with throttle."
              />
              <OptionCard
                active={!nosInstalled}
                onClick={() => setNosInstalled(false)}
                title="NO N₂O KIT"
                badge="REMOVED"
                sub="Removes the bottle and disables the shot."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
