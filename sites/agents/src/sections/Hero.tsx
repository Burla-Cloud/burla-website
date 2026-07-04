import { useEffect, useState } from "react";
import { Terminal, type Frame } from "../components/Terminal";
import { VmGrid } from "../components/VmGrid";
import { Reveal } from "../components/Reveal";
import { clusterCurve } from "../lib/clusterCurve";

// Terminal pacing is designed so the counters / VM grid stay idle until the
// dispatch line appears, then ramp in sync with the progress lines streaming
// from the cluster. Phases:
//   0–DISPATCH_MS         agent reasoning (prompt + description + dispatch)
//   DISPATCH_MS–RAMP_END  cluster scales, progress lines stream, counters ramp
//   RAMP_END–TOTAL        done line + file written message
// If you change any speed or wait below, re-check DISPATCH_MS and COUNTER_RAMP_MS.
const HERO_SCRIPT: Frame[] = [
  {
    kind: "user",
    text: "Embed every Wikipedia article for our RAG pipeline.",
    speed: 46,
  },
  { kind: "wait", ms: 360 },
  {
    kind: "assistant",
    text: "Streaming enwiki, chunking at 512 tokens, embedding with bge-small-en on CPU.",
    speed: 38,
  },
  { kind: "wait", ms: 360 },
  {
    kind: "assistant",
    text: 'Dispatching remote_parallel_map across 10,000 CPUs, func_ram="dynamic".',
    speed: 32,
  },
  { kind: "wait", ms: 380 },
  {
    kind: "system",
    text: "cluster scaling: 24 → 312 → 2,048 → 10,000 CPUs",
    speed: 18,
  },
  { kind: "wait", ms: 650 },
  {
    kind: "stdout",
    text: "[t+02s] embedded   32,847,116 / 218,492,113 chunks · 1,872 active",
    speed: 18,
    tone: "ink",
  },
  { kind: "wait", ms: 2700 },
  {
    kind: "stdout",
    text: "[t+18s] embedded   87,914,221 / 218,492,113 chunks · 6,704 active",
    speed: 18,
    tone: "ink",
  },
  { kind: "wait", ms: 2700 },
  {
    kind: "stdout",
    text: "[t+46s] embedded  154,672,890 / 218,492,113 chunks · 9,994 active",
    speed: 18,
    tone: "ink",
  },
  { kind: "wait", ms: 1900 },
  {
    kind: "stdout",
    text: "[t+108s] embedded 218,492,113 / 218,492,113 chunks · done",
    speed: 18,
    tone: "ink",
  },
  { kind: "wait", ms: 420 },
  {
    kind: "stdout",
    text: "done · 218M chunks · 108s · $14.20 · peak 10,000 CPUs",
    speed: 26,
    tone: "accent",
  },
  { kind: "wait", ms: 460 },
  {
    kind: "assistant",
    text: "embeddings.parquet written to /workspace/shared. ready for pgvector, Pinecone, or Weaviate.",
    speed: 28,
  },
];

const TOTAL_DEMO_MS = 27_500;
// Compute "starts" once the dispatch line + cluster-scaling line have rendered.
// Counters and the VM grid hold at zero until DISPATCH_MS, then ramp until
// RAMP_END_MS, landing right as the final progress line types in.
const DISPATCH_MS = 8_600;
const COUNTER_RAMP_MS = 13_900;
// Time we sit on the final state (job done, $14.20, 108s, all workers released)
// before the demo loops, so viewers can register the result.
const FINAL_HOLD_MS = 6_200;

function useLiveCounters(runKey: number) {
  const [cpus, setCpus] = useState(0);
  const [cost, setCost] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setCpus(0);
    setCost(0);
    setSeconds(0);
    const t0 = performance.now();
    let raf = 0;
    const TARGET_CPUS = 10_000;
    const TARGET_COST = 14.20;
    const TARGET_SEC = 108;
    const tick = (now: number) => {
      const elapsed = now - t0;
      if (elapsed < DISPATCH_MS) {
        // hold at zero until the agent actually dispatches the function
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (elapsed - DISPATCH_MS) / COUNTER_RAMP_MS);
      // Active CPUs follow the cluster lifecycle: boot, run, drain.
      setCpus(Math.round(clusterCurve(t) * TARGET_CPUS));
      // Cost and elapsed time are cumulative, so they only ever go up.
      const monoEased = 1 - Math.pow(1 - t, 2.4);
      setCost(monoEased * TARGET_COST);
      setSeconds(Math.round(monoEased * TARGET_SEC));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runKey]);

  return { cpus, cost, seconds };
}

export function Hero() {
  const [runKey, setRunKey] = useState(0);
  const { cpus, cost, seconds } = useLiveCounters(runKey);

  useEffect(() => {
    const id = window.setTimeout(
      () => setRunKey((k) => k + 1),
      TOTAL_DEMO_MS + FINAL_HOLD_MS
    );
    return () => clearTimeout(id);
  }, [runKey]);

  return (
    <section id="top" className="relative overflow-hidden bg-onyx">
      <div className="absolute inset-0 bg-onyxGrad pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none mask-fade-bottom" />

      <div className="container-x relative pt-[110px] md:pt-[118px] pb-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-9 lg:gap-10 items-center">
          {/* Left column */}
          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal delay={60}>
              <h1 className="h-display text-balance">
                Give your agent{" "}
                <span className="whitespace-nowrap">
                  <span className="text-ink underline-accent">10,000</span>{" "}
                  CPUs.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="lead mt-5 max-w-[560px] text-pretty">
                Burla is the open-source compute platform you give to your AI
                agent so it can run massive data pipelines in your cloud.
                Every function call can run on thousands of VMs in under a
                second, with 2 to 5x better resource utilization than anything
                else.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href="#system-prompt" className="btn-primary">
                  Get the agent skill
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M3 8h10m0 0L9 4m4 4l-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href="https://docs.burla.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Read the docs
                </a>
              </div>
            </Reveal>

          </div>

          {/* Right column — live demo monitor */}
          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal delay={120} y={20}>
              <HeroMonitor
                key={runKey}
                cpus={cpus}
                cost={cost}
                seconds={seconds}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMonitor({
  cpus,
  cost,
  seconds,
}: {
  cpus: number;
  cost: number;
  seconds: number;
}) {
  return (
    <div className="surface-elev overflow-hidden">
      {/* Terminal */}
      <Terminal
        script={HERO_SCRIPT}
        title="claude · agent.py"
        height={320}
        triggerOnView={false}
        className="rounded-none border-0 border-b border-line"
      />

      {/* Live monitor strip */}
      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <MonitorCell label="cpus active" value={cpus.toLocaleString()} accent />
        <MonitorCell
          label="burla · usd"
          value={`$${cost.toFixed(2)}`}
        />
        <MonitorCell
          label="elapsed · s"
          value={seconds.toString()}
        />
      </div>

      {/* Comparative cost panel · same job, other runtimes */}
      <div className="border-b border-line px-5 py-3.5 md:px-6">
        <div className="flex items-center justify-between mb-2.5 flex-wrap gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-eyebrow text-inkSubtle">
            same job · other runtimes
          </span>
          <span className="mono text-[11px] text-accent">
            -70% vs the worst
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line">
          <CompareCell
            runtime="Coiled"
            cost="$32.00"
            delta="-56%"
            side="left"
          />
          <CompareCell
            runtime="Ray (DIY on k8s)"
            cost="$48.00"
            delta="-70%"
            side="right"
          />
        </div>
      </div>

      {/* VM grid */}
      <div className="px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="eyebrow">
            cluster · {cpus.toLocaleString()} active / 10,000 cpus
          </span>
          <span className="mono text-[11px] text-inkSubtle">
            us-central1-a
          </span>
        </div>
        <div className="aspect-[10/1] w-full">
          <VmGrid
            cols={64}
            rows={8}
            rampMs={COUNTER_RAMP_MS}
            startDelayMs={DISPATCH_MS}
            triggerOnView={false}
            curve={clusterCurve}
            className="gap-[3px] h-full"
            dotClassName="bg-line"
            activeClassName="bg-accent"
          />
        </div>
      </div>
    </div>
  );
}

function MonitorCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-3 md:px-5">
      <div className="text-[10px] font-medium uppercase tracking-eyebrow text-inkSubtle">
        {label}
      </div>
      <div
        className={`mono tnum mt-1 text-[17px] md:text-[18px] font-medium ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CompareCell({
  runtime,
  cost,
  delta,
  side,
}: {
  runtime: string;
  cost: string;
  delta: string;
  side: "left" | "right";
}) {
  const pad =
    side === "left" ? "pr-4 md:pr-5" : "pl-4 md:pl-5";
  return (
    <div className={`py-0.5 ${pad}`}>
      <div className="mono text-[10px] uppercase tracking-eyebrow text-inkSubtle">
        {runtime}
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="mono tnum text-[15px] md:text-[16px] font-medium text-error/80">
          {cost}
        </span>
        <span className="mono text-[10px] text-accent/90">{delta}</span>
      </div>
    </div>
  );
}
