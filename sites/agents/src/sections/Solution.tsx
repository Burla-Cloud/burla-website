import { Reveal } from "../components/Reveal";

type PillarKind = "vertical" | "horizontal" | "adaptive";

interface Pillar {
  kind: PillarKind;
  label: string;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    kind: "vertical",
    label: "Vertical",
    title: "Concurrency per VM",
    body: "Workers pack tighter when CPU and memory have room. They back off the moment pressure rises.",
  },
  {
    kind: "horizontal",
    label: "Horizontal",
    title: "VMs in and out",
    body: "New VMs boot when the work demands them. Idle ones fold away.",
  },
  {
    kind: "adaptive",
    label: "Adaptive",
    title: "Real signal, not config",
    body: "Live CPU and memory pressure decide what runs where. No tuning, no profiles, no static right-sizing.",
  },
];

export function Solution() {
  return (
    <section id="solution" className="section-tight bg-onyx relative">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-12 md:mb-14">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-5">The solution</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Infrastructure that{" "}
                <span className="underline-accent">adapts to the work</span>.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead text-pretty">
                Burla gets rid of underutilized resources with adaptive
                infrastructure. Every function call gets the room it needs.
                Every idle slot of compute gets used. The cluster sizes
                itself in real time because it&rsquo;s monitoring every
                machine.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={180} y={16}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line rounded-2xl overflow-hidden border border-line">
            {PILLARS.map((p) => (
              <PillarCard key={p.label} pillar={p} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <div className="bg-surface px-6 py-7 md:px-7 md:py-8 flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 pt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="mono text-[11px] uppercase tracking-eyebrow text-accent">
            {pillar.label}
          </span>
        </div>
        <PillarIcon kind={pillar.kind} />
      </div>
      <div className="font-display font-semibold text-ink text-[18px] md:text-[19px] tracking-tighter2 mb-2">
        {pillar.title}
      </div>
      <p className="body-base text-[14px] text-pretty">{pillar.body}</p>
    </div>
  );
}

function PillarIcon({ kind }: { kind: PillarKind }) {
  if (kind === "vertical") {
    // One VM box with a labeled top bar (looks like a machine), workers
    // packed in a 4x3 grid inside.
    return (
      <svg
        width="60"
        height="60"
        viewBox="0 0 44 44"
        className="text-accent shrink-0"
        fill="none"
        aria-hidden
      >
        <rect
          x="4"
          y="8"
          width="36"
          height="28"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <line
          x1="4"
          y1="14"
          x2="40"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.4"
        />
        <circle cx="7.5" cy="11" r="0.7" fill="currentColor" />
        <circle cx="10" cy="11" r="0.7" fill="currentColor" />
        <circle cx="12.5" cy="11" r="0.7" fill="currentColor" />
        {Array.from({ length: 12 }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          return (
            <rect
              key={i}
              x={7.5 + col * 7}
              y={17 + row * 5.5}
              width="5.5"
              height="4.2"
              rx="0.7"
              fill="currentColor"
            />
          );
        })}
      </svg>
    );
  }

  if (kind === "horizontal") {
    // Fleet of VMs: 4 active in solid, 1 spawning in dashed, plus a + mark.
    return (
      <svg
        width="60"
        height="60"
        viewBox="0 0 44 44"
        className="text-accent shrink-0"
        fill="none"
        aria-hidden
      >
        {[3, 9.5, 16, 22.5].map((x) => (
          <rect
            key={x}
            x={x}
            y="14"
            width="5.5"
            height="16"
            rx="1"
            fill="currentColor"
          />
        ))}
        <rect
          x="29"
          y="14"
          width="5.5"
          height="16"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="2 1.6"
        />
        <line
          x1="39.5"
          y1="18.5"
          x2="39.5"
          y2="25.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1="36"
          y1="22"
          x2="43"
          y2="22"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Adaptive: two stacked pressure waves (cpu + mem) over a baseline ruler.
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 44 44"
      className="text-accent shrink-0"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 18 Q 8 9, 13 18 T 23 18 T 33 18 T 41 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M3 28 Q 8 33, 13 28 T 23 28 T 33 28 T 41 30"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
      <line
        x1="3"
        y1="36"
        x2="41"
        y2="36"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeDasharray="1.5 2.5"
        opacity="0.55"
      />
      <circle cx="41" cy="16" r="1.7" fill="currentColor" />
    </svg>
  );
}
