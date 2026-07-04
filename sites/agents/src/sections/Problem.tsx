import { useEffect, useRef, useState } from "react";
import { Reveal } from "../components/Reveal";

const STATIC_UTIL = 23;
const BURLA_UTIL = 87;
const STATIC_LOW = 19;
const STATIC_HIGH = 27;
const BURLA_LOW = 83;
const BURLA_HIGH = 91;
const COLS = 25;
const ROWS = 4;
const TILES_PER_ROW = COLS * ROWS;

export function Problem() {
  const [armed, setArmed] = useState(false);
  const [staticPct, setStaticPct] = useState(STATIC_UTIL);
  const [burlaPct, setBurlaPct] = useState(BURLA_UTIL);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;

    const timers: number[] = [];

    function drift(
      setter: React.Dispatch<React.SetStateAction<number>>,
      low: number,
      high: number,
    ) {
      const wait = 4000 + Math.random() * 2000;
      const id = window.setTimeout(() => {
        setter((current) => {
          const magnitude = 2 + Math.random() * 2;
          let sign = Math.random() < 0.5 ? -1 : 1;
          let next = current + magnitude * sign;
          if (next > high || next < low) {
            sign = -sign;
            next = current + magnitude * sign;
          }
          next = Math.max(low, Math.min(high, next));
          return Math.round(next);
        });
        drift(setter, low, high);
      }, wait);
      timers.push(id);
    }

    const startStatic = window.setTimeout(
      () => drift(setStaticPct, STATIC_LOW, STATIC_HIGH),
      2200,
    );
    const startBurla = window.setTimeout(
      () => drift(setBurlaPct, BURLA_LOW, BURLA_HIGH),
      2600,
    );
    timers.push(startStatic, startBurla);

    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [armed]);

  return (
    <section
      id="problem"
      ref={sectionRef}
      className="section bg-onyx relative !py-20 md:!py-24"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-10 md:mb-12">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-5">The problem</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Industry average cloud CPU utilization is{" "}
                <span className="underline-accent">under 25%</span>.
                <br />
                Burla runs at 2 to 5x higher.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead text-pretty">
                Three of every four dollars on your cloud bill is lit on fire.
                Most compute is oversized from the start because existing
                infrastructure can&rsquo;t adapt mid-run when tasks need more
                CPU or RAM. In long-running data pipelines, machines can sit
                mostly empty for hours or days.
              </p>
              <a
                href="https://burla.dev/blog/dynamic-hardware"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-5"
              >
                The full mechanism, on the blog
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
            </Reveal>
          </div>
        </div>

        <Reveal delay={180} y={16}>
          <div className="surface-elev px-6 py-7 md:px-8 md:py-9">
            <FleetRow
              label="Typical static cluster"
              percent={staticPct}
              tone="muted"
              armed={armed}
              rowDelay={0}
            />
            <div className="h-px bg-line/70 my-6 md:my-7" />
            <FleetRow
              label="Burla · adaptive infrastructure"
              percent={burlaPct}
              tone="accent"
              armed={armed}
              rowDelay={420}
            />
          </div>
        </Reveal>

      </div>
    </section>
  );
}

function FleetRow({
  label,
  percent,
  tone,
  armed,
  rowDelay,
}: {
  label: string;
  percent: number;
  tone: "muted" | "accent";
  armed: boolean;
  rowDelay: number;
}) {
  const litCount = Math.round((percent / 100) * TILES_PER_ROW);
  const numColor = tone === "accent" ? "text-accent" : "text-inkMuted";

  return (
    <div className="grid grid-cols-12 items-center gap-5 md:gap-7">
      <div className="col-span-12 md:col-span-4">
        <div className="mono text-[12px] uppercase tracking-eyebrow text-inkSubtle">
          {label}
        </div>
        <div className="mt-1.5 text-[12.5px] text-inkSubtle tnum">
          {litCount} of 100 CPUs doing useful work
        </div>
      </div>

      <div className="col-span-9 md:col-span-6">
        <FleetGrid litCount={litCount} tone={tone} armed={armed} rowDelay={rowDelay} />
      </div>

      <div className="col-span-3 md:col-span-2 text-right">
        <PercentTick
          target={percent}
          armed={armed}
          delay={rowDelay + 100}
          className={`font-display font-medium text-[26px] md:text-[32px] tnum tracking-tighter2 ${numColor}`}
        />
      </div>
    </div>
  );
}

function FleetGrid({
  litCount,
  tone,
  armed,
  rowDelay,
}: {
  litCount: number;
  tone: "muted" | "accent";
  armed: boolean;
  rowDelay: number;
}) {
  const tiles = Array.from({ length: TILES_PER_ROW }, (_, i) => i);
  const litClass =
    tone === "accent"
      ? "bg-accent"
      : "bg-inkDim";
  const dimClass = "bg-line/70";

  return (
    <div
      className="grid gap-[3px] md:gap-[4px]"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
      }}
      aria-hidden
    >
      {tiles.map((i) => {
        const lit = i < litCount;
        const stagger = rowDelay + i * 8;
        return (
          <div
            key={i}
            className={`aspect-square rounded-[2px] ${lit ? litClass : dimClass}`}
            style={{
              opacity: armed ? 1 : 0,
              transform: armed ? "scale(1)" : "scale(0.6)",
              transition: `opacity 420ms ease-out ${stagger}ms, transform 420ms cubic-bezier(0.22, 1, 0.36, 1) ${stagger}ms, background-color 700ms ease-out`,
            }}
          />
        );
      })}
    </div>
  );
}

function PercentTick({
  target,
  armed,
  delay,
  className,
}: {
  target: number;
  armed: boolean;
  delay: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  const hasArmedOnce = useRef(false);

  useEffect(() => {
    if (!armed) return;
    let raf = 0;
    let startTs = 0;
    const from = valueRef.current;
    const isFirst = !hasArmedOnce.current;
    const duration = isFirst ? 1100 : 850;
    const startDelay = isFirst ? delay : 0;

    const tick = (now: number) => {
      if (!startTs) startTs = now;
      const t = Math.min(1, (now - startTs) / duration);
      const eased = isFirst ? 1 - Math.pow(1 - t, 2.2) : 0.5 - Math.cos(t * Math.PI) / 2;
      const v = Math.round(from + (target - from) * eased);
      setValue(v);
      valueRef.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    const id = window.setTimeout(() => {
      hasArmedOnce.current = true;
      raf = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      window.clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, [armed, target, delay]);

  return <span className={className}>{value}%</span>;
}
