import { Link } from "react-router-dom";
import { ExampleIcon } from "../components/ExampleIcon";
import { BASICS_CATEGORY, EXAMPLE_CATEGORIES } from "./examples";
import type { ExampleCard as ExampleCardData } from "./examples";

function ExampleCard({ example, className = "" }: { example: ExampleCardData; className?: string }) {
  return (
    <Link
      to={example.route}
      className={`group flex min-h-[180px] flex-col rounded-xl border border-hairline bg-card/60 p-5 transition-[border-color,background-color] duration-200 hover:border-accent/60 hover:bg-card/80 ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-accent/70 transition-colors duration-200 group-hover:text-accent">
          <ExampleIcon icon={example.icon} />
        </span>
        <span
          aria-hidden="true"
          className="text-inkFaint transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
        >
          →
        </span>
      </div>
      <h3 className="mt-5 font-display text-[17px] font-medium leading-[1.28] tracking-[-0.01em] text-ink">
        {example.title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-inkDim">{example.description}</p>
    </Link>
  );
}

function CoverHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="max-w-[680px]">
      <h1 className="font-display text-[clamp(34px,3.4vw,42px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
        {title}
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-inkDim">{description}</p>
    </header>
  );
}

export function ExamplesCover() {
  return (
    <div className="pb-12">
      <CoverHeader
        title="Examples"
        description="Complete Burla workloads, organized by the kind of problem they solve."
      />

      <div className="mt-12 space-y-12">
        {EXAMPLE_CATEGORIES.map((category) => (
          <section key={category.label} aria-labelledby={`examples-${category.legacyRoute.split("/").at(-1)}`}>
            <div className="mb-5">
              <h2
                id={`examples-${category.legacyRoute.split("/").at(-1)}`}
                className="font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink"
              >
                {category.label}
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-inkDim">
                {category.description}
              </p>
            </div>

            <div className="overflow-x-auto pb-3 [scrollbar-color:rgba(126,203,221,0.28)_transparent] [scrollbar-width:thin]">
              <div className="flex w-max gap-4">
                {category.examples.map((example) => (
                  <ExampleCard
                    key={example.route}
                    example={example}
                    className="w-[min(82vw,320px)] shrink-0 snap-start"
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function BasicsCover() {
  return (
    <div className="pb-12">
      <CoverHeader
        title="Basics"
        description="Start with the reusable patterns behind most Burla jobs."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 min-[1240px]:grid-cols-3">
        {BASICS_CATEGORY.examples.map((example) => (
          <ExampleCard key={example.route} example={example} />
        ))}
      </div>
    </div>
  );
}
