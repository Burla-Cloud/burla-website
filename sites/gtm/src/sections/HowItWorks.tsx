import { useState } from "react";
import { Reveal } from "../components/Reveal";

const HIW_CODE = `return_values = remote_parallel_map(my_function, my_inputs)`;

type Point = { icon: "stdout" | "error" | "package" | "bolt"; title: string; body: string };

const POINTS: Point[] = [
  {
    icon: "stdout",
    title: "Prints locally",
    body: "Anything it prints appears locally (and inside the dashboard).",
  },
  {
    icon: "error",
    title: "Real tracebacks",
    body: "Any exceptions are thrown locally.",
  },
  {
    icon: "package",
    title: "Auto package sync",
    body: "Any packages or local modules are (very quickly) cloned on all remote machines.",
  },
  {
    icon: "bolt",
    title: "Sub-second starts",
    body: "Code starts running in under one second! Even with millions of inputs, or thousands of machines.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="section bg-cream text-creamInk relative overflow-hidden">
      <div className="absolute inset-0 grid-bg-cream opacity-40 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="max-w-[820px]">
          <Reveal>
            <div className="eyebrow text-accentBright mb-3">How it works</div>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="h-section-cream text-balance">
              Running code in the cloud shouldn't feel any different from{" "}
              <span className="underline-accent-cream">running code locally</span>.
            </h2>
          </Reveal>
        </div>

        <Reveal delay={140} y={16}>
          <div className="mt-7 max-w-[680px]">
            <OneLiner />
          </div>
        </Reveal>

        <Reveal delay={180} y={12}>
          <p className="text-[14px] md:text-[15px] text-creamMuted mt-6 max-w-[680px] text-pretty">
            When a Python function is run using{" "}
            <span className="mono text-accentBright">remote_parallel_map</span>,
            it runs in the cloud but:
          </p>
        </Reveal>

        <Reveal delay={200} y={16}>
          <div className="mt-12 border-t border-creamLine grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x divide-creamLine">
            {POINTS.map((p) => (
              <div
                key={p.title}
                className="py-6 lg:py-7 lg:px-7 first:lg:pl-0 last:lg:pr-0"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <PointIcon name={p.icon} />
                  <h3 className="font-display font-semibold text-creamInk text-[15px] tracking-tighter2">
                    {p.title}
                  </h3>
                </div>
                <p className="text-[13.5px] leading-relaxed text-creamMuted text-pretty">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={420}>
          <p className="text-[14px] text-creamSubtle mt-10 max-w-[680px] text-pretty">
            Burla automatically manages it's own pool of VMs underneath to
            maximize speed and efficiency. You can manually add &amp; remove
            machines from the pool, or let the platform react live to requests.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function OneLiner() {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(HIW_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-creamLine bg-[#0B1014] pl-4 pr-2.5 py-3.5 shadow-cream">
      <span className="select-none text-accentBright mono text-[14px] leading-none">
        ›
      </span>
      <code className="mono flex-1 min-w-0 overflow-x-auto whitespace-pre text-[13.5px] md:text-[14.5px] text-creamInk">
        <span className="text-creamMuted">return_values</span>
        <span className="text-creamSubtle"> = </span>
        <span className="text-accentBright font-medium">remote_parallel_map</span>
        <span className="text-creamSubtle">(</span>
        <span className="text-creamInk">my_function, my_inputs</span>
        <span className="text-creamSubtle">)</span>
      </code>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy code"
        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-creamSubtle hover:text-creamInk hover:bg-creamLine transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function PointIcon({ name }: { name: Point["icon"] }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#22D3EE",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0",
  };
  if (name === "stdout") {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9l3 3-3 3M13 15h4" />
      </svg>
    );
  }
  if (name === "error") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3l9 16H3z" />
        <path d="M12 10v4M12 17.5v.01" />
      </svg>
    );
  }
  if (name === "package") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
    </svg>
  );
}
