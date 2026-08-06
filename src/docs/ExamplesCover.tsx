import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExampleIcon } from "../components/ExampleIcon";
import { ALL_EXAMPLE_CATEGORIES } from "./examples";
import type {
  ExampleCard as ExampleCardData,
  ExampleCategory as ExampleCategoryData,
} from "./examples";

const COLLAPSED_EXAMPLE_COUNT = 3;
const DISCLOSURE_EASE = [0.16, 1, 0.3, 1] as const;

function ExampleCard({ example }: { example: ExampleCardData }) {
  return (
    <Link
      to={example.route}
      className="group flex min-h-[180px] flex-col rounded-xl border border-hairline bg-card/60 p-5 transition-[border-color,background-color] duration-200 hover:border-accent/60 hover:bg-card/80"
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

function ExampleCategory({ category }: { category: ExampleCategoryData }) {
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const disclosureId = useId();
  const headingId = `examples-${category.legacyRoute.split("/").at(-1)}`;
  const initialExamples = category.examples.slice(0, COLLAPSED_EXAMPLE_COUNT);
  const additionalExamples = category.examples.slice(COLLAPSED_EXAMPLE_COUNT);

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-5">
        <h2
          id={headingId}
          className="font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink"
        >
          {category.label}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-inkDim">
          {category.description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 min-[1280px]:grid-cols-3">
        {initialExamples.map((example) => (
          <ExampleCard key={example.route} example={example} />
        ))}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={disclosureId}
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.28,
              ease: DISCLOSURE_EASE,
            }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 pt-4 sm:grid-cols-2 min-[1280px]:grid-cols-3">
              {additionalExamples.map((example) => (
                <ExampleCard key={example.route} example={example} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {additionalExamples.length > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={disclosureId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md px-1 font-mono text-[12px] font-medium text-accent transition-colors hover:text-ice"
        >
          {expanded ? "Show fewer" : `Show all ${category.examples.length} examples`}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={`size-3.5 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      )}
    </section>
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
        {ALL_EXAMPLE_CATEGORIES.map((category) => (
          <ExampleCategory key={category.label} category={category} />
        ))}
      </div>
    </div>
  );
}
