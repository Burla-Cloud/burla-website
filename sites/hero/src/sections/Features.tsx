import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Reveal } from "../components/Reveal";
import { VmWall } from "../components/VmWall";
import { FEATURES } from "../content";
import { easeInOutCubic, easeOutCubic } from "../lib/easing";

export function Features() {
  return (
    <section className="relative bg-void py-32 sm:py-40">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow mb-5">{FEATURES.eyebrow}</p>
          <h2 className="h-mega">
            <span className="block text-ink">{FEATURES.headline[0]}</span>
            <span className="block text-accent">{FEATURES.headline[1]}</span>
          </h2>
        </Reveal>

        <div className="mt-24 flex flex-col gap-28 sm:gap-36">
          <Efficiency />
          <Simplicity />
          <Scale />
        </div>
      </div>
    </section>
  );
}

function FeatureHeader({
  index,
  kicker,
  headline,
  copy,
}: {
  index: string;
  kicker: string;
  headline: readonly string[];
  copy: string;
}) {
  return (
    <Reveal>
      <p className="mb-5 font-mono text-[12px] uppercase tracking-eyebrow text-accent">
        {index} · {kicker}
      </p>
      <h3 className="h-big">
        <span className="block text-ink">{headline[0]}</span>
        <span className="block text-outline">{headline[1]}</span>
      </h3>
      <p className="lead mt-6 max-w-xl text-pretty">{copy}</p>
    </Reveal>
  );
}

// 01 · efficiency — the same job, three bills
function Efficiency() {
  const reduced = useReducedMotion() ?? false;
  const f = FEATURES.efficiency;
  const max = Math.max(...f.bars.map((b) => b.cost));

  const tone: Record<string, { bar: string; value: string }> = {
    accent: { bar: "bg-accent", value: "text-accent" },
    dim: { bar: "bg-ink/15", value: "text-inkDim" },
    coral: { bar: "bg-coral/75", value: "text-coral" },
  };

  return (
    <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
      <FeatureHeader
        index={f.index}
        kicker={f.kicker}
        headline={f.headline}
        copy={f.copy}
      />

      <Reveal y={20}>
        <div className="grid grid-cols-3 items-end gap-4 sm:gap-8">
          {f.bars.map((bar, i) => (
            <div key={bar.name} className="flex flex-col">
              <div
                className={`tnum mb-3 font-mono text-[clamp(1.1rem,2.4vw,1.8rem)] font-semibold ${tone[bar.tone].value}`}
              >
                ${bar.cost.toFixed(2)}
              </div>
              <div
                className="flex w-full items-end overflow-hidden rounded-t-lg"
                style={{ height: 240 }}
              >
                <motion.div
                  className={`w-full rounded-t-lg ${tone[bar.tone].bar}`}
                  style={{
                    height: `${(bar.cost / max) * 100}%`,
                    transformOrigin: "bottom",
                  }}
                  initial={{ scaleY: reduced ? 1 : 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="border-t-2 border-ink/30 pt-3">
                <div className="font-mono text-[13px] font-medium text-ink">{bar.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-inkFaint">{bar.note}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-[11px] text-inkFaint">{f.fine}</p>
      </Reveal>
    </div>
  );
}

// 02 · simplicity — one function, and your agent already knows how
function Simplicity() {
  const f = FEATURES.simplicity;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(f.snippet).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [f.snippet]);

  return (
    <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
      <div className="lg:order-last">
        <FeatureHeader
          index={f.index}
          kicker={f.kicker}
          headline={f.headline}
          copy={f.copy}
        />
      </div>

      <Reveal y={20}>
        <div
          className="overflow-hidden rounded-2xl border border-hairline bg-panel"
          style={{ boxShadow: "0 24px 70px -28px rgba(0,0,0,0.85)" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <span className="font-mono text-[11px] uppercase tracking-eyebrow text-iceFaint">
              {f.snippetLabel}
            </span>
            <button
              onClick={copy}
              className={`font-mono text-[11px] uppercase tracking-eyebrow transition-colors ${
                copied ? "text-cyan" : "text-iceFaint hover:text-ice"
              }`}
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <p className="px-5 py-5 font-mono text-[13px] leading-relaxed text-iceDim sm:px-6 sm:text-[13.5px]">
            {f.snippet}
          </p>
        </div>
      </Reveal>
    </div>
  );
}

// 03 · speed & scale — a wall of machines igniting on loop
function Scale() {
  const f = FEATURES.scale;
  const reduced = useReducedMotion() ?? false;
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(panelRef, { amount: 0.4 });
  const [fraction, setFraction] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      setFraction(1);
      return;
    }
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    // ignite fast, hold, drain, breathe — mirrors a real burla job
    const IGNITE = 1300;
    const HOLD = 3200;
    const DRAIN = 900;
    const REST = 900;
    const CYCLE = IGNITE + HOLD + DRAIN + REST;
    const tick = (now: number) => {
      const t = (now - t0) % CYCLE;
      let next: number;
      if (t < IGNITE) next = easeOutCubic(t / IGNITE);
      else if (t < IGNITE + HOLD) next = 1;
      else if (t < IGNITE + HOLD + DRAIN)
        next = 1 - easeInOutCubic((t - IGNITE - HOLD) / DRAIN);
      else next = 0;
      setFraction(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  const cpus = Math.round(fraction * f.wallCpus);

  return (
    <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
      <div>
        <FeatureHeader
          index={f.index}
          kicker={f.kicker}
          headline={f.headline}
          copy={f.copy}
        />
        <Reveal className="mt-8 flex flex-wrap gap-3" delay={80}>
          {f.stats.map((s) => (
            <span
              key={s}
              className="rounded-full border border-hairline px-4 py-1.5 font-mono text-[12px] text-inkDim"
            >
              {s}
            </span>
          ))}
        </Reveal>
      </div>

      <Reveal y={20}>
        <div
          ref={panelRef}
          className="rounded-2xl border border-hairline bg-panel px-5 py-5 sm:px-6"
          style={{ boxShadow: "0 24px 70px -28px rgba(0,0,0,0.85)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="tnum font-mono text-[11px] font-medium uppercase tracking-eyebrow text-iceFaint">
              cluster · {cpus.toLocaleString()} / {f.wallCpus.toLocaleString()} cpus
            </span>
            <span className="font-mono text-[11px] text-iceFaint">{f.wallZone}</span>
          </div>
          <VmWall fraction={fraction} />
        </div>
      </Reveal>
    </div>
  );
}
