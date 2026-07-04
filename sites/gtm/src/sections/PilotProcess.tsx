import { useState } from "react";
import { Reveal } from "../components/Reveal";
import { LINKS } from "../lib/links";

type Step = {
  num: string;
  title: string;
  body: string;
  note?: string;
  icon: "plan" | "implement" | "observe" | "review";
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Plan",
    icon: "plan",
    body: "Define success metrics, security needs, and outcome-dependent pricing.",
  },
  {
    num: "02",
    title: "Implement",
    icon: "implement",
    body: "Work with Burla engineers to migrate an existing workload or deploy one from scratch.",
  },
  {
    num: "03",
    title: "Observe",
    icon: "observe",
    body: "Measure workload runtime, resource utilization, failures, and operational friction.",
  },
  {
    num: "04",
    title: "Review",
    icon: "review",
    body: "Decide whether the pilot met the agreed metrics, and what should happen next.",
    note: "We only get paid if agreed-upon improvements in runtime and efficiency are actually achieved.",
  },
];

export function PilotProcess() {
  const [active, setActive] = useState(0);

  return (
    <section id="pilot" className="section bg-surface relative overflow-hidden border-t border-line">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="text-center max-w-[760px] mx-auto mb-10 md:mb-12">
          <Reveal>
            <div className="eyebrow mb-3">How we work with you</div>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="h-section">
              A short pilot.
              <br />
              <span className="underline-accent">A real efficiency number.</span>
              <br />
              Then you decide.
            </h2>
          </Reveal>
        </div>

        {/* Desktop: horizontal interactive stepper */}
        <Reveal delay={180} className="hidden md:block">
          <div className="relative">
            <div className="absolute top-[25px] left-[10%] right-[10%] border-t border-dashed border-lineBright" />
            <div className="grid grid-cols-4 relative">
              {STEPS.map((s, i) => (
                <StepNode
                  key={s.num}
                  step={s}
                  active={i === active}
                  onSelect={() => setActive(i)}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 max-w-[620px] mx-auto text-center min-h-[52px]">
            <div key={active} className="animate-caption-fade">
              <p className="text-[15px] leading-relaxed text-inkMuted text-pretty">
                {STEPS[active].body}
              </p>
              {STEPS[active].note && (
                <p className="text-[14px] leading-relaxed text-accent font-medium text-pretty mt-2.5">
                  {STEPS[active].note}
                </p>
              )}
            </div>
          </div>
        </Reveal>

        {/* Mobile: vertical list, all steps shown */}
        <div className="md:hidden flex flex-col">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-11 w-11 shrink-0 rounded-full bg-accent text-accentInk flex items-center justify-center font-display font-semibold text-[15px]">
                  {s.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 my-1 border-l border-dashed border-lineBright" />
                )}
              </div>
              <div className="pb-8">
                <h3 className="font-display font-semibold text-ink text-[18px] tracking-tighter2 mb-2">
                  {s.title}
                </h3>
                <p className="body-base text-[14px] text-pretty">{s.body}</p>
                {s.note && (
                  <p className="text-[13.5px] leading-relaxed text-accent font-medium text-pretty mt-2">
                    {s.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Reveal delay={220}>
          <div className="mt-10 md:mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href={LINKS.bookCall}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-[15px] px-6 py-3.5"
            >
              Schedule a Pilot
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 8h10m0 0L9 4m4 4l-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StepNode({
  step,
  active,
  onSelect,
}: {
  step: Step;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center text-center px-2 focus:outline-none"
    >
      <span
        className={`relative z-10 h-[50px] w-[50px] rounded-full flex items-center justify-center font-display font-semibold text-[14px] transition-all duration-300 ${
          active
            ? "bg-accent text-accentInk shadow-[0_0_0_4px_rgba(21,94,117,0.12),0_6px_18px_-8px_rgba(21,94,117,0.5)]"
            : "bg-surface text-inkSubtle border border-line group-hover:border-lineBright group-hover:text-ink"
        }`}
      >
        {step.num}
      </span>

      <span
        className={`mt-3.5 inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-300 ${
          active ? "bg-accentSoft text-accent" : "bg-surfaceHi/70 text-inkDim group-hover:text-inkMuted"
        }`}
      >
        <StepIcon name={step.icon} />
      </span>

      <h3
        className={`mt-2.5 font-display font-semibold text-[14px] md:text-[15px] tracking-tighter2 transition-colors duration-300 ${
          active ? "text-ink" : "text-inkMuted group-hover:text-ink"
        }`}
      >
        {step.title}
      </h3>
    </button>
  );
}

function StepIcon({ name }: { name: Step["icon"] }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "plan":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "implement":
      return (
        <svg {...common} aria-hidden>
          <path d="M14.7 6.3a3.7 3.7 0 0 0-4.9 4.5l-5.6 5.6a1.6 1.6 0 0 0 2.3 2.3l5.6-5.6a3.7 3.7 0 0 0 4.5-4.9l-2.2 2.2-2-.4-.4-2 2.7-1.7z" />
        </svg>
      );
    case "observe":
      return (
        <svg {...common} aria-hidden>
          <path d="M5 20V10M12 20V5M19 20v-7" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      );
  }
}
