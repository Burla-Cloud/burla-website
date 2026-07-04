import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Reveal } from "../components/Reveal";

type ErrorCard = {
  tool: string;
  title: string;
  message: string;
  tone: "light" | "dark";
};

const CARDS: ErrorCard[] = [
  {
    tool: "Airflow",
    title: "Broken DAG",
    message: "ModuleNotFoundError\nDAG import failed",
    tone: "light",
  },
  {
    tool: "Ray",
    title: "OutOfMemoryError",
    message: "Task killed due to\nnode memory pressure",
    tone: "dark",
  },
  {
    tool: "Dask",
    title: "KilledWorker",
    message: "Workers died while\nrunning this task",
    tone: "light",
  },
  {
    tool: "AWS Batch",
    title: "RUNNABLE",
    message: "INSUFFICIENT_CAPACITY",
    tone: "light",
  },
];

// Each card settles into a subtly scattered resting position, like cards laid
// on a desk. Hovering a card straightens and lifts it.
const SETTLE = [
  "rotate(-3deg) translateY(6px)",
  "rotate(2.5deg) translateY(-8px)",
  "rotate(-2deg) translateY(10px)",
  "rotate(3.5deg) translateY(2px)",
];

// Staggered spin-in: each card rises from below while whirling through nearly
// a full turn, scaling up from small with a soft blur that clears, then
// overshoots and settles into its scattered resting pose. Cascades left to
// right, one card at a time.
function floatKeyframes(i: number): Keyframe[] {
  const dir = i % 2 === 0 ? -1 : 1;
  return [
    {
      offset: 0,
      opacity: 0,
      transform: `translateY(52px) scale(0.45) rotate(${dir * -300}deg)`,
      filter: "blur(3px)",
    },
    {
      offset: 0.55,
      opacity: 1,
      transform: `translateY(-10px) scale(1.05) rotate(${dir * 12}deg)`,
      filter: "blur(0px)",
    },
    {
      offset: 0.78,
      opacity: 1,
      transform: `translateY(4px) scale(0.985) rotate(${dir * -3}deg)`,
      filter: "blur(0px)",
    },
    { offset: 1, opacity: 1, transform: SETTLE[i], filter: "blur(0px)" },
  ];
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Problem() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setArmed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="problem" className="bg-surface border-t border-line relative overflow-hidden py-16 md:py-20 lg:py-24">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="eyebrow mb-3">The problem</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Scalable &amp; efficient pipelines are{" "}
                <span className="underline-accent">not straightforward</span>.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-6 lg:pt-2">
            <Reveal delay={140}>
              <p className="lead text-pretty max-w-[520px]">
                Slow deployments, VM reboots, or container rebuilds mean waiting
                5 to 10 minutes with every change. Errors are vague, and configs
                are full of secret tradeoffs. 90% resource utilization is a pipe
                dream.
              </p>
            </Reveal>
          </div>
        </div>

        <div
          ref={cardsRef}
          className="mt-12 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {CARDS.map((card, i) => (
            <ErrorWindow key={card.tool} card={card} index={i} armed={armed} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ErrorWindow({
  card,
  index,
  armed,
}: {
  card: ErrorCard;
  index: number;
  armed: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [landed, setLanded] = useState(false);
  const isDark = card.tone === "dark";

  useEffect(() => {
    if (!armed) return;
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setLanded(true);
      return;
    }
    const anim = el.animate(floatKeyframes(index), {
      duration: 1150,
      delay: index * 300,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    });
    const onFinish = () => {
      try {
        anim.commitStyles();
        anim.cancel();
      } catch {
        // ignore
      }
      setLanded(true);
    };
    anim.addEventListener("finish", onFinish);
    return () => {
      anim.removeEventListener("finish", onFinish);
      anim.cancel();
    };
  }, [armed, index]);

  // While the swirl animation plays it owns transform/opacity. Once landed we
  // hand control back to CSS so hover transitions stay smooth.
  const style: CSSProperties = {
    boxShadow: hovered
      ? "0 36px 70px -22px rgba(15,20,25,0.34)"
      : "0 14px 40px -22px rgba(15,20,25,0.18)",
    willChange: "transform, opacity, filter",
  };
  if (landed) {
    style.opacity = 1;
    style.transform = hovered
      ? "rotate(0deg) translateY(-16px) scale(1.045)"
      : SETTLE[index];
    style.transition =
      "transform 300ms cubic-bezier(0.34,1.56,0.5,1), box-shadow 260ms ease";
  } else {
    // Pre-animation / mid-animation: WAAPI owns opacity & transform while
    // playing; keep it hidden until then to avoid a flash at rest.
    style.opacity = 0;
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`rounded-2xl border overflow-hidden ${
        isDark
          ? "bg-[#0E1418] border-creamLine"
          : "bg-surface border-line"
      }`}
      style={style}
    >
      <div
        className={`flex items-center gap-1.5 px-4 py-2.5 border-b ${
          isDark ? "border-creamLine" : "border-line"
        }`}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
      </div>
      <div className="px-5 py-5">
        <div
          className={`mono text-[10.5px] uppercase tracking-eyebrow mb-3 ${
            isDark ? "text-creamSubtle" : "text-inkSubtle"
          }`}
        >
          {card.tool}
        </div>
        <div
          className={`font-mono text-[16px] font-semibold mb-2 ${
            isDark ? "text-creamInk" : "text-ink"
          }`}
        >
          {card.title}
        </div>
        <div className="font-mono text-[12.5px] leading-relaxed whitespace-pre-line text-error/80">
          {card.message}
        </div>
      </div>
    </div>
  );
}
