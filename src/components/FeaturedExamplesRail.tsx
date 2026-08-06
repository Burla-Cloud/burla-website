import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExampleIcon3D } from "./ExampleIcon3D";
import { markFor } from "./exampleMarks";
import { WORKLOADS } from "../content";

const FEATURED_EXAMPLES = WORKLOADS.examples.map((example) => ({
  title: example.title,
  description: example.desc,
  to: example.href,
  icon: markFor(example.href),
}));

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: -1 | 1;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Scroll featured examples ${direction === -1 ? "left" : "right"}`}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full border border-white/[0.16] bg-card/70 text-ink transition-[color,border-color,background-color,opacity] hover:border-accent/60 hover:bg-card hover:text-accent disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === -1 ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}

/**
 * The featured-examples slider: a full-bleed rail of wireframe example cards
 * that fades out at the page's left edge and ghosts in through the right
 * margin. The page provides its own header content; this component appends
 * the scroll arrows to it and renders the rail below.
 */
export function FeaturedExamplesRail({
  align,
  replaceLinks = false,
  headerLeft,
  headerRight,
}: {
  /** Which page container the first card should align with. */
  align: "docs" | "site";
  replaceLinks?: boolean;
  headerLeft: ReactNode;
  headerRight?: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollControls = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanScrollLeft(rail.scrollLeft > 2);
    setCanScrollRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const resizeObserver = new ResizeObserver(updateScrollControls);
    const frame = requestAnimationFrame(updateScrollControls);
    resizeObserver.observe(rail);
    rail.addEventListener("scroll", updateScrollControls, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      rail.removeEventListener("scroll", updateScrollControls);
    };
  }, [updateScrollControls]);

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    const row = rail?.firstElementChild;
    const card = row?.querySelector<HTMLElement>("[data-featured-example]");
    if (!rail || !row || !card) return;

    const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: "smooth" });
  };

  return (
    <>
      <div
        className={`mx-auto flex w-full flex-wrap items-end justify-between gap-x-10 gap-y-6 px-6 sm:px-10 ${
          align === "docs" ? "mb-7 max-w-[1380px]" : "mb-12 max-w-[1200px]"
        }`}
      >
        {headerLeft}
        <div className="flex shrink-0 items-center gap-3">
          {headerRight}
          <div className="flex items-center gap-2">
            <ArrowButton direction={-1} disabled={!canScrollLeft} onClick={() => scroll(-1)} />
            <ArrowButton direction={1} disabled={!canScrollRight} onClick={() => scroll(1)} />
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        className={`docs-featured-rail ${align === "site" ? "docs-featured-rail--site" : ""}`}
      >
        <div className="docs-featured-row flex w-max gap-4 py-1">
          {FEATURED_EXAMPLES.map((example) => (
            <Link
              key={example.to}
              to={example.to}
              replace={replaceLinks}
              data-featured-example
              className="group relative flex min-h-[330px] w-[min(82vw,300px)] shrink-0 flex-col overflow-hidden rounded-xl border border-hairline bg-card/60 p-5 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-card/80"
            >
              <span
                aria-hidden="true"
                className="absolute right-5 top-5 z-10 text-inkFaint transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
              >
                →
              </span>
              <div className="-mx-1 -mt-1">
                <ExampleIcon3D
                  icon={example.icon}
                  reducedMotion={reducedMotion}
                  seed={example.to}
                />
              </div>
              <h3 className="mt-3 font-display text-[17px] font-medium leading-[1.28] tracking-[-0.01em] text-ink">
                {example.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-inkDim">
                {example.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
