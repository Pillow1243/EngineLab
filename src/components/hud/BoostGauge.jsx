import { useEngineStore } from '../../store/engineStore.js';
import { useLiveAttribute, useLiveNode, useLiveStylePart, useLiveText } from '../../hooks/useLiveNode.js';
import { ASPIRATIONS } from '../../sim/constants.js';

const CX = 75;
const CY = 78;
const R = 58;
const A0 = 135;
const A1 = 405;
const MAX = 2.0; // Supports Twin-Turbo up to 2.0+ bar!

const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const arc = (r, a0, a1) => {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const angleOf = (b) => A0 + (Math.min(b, MAX) / MAX) * (A1 - A0);

/** Forced-Induction Boost / Spool Gauge (adapts to NA, Single Turbo, Bi-Turbo, Supercharger). */
export default function BoostGauge() {
  const aspiration = useEngineStore((s) => s.aspiration);
  const asp = ASPIRATIONS[aspiration] || ASPIRATIONS.SINGLE_TURBO;

  const needleRef = useLiveAttribute(
    (s) => (s.aspiration === 'NA' ? s.throttle * 1.0 : s.boost),
    'transform',
    (b) => `rotate(${(angleOf(b) + 90).toFixed(2)} ${CX} ${CY})`,
  );
  const barRef = useLiveText(
    (s) => (s.aspiration === 'NA' ? s.throttle * 100 : s.boost),
    (v) => (aspiration === 'NA' ? `${Math.round(v)}%` : v.toFixed(2)),
  );
  const spoolRef = useLiveStylePart(
    (s) => (s.aspiration === 'NA' ? s.throttle : s.spool),
    (sp) => ({ width: `${Math.min(100, (sp / 1.2) * 100).toFixed(1)}%` }),
  );
  const ledRef = useLiveNode((el, s) => {
    const flash = s.bovFlash > 0;
    const glow = 0.25 + 0.75 * Math.min(1, s.boost / 1.4);
    el.style.background = flash ? '#f8fafc' : s.boost > 0.12 ? '#22d3ee' : '#334155';
    el.style.boxShadow = flash
      ? '0 0 12px 3px rgba(248,250,252,0.85)'
      : s.boost > 0.12
        ? `0 0 ${8 * glow}px ${2 * glow}px rgba(34,211,238,0.7)`
        : 'none';
  });
  const bovLabelRef = useLiveNode((el, s) => {
    if (s.bovFlash > 0) {
      el.textContent = s.aspiration === 'TWIN_TURBO' ? '2x BOV + FLUTTER!' : 'BOV VENT!';
      el.style.color = '#f8fafc';
    } else {
      el.textContent = asp.short;
      el.style.color = '#94a3b8';
    }
  });

  return (
    <div className="flex h-full w-full flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-2 py-1.5 sm:px-3.5 sm:py-2">
      <svg viewBox="0 0 150 142" className="min-h-0 w-[74px] sm:w-[96px] lg:w-[114px] shrink-0">
        <path d={arc(R, A0, A1)} fill="none" stroke="#1f2937" strokeWidth={5} strokeLinecap="round" />
        <path d={arc(R, angleOf(1.45), A1)} fill="none" stroke="#ef4444" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        {[0, 0.5, 1.0, 1.5, 2.0].map((v) => {
          const [x0, y0] = polar(R, angleOf(v));
          const [x1, y1] = polar(R - 8, angleOf(v));
          const [tx, ty] = polar(R - 18, angleOf(v));
          return (
            <g key={v}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#94a3b8"
                fontSize="8.5"
                fontFamily="ui-monospace, monospace"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        <g ref={needleRef}>
          <line x1={CX} y1={CY + 10} x2={CX} y2={CY - R + 8} stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r={5} fill="#0b1220" stroke="#475569" strokeWidth={1.2} />
        <text x={CX} y={CY - 24} textAnchor="middle" fill="#64748b" fontSize="7" letterSpacing="1.5">
          {aspiration === 'NA' ? 'ITB' : 'bar'}
        </text>
      </svg>

      <div className="flex w-full min-w-0 flex-1 flex-col items-center sm:items-stretch justify-center gap-0.5 sm:gap-1">
        <div className="hidden sm:block text-[8px] lg:text-[9px] tracking-[0.2em] text-slate-500">
          {aspiration === 'NA' ? 'ITB THROTTLE' : 'BOOST PRESSURE'}
        </div>
        <div className="flex items-baseline gap-1">
          <span ref={barRef} className="font-mono text-base sm:text-xl lg:text-2xl font-bold tabular-nums text-cyan-300">
            0.00
          </span>
          <span className="text-[8px] sm:text-[9px] text-slate-500">
            {aspiration === 'NA' ? 'OPEN' : 'bar'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span ref={ledRef} className="h-2 w-2 shrink-0 rounded-full bg-slate-700" />
          <span ref={bovLabelRef} className="truncate text-[8px] sm:text-[9px] tracking-[0.12em] text-slate-400">
            {asp.short}
          </span>
        </div>
        <div className="w-full mt-0.5 sm:mt-auto">
          <div className="hidden sm:block mb-0.5 text-[7px] lg:text-[8px] tracking-[0.2em] text-slate-600">
            SPOOL · 스풀
          </div>
          <div className="h-1 w-full overflow-hidden rounded bg-white/5">
            <div ref={spoolRef} className="h-full rounded bg-cyan-400/80" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
