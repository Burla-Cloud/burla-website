import { useEffect, useRef, useState } from "react";

/**
 * UtilizationCharts — two stacked CPU-over-time charts contrasting bursty,
 * half-idle utilization on other tools against Burla's flat, near-full
 * utilization. Lines draw in on view, and a shared scrubber lets you slide
 * across to read the exact CPU % at any point on both charts.
 */

function smoothstep(a: number, b: number, x: number): number {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

// Bursty on/off utilization: steep ramps up to flat ~95% plateaus, steep drops
// to idle troughs with small ripples, then a decline at the end.
function otherU(t: number): number {
  const LOW = 0.12;
  const HIGH = 0.95;
  const span = HIGH - LOW;
  const lvl =
    LOW +
    span * smoothstep(0.14, 0.22, t) - // ramp up to plateau
    span * smoothstep(0.32, 0.4, t) + // drop to trough
    span * smoothstep(0.56, 0.64, t) - // ramp up again
    span * 0.6 * smoothstep(0.82, 0.97, t); // decline at the end
  // ripple — lively in the idle troughs, near-flat on the busy plateaus
  const lowness = Math.max(0, Math.min(1, 1 - (lvl - LOW) / span));
  const ripple =
    (0.004 + 0.02 * lowness) * Math.sin(t * 94) +
    0.009 * lowness * Math.sin(t * 161 + 1.3);
  return Math.max(0.05, Math.min(0.98, lvl + ripple));
}

function burlaU(t: number): number {
  const ramp = Math.min(1, t / 0.14);
  const e = (1 - Math.cos(ramp * Math.PI)) / 2;
  const top = 0.94 + 0.014 * Math.sin(t * 72) + 0.009 * Math.sin(t * 151 + 0.6);
  return 0.1 + (top - 0.1) * e;
}

const PLOT_W = 720;
const PLOT_H = 124;
const PAD_L = 38;
const PAD_T = 12;
const SAMPLES = 160;
const VB_W = PAD_L + PLOT_W + 12;
const VB_H = PAD_T * 2 + PLOT_H;

// Build a smooth path through the sampled points using a Catmull-Rom spline
// converted to cubic béziers — gives soft, curvy lines.
function smoothLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
  }
  return d;
}

function buildPaths(fn: (t: number) => number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    pts.push({ x: PAD_L + t * PLOT_W, y: PAD_T + (1 - fn(t)) * PLOT_H });
  }
  const line = smoothLine(pts);
  const baseY = PAD_T + PLOT_H;
  const area = `${line} L ${PAD_L + PLOT_W} ${baseY} L ${PAD_L} ${baseY} Z`;
  return { line, area };
}

const other = buildPaths(otherU);
const burla = buildPaths(burlaU);

function Chart({
  title,
  paths,
  color,
  fn,
  active,
  delay,
  scrub,
  show,
}: {
  title: string;
  paths: { line: string; area: string };
  color: string;
  fn: (t: number) => number;
  active: boolean;
  delay: number;
  scrub: number;
  show: boolean;
}) {
  const id = title.replace(/\s/g, "");
  const x = PAD_L + scrub * PLOT_W;
  const val = fn(scrub);
  const y = PAD_T + (1 - val) * PLOT_H;
  const pct = Math.round(val * 100);

  const bw = 44;
  const bh = 20;
  let bx = x - bw / 2;
  bx = Math.max(PAD_L, Math.min(PAD_L + PLOT_W - bw, bx));
  const by = Math.max(0, y - bh - 9);

  return (
    <div>
      <div className="text-center font-semibold text-ink text-[13px] mb-0.5">
        {title}
      </div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={`${title} CPU utilization over time`}
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="#D2DAE2"
          strokeWidth="1"
        />
        {/* y axis caption */}
        <text
          x={14}
          y={PAD_T + PLOT_H / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${PAD_T + PLOT_H / 2})`}
          fontFamily="'JetBrains Mono', monospace"
          fontSize="11"
          letterSpacing="2"
          fill="#6B7480"
        >
          CPU
        </text>
        <path
          d={paths.area}
          fill={`url(#fill-${id})`}
          style={{
            opacity: active ? 1 : 0,
            transition: `opacity 900ms ease ${delay + 0.5}s`,
          }}
        />
        <path
          d={paths.line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: active ? 0 : 1,
            transition: `stroke-dashoffset 1700ms cubic-bezier(0.4,0,0.2,1) ${delay}s`,
          }}
        />
        {/* scrubber — only visible while hovering the chart */}
        <g style={{ opacity: show ? 1 : 0, transition: "opacity 150ms ease" }}>
          <line
            x1={x}
            y1={PAD_T - 2}
            x2={x}
            y2={PAD_T + PLOT_H}
            stroke="#AEB7C2"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle cx={x} cy={y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
          <rect x={bx} y={by} width={bw} height={bh} rx="6" fill="#0E1418" />
          <text
            x={bx + bw / 2}
            y={by + bh / 2 + 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="11.5"
            fontWeight="600"
            fill="#FFFFFF"
          >
            {pct}%
          </text>
        </g>
      </svg>
    </div>
  );
}

export function UtilizationCharts() {
  const ref = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [scrub, setScrub] = useState(0.47);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const moveTo = (clientX: number) => {
    const el = plotRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x0 = r.left + (PAD_L / VB_W) * r.width;
    const x1 = r.left + ((PAD_L + PLOT_W) / VB_W) * r.width;
    let t = (clientX - x0) / (x1 - x0);
    t = Math.max(0, Math.min(1, t));
    setScrub(t);
  };

  return (
    <div
      ref={ref}
      className="rounded-3xl border border-line bg-surface shadow-card p-5 md:p-6"
    >
      <div
        ref={plotRef}
        className="flex flex-col gap-7 md:gap-10 cursor-ew-resize select-none touch-none"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onPointerMove={(e) => moveTo(e.clientX)}
        onPointerDown={(e) => {
          setHovering(true);
          moveTo(e.clientX);
        }}
      >
        <Chart
          title="Other orchestration tools"
          paths={other}
          color="#94A0AD"
          fn={otherU}
          active={active}
          delay={0}
          scrub={scrub}
          show={hovering}
        />
        <Chart
          title="Same workload using Burla"
          paths={burla}
          color="#0891B2"
          fn={burlaU}
          active={active}
          delay={0.45}
          scrub={scrub}
          show={hovering}
        />
      </div>
    </div>
  );
}
