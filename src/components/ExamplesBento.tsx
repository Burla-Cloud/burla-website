import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ExampleIcon3D } from "./ExampleIcon3D";
import { markFor } from "./exampleMarks";
import { DOMAIN_COLORS, WORKLOADS } from "../content";
import type { ExampleEntry } from "../content";

const FEATURED = WORKLOADS.examples.filter((example) => example.featured);
// Seven, so that with the browse-all card last the grid is two rows of four.
const REST = WORKLOADS.examples.filter(
  (example) => !example.featured && !example.hideOnHome,
);

function DomainTag({ domain }: { domain: string }) {
  const rgb = DOMAIN_COLORS[domain] ?? DOMAIN_COLORS.Data;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.1em]"
      style={{
        color: `rgb(${rgb})`,
        backgroundColor: `rgb(${rgb} / 0.1)`,
        boxShadow: `inset 0 0 0 1px rgb(${rgb} / 0.22)`,
      }}
    >
      {domain}
    </span>
  );
}

function ArrowGlyph({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`text-inkFaint transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent ${className}`}
    >
      →
    </span>
  );
}

/**
 * Large tile. The wireframe mark runs at full size here, which is what buys the
 * three headline workloads their visual weight over the seven below.
 */
function FeaturedTile({
  example,
  reducedMotion,
  replaceLinks,
}: {
  example: ExampleEntry;
  reducedMotion: boolean;
  replaceLinks: boolean;
}) {
  return (
    <Link
      to={example.href}
      replace={replaceLinks}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-card/60 p-5 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-4">
        <DomainTag domain={example.domain} />
        <ArrowGlyph className="relative z-10" />
      </div>

      <div className="example-mark-featured -mx-2 mt-0.5">
        <ExampleIcon3D
          icon={markFor(example.href)}
          reducedMotion={reducedMotion}
          seed={example.href}
        />
      </div>

      <p className="mt-3 font-display text-[36px] font-medium leading-none tracking-[-0.03em] text-ink transition-colors duration-200 group-hover:text-accent">
        {example.metric}
      </p>
      <p className="mt-2 text-[15px] font-medium leading-[1.35] text-ink">
        {example.metricLabel}
      </p>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-inkDim">{example.desc}</p>
    </Link>
  );
}

/** Small tile. Same anatomy at a smaller mark size, four to a row. */
function GridTile({
  example,
  reducedMotion,
  replaceLinks,
}: {
  example: ExampleEntry;
  reducedMotion: boolean;
  replaceLinks: boolean;
}) {
  return (
    <Link
      to={example.href}
      replace={replaceLinks}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-card/60 p-5 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-3">
        <DomainTag domain={example.domain} />
        <ArrowGlyph className="relative z-10" />
      </div>

      <div className="example-mark-compact -mx-2 mt-0.5">
        <ExampleIcon3D
          icon={markFor(example.href)}
          reducedMotion={reducedMotion}
          seed={example.href}
        />
      </div>

      <p className="mt-3 font-display text-[26px] font-medium leading-none tracking-[-0.03em] text-ink transition-colors duration-200 group-hover:text-accent">
        {example.metric}
      </p>
      <p className="mt-2 text-[13.5px] leading-[1.45] text-inkDim">
        {example.metricLabel}
      </p>
    </Link>
  );
}

/**
 * The examples section: three headline workloads, then seven more and a link to
 * the full set, as two rows of four. Everything sits inside the page container,
 * so nothing is hidden behind a scroll.
 */
export function ExamplesBento({
  replaceLinks = false,
  header,
}: {
  replaceLinks?: boolean;
  header: ReactNode;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <>
      <div className="mx-auto mb-12 w-full max-w-[1200px] px-6 sm:px-10">
        {header}
      </div>

      <div
        data-featured-grid
        className="mx-auto mb-4 grid w-full max-w-[1200px] gap-4 px-6 sm:px-10 md:grid-cols-3"
      >
        {FEATURED.map((example) => (
          <FeaturedTile
            key={example.href}
            example={example}
            reducedMotion={reducedMotion}
            replaceLinks={replaceLinks}
          />
        ))}
      </div>

      <div
        data-examples-grid
        className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-4 px-6 sm:px-10 lg:grid-cols-4"
      >
        {REST.map((example) => (
          <GridTile
            key={example.href}
            example={example}
            reducedMotion={reducedMotion}
            replaceLinks={replaceLinks}
          />
        ))}
        {/* Eighth cell, bottom right: where the other examples live. */}
        <Link
          to={WORKLOADS.moreHref}
          replace={replaceLinks}
          className="group relative flex flex-col justify-end rounded-xl border border-dashed border-hairline bg-transparent p-5 transition-[border-color,background-color] duration-200 hover:border-accent/60 hover:bg-card/40"
        >
          <p className="font-display text-[20px] font-medium leading-[1.2] tracking-[-0.02em] text-ink transition-colors duration-200 group-hover:text-accent">
            {WORKLOADS.moreLabel}
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.45] text-inkDim">
            Every workload, grouped by field.
          </p>
          <ArrowGlyph className="mt-4 text-[18px]" />
        </Link>
      </div>
    </>
  );
}
