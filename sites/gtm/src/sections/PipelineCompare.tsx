import { useEffect, useRef, useState } from "react";
import { Reveal } from "../components/Reveal";

type Pipeline = {
  title: string;
  description: string;
  withoutBurla: number;
  withBurla: number;
};

// Compute-only dollar estimates for representative enterprise data pipelines.
// Modeled from typical n2-standard instance-hours at static vs adaptive
// utilization; directional, not a benchmark.
const PIPELINES: Pipeline[] = [
  {
    title: "Nightly Parquet ETL",
    description: "Aggregate across 4 TB of event data.",
    withoutBurla: 1840,
    withBurla: 410,
  },
  {
    title: "Genomics variant calling",
    description: "Variant calls across 12,000 samples.",
    withoutBurla: 6200,
    withBurla: 1380,
  },
  {
    title: "Risk simulation sweep",
    description: "Monte Carlo over a year of positions.",
    withoutBurla: 2750,
    withBurla: 590,
  },
];

export function PipelineCompare() {
  return (
    <section id="savings" className="section bg-band relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-12 md:mb-14 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-3">Real pipelines, real bills</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Same job,{" "}
                <span className="underline-accent">a fraction of the compute</span>.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead text-pretty max-w-[460px]">
                The cluster sizes itself to the work, so the same output lands
                on far fewer machine-hours. These are modeled estimates, your
                numbers get measured directly during the pilot.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={180} y={16}>
          <div className="bg-surface rounded-3xl border border-line overflow-hidden shadow-card mx-auto max-w-[1060px]">
            {PIPELINES.map((p, i) => (
              <PipelineRow
                key={p.title}
                pipeline={p}
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

function PipelineRow({
  pipeline,
  isFirst,
  rowIndex,
}: {
  pipeline: Pipeline;
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

  const rowMax = Math.max(pipeline.withoutBurla, pipeline.withBurla);
  const burlaWidth = (pipeline.withBurla / rowMax) * 100;
  const otherWidth = (pipeline.withoutBurla / rowMax) * 100;
  const savingsPct = Math.round(
    ((pipeline.withoutBurla - pipeline.withBurla) / pipeline.withoutBurla) * 100,
  );

  return (
    <div
      ref={ref}
      className={`grid grid-cols-12 gap-x-8 gap-y-3 px-6 md:px-8 py-8 md:py-11 transition-colors duration-200 hover:bg-onyx/50 ${
        isFirst ? "" : "border-t border-line"
      }`}
    >
      <div className="col-span-12 md:col-span-4 flex flex-col justify-center">
        <h3 className="font-display font-semibold text-ink text-[16px] md:text-[18px] tracking-tighter2 mb-1">
          {pipeline.title}
        </h3>
        <p className="text-[13px] text-inkSubtle text-pretty leading-snug">
          {pipeline.description}
        </p>
      </div>

      <div className="col-span-12 md:col-span-6 flex flex-col gap-2.5 justify-center">
        <CostBar
          label="With Burla"
          dollar={pipeline.withBurla}
          widthPct={burlaWidth}
          tone="accent"
          armed={armed}
        />
        <CostBar
          label="Without Burla"
          dollar={pipeline.withoutBurla}
          widthPct={otherWidth}
          tone="muted"
          armed={armed}
        />
      </div>

      <div className="col-span-12 md:col-span-2 flex md:flex-col items-center md:items-end justify-start md:justify-center gap-2">
        <div
          className={`inline-flex items-baseline gap-1 rounded-full bg-accentSoft px-3 py-1 transition-all duration-500 ${
            armed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
          style={{ transitionDelay: "420ms" }}
        >
          <span className="font-display font-semibold text-accent text-[14px] md:text-[16px] tabular-nums leading-none">
            {savingsPct}%
          </span>
        </div>
        <span
          className={`mono text-[10px] uppercase tracking-eyebrow text-inkSubtle transition-opacity duration-500 ${
            armed ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "520ms" }}
        >
          less spend
        </span>
      </div>
    </div>
  );
}

function CostBar({
  label,
  dollar,
  widthPct,
  tone,
  armed,
}: {
  label: string;
  dollar: number;
  widthPct: number;
  tone: "accent" | "muted";
  armed: boolean;
}) {
  const isAccent = tone === "accent";
  const labelColor = isAccent ? "text-accent" : "text-inkSubtle";
  const dollarColor = isAccent ? "text-ink" : "text-inkSubtle";
  const barColor = isAccent ? "bg-accentGrad" : "bg-inkDim/60";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 gap-3">
        <span className={`mono text-[10px] uppercase tracking-eyebrow ${labelColor}`}>
          {label}
        </span>
        <span
          className={`font-display font-semibold tabular-nums text-[14px] md:text-[15px] leading-none ${dollarColor}`}
        >
          ${dollar.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-onyxDeep rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-[width] duration-[1000ms] ease-out ${
            isAccent ? "shadow-[0_0_16px_rgba(21,94,117,0.35)]" : ""
          }`}
          style={{ width: armed ? `${widthPct}%` : "0%" }}
        />
      </div>
    </div>
  );
}
