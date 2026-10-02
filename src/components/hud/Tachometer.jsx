import { useEngineStore } from '../../store/engineStore.js';
import { useLiveAttribute, useLiveNode } from '../../hooks/useLiveNode.js';
import { resolveSpecs } from '../../sim/simulation.js';

const CX = 110;
const CY = 116;
const R = 88;
const A0 = 135;
const A1 = 405; // 270° sweep
const MAX = 10000; // 0..10 ×1000 rpm to support Forged I4 9600 RPM redline!

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

const angleOf = (rpm) => A0 + (Math.min(rpm, MAX) / MAX) * (A1 - A0);

/** Circular analog tachometer, 0–10 ×1000 rpm with dynamic engine redline & F1 shift lights. */
export default function Tachometer() {
  const engineType = useEngineStore((s) => s.engineType);
  const internalsUpgrade = useEngineStore((s) => s.internalsUpgrade);
  const { redline } = resolveSpecs({ engineType, internalsUpgrade });

  const needleRef = useLiveAttribute(
    (s) => s.rpm,
    'transform',
    (rpm) => `rotate(${(angleOf(rpm) + 90).toFixed(2)} ${CX} ${CY})`,
  );
  const redRef = useLiveNode((el, s) => {
    const rl = resolveSpecs(s).redline;
    el.style.opacity = s.rpm > rl ? 0.55 + 0.45 * Math.sin(s.rpm * 0.05) : 0.9;
  });
  const rpmTextRef = useLiveNode((el, s) => {
    const rl = resolveSpecs(s).redline;
    el.textContent = String(Math.max(0, Math.round(s.rpm)));
    el.style.color = s.rpm > rl ? '#f87171' : '#e2e8f0';
  });
  // F1-style 8-LED shift light bar scaled to active redline
  const shiftBarRef = useLiveNode((el, s) => {
    const leds = el.children;
    if (!leds) return;
    const rl = resolveSpecs(s).redline;
    const flash = s.rpm > rl + 200 && Math.sin(performance.now() * 0.045) > 0;
    for (let i = 0; i < leds.length; i++) {
      const thresh = rl * (0.48 + (i / (leds.length - 1)) * 0.56);
      const on = s.rpm >= thresh;
      const color = i < 3 ? '#34d399' : i < 6 ? '#fbbf24' : '#ef4444';
      leds[i].style.background = on ? (flash ? '#ffffff' : color) : 'rgba(255,255,255,0.08)';
      leds[i].style.boxShadow = on ? `0 0 8px ${color}` : 'none';
    }
  });

  const ticks = [];
  for (let k = 0; k <= 20; k++) {
    const deg = A0 + k * 13.5;
    const major = k % 2 === 0;
    const [x0, y0] = polar(R, deg);
    const [x1, y1] = polar(R - (major ? 11 : 6), deg);
    ticks.push(
      <line
        key={k}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={major ? '#94a3b8' : '#475569'}
        strokeWidth={major ? 2.4 : 1.2}
        strokeLinecap="round"
      />,
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-between py-1.5 px-1.5 sm:py-2 sm:px-2">
      {/* Shift light LED array */}
      <div ref={shiftBarRef} className="flex w-full max-w-[150px] items-center justify-center gap-1 pt-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full bg-white/10" />
        ))}
      </div>

      <svg viewBox="0 0 220 205" className="min-h-0 flex-1 w-full max-w-[198px]">
        <path d={arc(R, A0, A1)} fill="none" stroke="#1f2937" strokeWidth={6} strokeLinecap="round" />
        {/* dynamic redline zone */}
        <path
          ref={redRef}
          d={arc(R, angleOf(redline), A1)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {ticks}
        {Array.from({ length: 11 }).map((_, k) => {
          const [x, y] = polar(R - 23, A0 + k * 27);
          const isRed = k * 1000 >= redline;
          return (
            <text
              key={k}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isRed ? '#f87171' : '#cbd5e1'}
              fontSize="12"
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
            >
              {k}
            </text>
          );
        })}
        <text x={CX} y={CY - 32} textAnchor="middle" fill="#64748b" fontSize="8" letterSpacing="2">
          RPM ×1000
        </text>

        <g ref={needleRef} style={{ filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.55))' }}>
          <line x1={CX} y1={CY + 15} x2={CX} y2={CY - R + 10} stroke="#f87171" strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r={7} fill="#0b1220" stroke="#64748b" strokeWidth={1.5} />
        <circle cx={CX} cy={CY} r={2.5} fill="#f87171" />
      </svg>

      <div className="-mt-1 flex items-baseline gap-1">
        <span
          ref={rpmTextRef}
          className="font-mono text-lg sm:text-2xl lg:text-[32px] font-bold leading-none tabular-nums text-slate-100"
        >
          0
        </span>
        <span className="text-[8px] sm:text-[10px] tracking-[0.18em] text-slate-500">RPM</span>
      </div>
      <div className="hidden sm:block text-[7px] lg:text-[8px] tracking-[0.26em] text-slate-600">
        REDLINE {redline} · 타코미터
      </div>
    </div>
  );
}
