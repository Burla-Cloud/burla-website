import { Reveal } from "../components/Reveal";
import { LINKS } from "../lib/links";

const DIMENSIONS = [
  {
    title: "Compute efficiency",
    body: "How much more useful work each machine-hour does once the cluster sizes itself to the job.",
    icon: "efficiency",
  },
  {
    title: "Developer velocity",
    body: "How much faster your team ships, with no cluster sizing, batching, or infra config to manage.",
    icon: "velocity",
  },
  {
    title: "Pipeline runtime",
    body: "How much sooner your largest pipelines finish, measured in wall-clock time on your own workloads.",
    icon: "runtime",
  },
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="section bg-band">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-12 md:mb-14 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-3">Pricing</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Custom pricing,{" "}
                <span className="underline-accent">tied to the outcome</span>.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead text-pretty">
                You pay for agreed-upon improvements. Together we set the
                targets during planning, then price the pilot on what Burla
                actually delivers across three dimensions. If we miss the mark,
                it&rsquo;s free of charge.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {DIMENSIONS.map((d, i) => (
            <Reveal key={d.title} delay={180 + i * 90} y={16}>
              <div className="surface p-7 h-full flex flex-col">
                <DimIcon name={d.icon} />
                <h3 className="h-block mt-5 mb-2.5">{d.title}</h3>
                <p className="body-base text-pretty">{d.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={420}>
          <div className="mt-10 md:mt-12 flex justify-center">
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

function DimIcon({ name }: { name: string }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#155E75",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "efficiency") {
    return (
      <svg {...common} aria-hidden>
        <path d="M3 20h18" />
        <rect x="5" y="12" width="3" height="6" />
        <rect x="10.5" y="8" width="3" height="10" />
        <rect x="16" y="4" width="3" height="14" />
      </svg>
    );
  }
  if (name === "velocity") {
    return (
      <svg {...common} aria-hidden>
        <path d="M13 3l-2 9h6l-9 9 2-9H4l9-9z" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9v4l2.5 2M9 3h6" />
    </svg>
  );
}
