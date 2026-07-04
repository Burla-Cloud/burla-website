import { useEffect, useRef, useState } from "react";
import { Reveal } from "../components/Reveal";

type Workload = {
  title: string;
  description: string;
  competitor: string;
  burlaCompute: number;
  burlaTokens: number;
  otherCompute: number;
  otherTokens: number;
};

const WORKLOADS: Workload[] = [
  {
    title: "Parse 10M PDFs",
    description: "Text extraction across a 2 TB document set.",
    competitor: "Coiled",
    burlaCompute: 14,
    burlaTokens: 0.4,
    otherCompute: 58,
    otherTokens: 4.8,
  },
  {
    title: "Embed 1M documents",
    description: "Embedding pipeline backing a production RAG index.",
    competitor: "Ray",
    burlaCompute: 7,
    burlaTokens: 0.3,
    otherCompute: 26,
    otherTokens: 1.2,
  },
  {
    title: "Backtest 1B rows of trades",
    description: "Vectorized strategy sweep across a year of tick data.",
    competitor: "Modal",
    burlaCompute: 32,
    burlaTokens: 0.8,
    otherCompute: 144,
    otherTokens: 2.4,
  },
];

export function WorkloadCompare() {
  return (
    <section
      id="workload-compare"
      className="section bg-onyxDeep relative overflow-hidden"
    >
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-12 md:mb-14 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-5">Real workloads, real bills</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Same job,{" "}
                <span className="underline-accent">
                  less compute and less tokens
                </span>
                .
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead text-pretty max-w-[460px]">
                Burla cuts the two biggest costs in agent workloads: compute
                and tokens. The cluster sizes itself, so agents stop wasting
                time choosing infrastructure, waiting for VMs to boot, and
                running code on underutilized machines.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={180} y={16}>
          <div className="bg-surface rounded-2xl border border-line overflow-hidden">
            {WORKLOADS.map((w, i) => (
              <WorkloadRow
                key={w.title}
                workload={w}
                isFirst={i === 0}
                rowIndex={i}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function WorkloadRow({
  workload,
  isFirst,
  rowIndex,
}: {
  workload: Workload;
  isFirst: boolean;
  rowIndex: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setArmed(true), rowIndex * 140);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [rowIndex]);

  const burlaTotal = workload.burlaCompute + workload.burlaTokens;
  const otherTotal = workload.otherCompute + workload.otherTokens;
  const rowMax = Math.max(burlaTotal, otherTotal);
  const burlaWidth = (burlaTotal / rowMax) * 100;
  const otherWidth = (otherTotal / rowMax) * 100;
  const savingsPct = Math.round(
    ((otherTotal - burlaTotal) / otherTotal) * 100,
  );

  return (
    <div
      ref={ref}
      className={`grid grid-cols-12 gap-x-6 gap-y-6 px-6 md:px-8 py-7 md:py-9 ${
        isFirst ? "" : "border-t border-line"
      }`}
    >
      <div className="col-span-12 md:col-span-3">
        <h3 className="font-display font-semibold text-ink text-[20px] md:text-[22px] tracking-tighter2 mb-1.5">
          {workload.title}
        </h3>
        <p className="text-[13.5px] text-inkSubtle text-pretty leading-snug">
          {workload.description}
        </p>
      </div>

      <div className="col-span-12 md:col-span-7 flex flex-col gap-5">
        <CostBar
          label="Burla"
          dollar={burlaTotal}
          breakdown={`$${workload.burlaCompute} compute · $${workload.burlaTokens.toFixed(2)} tokens`}
          widthPct={burlaWidth}
          tone="accent"
          armed={armed}
        />
        <CostBar
          label={workload.competitor}
          dollar={otherTotal}
          breakdown={`$${workload.otherCompute} compute · $${workload.otherTokens.toFixed(2)} tokens`}
          widthPct={otherWidth}
          tone="muted"
          armed={armed}
        />
      </div>

      <div className="col-span-12 md:col-span-2 md:text-right">
        <div
          className={`font-display font-semibold text-accent text-[28px] md:text-[32px] tabular-nums leading-none transition-opacity duration-500 ${
            armed ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "950ms" }}
        >
          {savingsPct}%
        </div>
        <div
          className={`mono text-[10.5px] uppercase tracking-eyebrow text-inkSubtle mt-2 transition-opacity duration-500 ${
            armed ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "1000ms" }}
        >
          less
        </div>
      </div>
    </div>
  );
}

function CostBar({
  label,
  dollar,
  breakdown,
  widthPct,
  tone,
  armed,
}: {
  label: string;
  dollar: number;
  breakdown: string;
  widthPct: number;
  tone: "accent" | "muted";
  armed: boolean;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!armed) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(dollar * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, dollar]);

  const labelColor = tone === "accent" ? "text-accent" : "text-inkSubtle";
  const dollarColor = tone === "accent" ? "text-ink" : "text-inkSubtle";
  const barColor = tone === "accent" ? "bg-accent" : "bg-ink/25";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-3">
        <span
          className={`mono text-[10.5px] uppercase tracking-eyebrow ${labelColor}`}
        >
          {label}
        </span>
        <span
          className={`font-display font-semibold tabular-nums text-[18px] md:text-[19px] leading-none ${dollarColor}`}
        >
          ${display.toFixed(2)}
        </span>
      </div>
      <div className="h-2.5 bg-line rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-[width] duration-[900ms] ease-out`}
          style={{ width: armed ? `${widthPct}%` : "0%" }}
        />
      </div>
      <p className="mono text-[11px] text-inkSubtle mt-2 tabular-nums">
        {breakdown}
      </p>
    </div>
  );
}
