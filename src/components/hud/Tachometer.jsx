import { useLiveAttribute, useLiveNode } from '../../hooks/useLiveNode.js';
import { REDLINE } from '../../sim/constants.js';

const CX = 110;
const CY = 116;
const R = 88;
const A0 = 135;
const A1 = 405; // 270° sweep
const MAX = 9000;

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

const SHIFT_THRESHOLDS = [3200, 4200, 5000, 5700, 6300, 6750, 7100, 7500];

/** Circular analog tachometer, 0–9 ×1000 rpm with F1-style shift lights & 7000 rpm redline. */
export default function Tachometer() {
  // needle — direct attribute write, 60fps, zero re-renders
  const needleRef = useLiveAttribute(
    (s) => s.rpm,
    'transform',
    (rpm) => `rotate(${(angleOf(rpm) + 90).toFixed(2)} ${CX} ${CY})`,
  );
  // redline zone flicker above 7000
  const redRef = useLiveNode((el, s) => {
    el.style.opacity = s.rpm > REDLINE ? 0.55 + 0.45 * Math.sin(s.rpm * 0.05) : 0.9;
  });
  const rpmTextRef = useLiveNode((el, s) => {
    el.textContent = String(Math.max(0, Math.round(s.rpm)));
    el.style.color = s.rpm > REDLINE ? '#f87171' : '#e2e8f0';
  });
  // F1-style 8-LED shift light bar
  const shiftBarRef = useLiveNode((el, s) => {
    const leds = el.children;
    if (!leds) return;
    const flash = s.rpm > 7250 && Math.sin(performance.now() * 0.04) > 0;
    for (let i = 0; i < leds.length; i++) {
      const on = s.rpm >= SHIFT_THRESHOLDS[i];
      const color = i < 3 ? '#34d399' : i < 6 ? '#fbbf24' : '#ef4444';
      leds[i].style.background = on ? (flash ? '#ffffff' : color) : 'rgba(255,255,255,0.08)';
      leds[i].style.boxShadow = on ? `0 0 8px ${color}` : 'none';
    }
  });

  const ticks = [];
  for (let k = 0; k <= 18; k++) {
    const deg = A0 + k * 15;
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
        strokeWidth={major ? 2.5 : 1.2}
        strokeLinecap="round"
      />,
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-between py-1.5 px-1.5 sm:py-2 sm:px-2">
      {/* Shift light LED array */}
      <div ref={shiftBarRef} className="flex w-full max-w-[150px] items-center justify-center gap-1 pt-0.5">
        {SHIFT_THRESHOLDS.map((t) => (
          <span key={t} className="h-1.5 flex-1 rounded-full bg-white/10" />
        ))}
      </div>

      <svg viewBox="0 0 220 205" className="min-h-0 flex-1 w-full max-w-[198px]">
        {/* track */}
        <path d={arc(R, A0, A1)} fill="none" stroke="#1f2937" strokeWidth={6} strokeLinecap="round" />
        {/* redline zone 7000–9000 */}
        <path
          ref={redRef}
          d={arc(R, angleOf(REDLINE), A1)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {ticks}
        {/* labels */}
        {Array.from({ length: 10 }).map((_, k) => {
          const [x, y] = polar(R - 23, A0 + k * 30);
          return (
            <text
              key={k}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={k >= 7 ? '#f87171' : '#cbd5e1'}
              fontSize="13"
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

        {/* needle */}
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
        TACHOMETER · 타코미터
      </div>
    </div>
  );
}
