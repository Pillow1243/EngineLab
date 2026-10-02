import { useLiveAttribute, useLiveNode, useLiveStylePart, useLiveText } from '../../hooks/useLiveNode.js';

const CX = 75;
const CY = 78;
const R = 58;
const A0 = 135;
const A1 = 405;
const MAX = 1.5;

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

/** Turbo boost dial + spool bar. */
export default function BoostGauge() {
  const needleRef = useLiveAttribute(
    (s) => s.boost,
    'transform',
    (b) => `rotate(${(angleOf(b) + 90).toFixed(2)} ${CX} ${CY})`,
  );
  const barRef = useLiveText((s) => s.boost, (b) => b.toFixed(2));
  const spoolRef = useLiveStylePart((s) => s.spool, (sp) => ({ width: `${Math.min(100, (sp / 1.2) * 100).toFixed(1)}%` }));
  const ledRef = useLiveNode((el, s) => {
    const flash = s.bovFlash > 0;
    const glow = 0.25 + 0.75 * Math.min(1, s.boost / 1.2);
    el.style.background = flash ? '#f8fafc' : s.boost > 0.12 ? '#22d3ee' : '#334155';
    el.style.boxShadow = flash
      ? '0 0 12px 3px rgba(248,250,252,0.8)'
      : s.boost > 0.12
        ? `0 0 ${8 * glow}px ${2 * glow}px rgba(34,211,238,0.7)`
        : 'none';
  });

  return (
    <div className="flex h-full items-center gap-3 px-4">
      <svg viewBox="0 0 150 150" className="w-[118px] shrink-0">
        <path d={arc(R, A0, A1)} fill="none" stroke="#1f2937" strokeWidth={5} strokeLinecap="round" />
        <path d={arc(R, angleOf(1.2), A1)} fill="none" stroke="#ef4444" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        {[0, 0.5, 1.0, 1.5].map((v) => {
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
                fontSize="9"
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
        <text x={CX} y={CY - 24} textAnchor="middle" fill="#475569" fontSize="7" letterSpacing="1.5">
          bar
        </text>
      </svg>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="text-[9px] tracking-[0.25em] text-slate-500">TURBO BOOST</div>
        <div className="flex items-baseline gap-1">
          <span ref={barRef} className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
            0.00
          </span>
          <span className="text-[9px] text-slate-500">bar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span ref={ledRef} className="h-2 w-2 rounded-full bg-slate-700" />
          <span className="text-[9px] tracking-[0.2em] text-slate-400">TURBO · 터보</span>
        </div>
        <div className="mt-auto">
          <div className="mb-0.5 text-[8px] tracking-[0.2em] text-slate-600">SPOOL · 스룰</div>
          <div className="h-1 overflow-hidden rounded bg-white/5">
            <div ref={spoolRef} className="h-full rounded bg-cyan-400/80" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
