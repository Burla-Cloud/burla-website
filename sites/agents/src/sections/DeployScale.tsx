import { useEffect, useRef, useState } from "react";
import { Reveal } from "../components/Reveal";

export function DeployScale() {
  return (
    <section
      id="deploy-scale"
      className="section relative overflow-hidden bg-onyxDeep"
    >
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="eyebrow mb-5">Deploy and scale</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Call the function. It deploys in{" "}
                <span className="underline-accent">under a second</span>. It
                scales to{" "}
                <span className="whitespace-nowrap">
                  <span className="text-accent tnum">10,000</span> CPUs.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead mt-7 max-w-[480px] text-pretty">
                Burla only waits once, when the cluster warms up. After that
                every call the agent makes deploys in under a second, on as
                many VMs as the job needs.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 md:mt-7 text-[15px] md:text-[16px] text-inkMuted max-w-[480px] text-pretty">
                Here, one function call scans 2.4&nbsp;TB of Parquet in 76
                seconds.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={180} y={16}>
              <div className="surface-elev overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 md:px-6 border-b border-line flex-wrap gap-y-2">
                  <div className="flex items-center gap-4">
                    <span className="mono text-[12px] text-inkSubtle uppercase tracking-eyebrow">
                      Cluster scaling
                    </span>
                    <span className="mono text-[12px] text-inkSubtle hidden sm:inline">
                      125 vms · n2-standard-80 · us-central1
                    </span>
                  </div>
                  <div className="flex items-center gap-5 mono text-[12px]">
                    <div>
                      <span className="text-inkSubtle">peak vms · </span>
                      <span className="text-ink tnum">125</span>
                    </div>
                    <div>
                      <span className="text-inkSubtle">peak cpus · </span>
                      <span className="text-accent tnum font-medium">
                        10,000
                      </span>
                    </div>
                  </div>
                </div>
                <ClusterRamp />
              </div>
            </Reveal>
          </div>
        </div>

      </div>
    </section>
  );
}

const RAMP_W = 1000;
const RAMP_H = 220;
const RAMP_PAD_TOP = 28;
const RAMP_PAD_BOTTOM = 14;
const RAMP_PAD_X = 8;
const RAMP_PEAK_CPUS = 10000;
const RAMP_TOTAL_S = 76;

function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return 3 * c * c - 2 * c * c * c;
}

function rampCpus(t: number): number {
  if (t < 15) {
    return RAMP_PEAK_CPUS * smoothstep(t / 15);
  }
  if (t <= 70) {
    return RAMP_PEAK_CPUS;
  }
  return RAMP_PEAK_CPUS * (1 - smoothstep((t - 70) / 6));
}

type RampHover = { t: number; c: number; xv: number; yv: number };

function ClusterRamp() {
  const innerW = RAMP_W - RAMP_PAD_X * 2;
  const innerH = RAMP_H - RAMP_PAD_TOP - RAMP_PAD_BOTTOM;
  const xOf = (t: number) => RAMP_PAD_X + (t / RAMP_TOTAL_S) * innerW;
  const yOf = (c: number) =>
    RAMP_PAD_TOP + (1 - c / RAMP_PEAK_CPUS) * innerH;

  const samples: { t: number; c: number }[] = [];
  for (let t = 0; t <= RAMP_TOTAL_S; t += 0.5) {
    samples.push({ t, c: rampCpus(t) });
  }

  const linePath = samples
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xOf(p.t).toFixed(1)} ${yOf(p.c).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${xOf(RAMP_TOTAL_S).toFixed(1)} ${yOf(0).toFixed(1)} L ${xOf(0).toFixed(1)} ${yOf(0).toFixed(1)} Z`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [armed, setArmed] = useState(false);
  const [hover, setHover] = useState<RampHover | null>(null);

  useEffect(() => {
    if (!lineRef.current) return;
    const len = lineRef.current.getTotalLength();
    lineRef.current.style.strokeDasharray = `${len}`;
    lineRef.current.style.strokeDashoffset = `${len}`;
    lineRef.current.style.transition = "none";
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!armed || !lineRef.current) return;
    const el = lineRef.current;
    requestAnimationFrame(() => {
      el.style.transition =
        "stroke-dashoffset 2.6s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.strokeDashoffset = "0";
    });
  }, [armed]);

  const updateHoverFromClientX = (clientX: number) => {
    const el = chartRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const xv = ratio * RAMP_W;
    const xClamped = Math.max(RAMP_PAD_X, Math.min(RAMP_W - RAMP_PAD_X, xv));
    const t = ((xClamped - RAMP_PAD_X) / innerW) * RAMP_TOTAL_S;
    const c = rampCpus(t);
    setHover({ t, c, xv: xClamped, yv: yOf(c) });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) =>
    updateHoverFromClientX(e.clientX);
  const onMouseLeave = () => setHover(null);
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    updateHoverFromClientX(e.touches[0].clientX);
  };
  const onTouchEnd = () => setHover(null);

  const gridCpus = [2500, 5000, 7500];
  const hoverLeftPct = hover ? (hover.xv / RAMP_W) * 100 : 0;
  const hoverNearRightEdge = hoverLeftPct > 80;

  return (
    <div ref={wrapRef} className="px-5 py-6 md:px-7 md:py-7">
      <div
        ref={chartRef}
        className="h-[180px] md:h-[220px] w-full relative cursor-crosshair touch-pan-y select-none"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchMove}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <svg
          viewBox={`0 0 ${RAMP_W} ${RAMP_H}`}
          className="w-full h-full block"
          preserveAspectRatio="none"
          aria-label="Cluster CPUs over wall-clock time. Ramps from 0 to 10,000 in about 15 seconds, holds, finishes at 76 seconds. Hover or touch the chart to read CPUs at any point."
        >
          <defs>
            <linearGradient id="rampGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#155E75" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#155E75" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridCpus.map((c) => (
            <line
              key={c}
              x1={RAMP_PAD_X}
              x2={RAMP_W - RAMP_PAD_X}
              y1={yOf(c)}
              y2={yOf(c)}
              stroke="#D2DAE2"
              strokeDasharray="2 8"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line
            x1={RAMP_PAD_X}
            x2={RAMP_W - RAMP_PAD_X}
            y1={yOf(RAMP_PEAK_CPUS)}
            y2={yOf(RAMP_PEAK_CPUS)}
            stroke="#155E75"
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d={areaPath}
            fill="url(#rampGrad)"
            style={{
              opacity: armed ? 1 : 0,
              transition: "opacity 1.6s ease-out 0.5s",
            }}
          />

          <path
            ref={lineRef}
            d={linePath}
            fill="none"
            stroke="#155E75"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.xv}
                x2={hover.xv}
                y1={RAMP_PAD_TOP - 6}
                y2={RAMP_H - RAMP_PAD_BOTTOM}
                stroke="#155E75"
                strokeOpacity="0.55"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hover.xv}
                cy={hover.yv}
                r="8"
                fill="#155E75"
                fillOpacity="0.18"
              />
              <circle
                cx={hover.xv}
                cy={hover.yv}
                r="3.5"
                fill="#155E75"
                stroke="#F5F7F9"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute top-1"
            style={{
              left: `${hoverLeftPct}%`,
              transform: hoverNearRightEdge
                ? "translateX(-100%) translateX(8px)"
                : hoverLeftPct < 20
                  ? "translateX(0) translateX(-8px)"
                  : "translateX(-50%)",
            }}
          >
            <div className="mono text-[11px] bg-onyxDeep/95 border border-line rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-xl backdrop-blur">
              <span className="text-accent tnum font-medium">
                {Math.round(hover.c).toLocaleString()}
              </span>
              <span className="text-inkSubtle"> cpus</span>
              <span className="text-line mx-1.5">·</span>
              <span className="text-ink tnum">{Math.round(hover.t)}s</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between text-[11px] mono">
        <span className="text-inkSubtle">0s</span>
        <span className="text-inkSubtle hidden sm:inline">
          15s · ramp complete
        </span>
        <span className="text-inkSubtle sm:hidden">15s</span>
        <span className="text-inkSubtle">30s</span>
        <span className="text-inkSubtle">45s</span>
        <span className="text-inkSubtle">60s</span>
        <span className="text-accent">76s · done</span>
      </div>
    </div>
  );
}
