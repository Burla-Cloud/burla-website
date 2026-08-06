import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { WORKLOADS } from "../content";

const DocsGalaxy = lazy(() => import("./DocsGalaxy"));

const RESOURCES = [
  {
    title: "Getting Started",
    description: "Connect your cloud and run Python on your first remote cluster.",
    to: "/docs/get-started",
    icon: "book",
  },
  {
    title: "Examples",
    description: "Complete Burla workloads for data, machine learning, and science.",
    to: "/docs/examples",
    icon: "grid",
  },
  {
    title: "API Reference",
    description: "Parameters and behavior for burla.remote_parallel_map.",
    to: "/docs/api-reference",
    icon: "code",
  },
  {
    title: "CLI Reference",
    description: "Commands for logging in, deploying clusters, and opening the dashboard.",
    to: "/docs/cli-reference",
    icon: "terminal",
  },
] as const;

const FEATURED_COVERS: Record<string, string> = {
  "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s":
    "/docs-assets/more-examples/query-2-4tb-parquet-cover.webp",
  "/docs/featured-examples/airbnb-burla":
    "/docs-assets/more-examples/airbnb-burla-cover.webp",
  "/docs/featured-examples/multi-stage-genomic-pipeline":
    "/docs-assets/more-examples/multi-stage-genomic-pipeline-cover.webp",
  "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods":
    "/docs-assets/more-examples/nyc-ghost-neighborhoods-cover.webp",
  "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo":
    "/docs-assets/more-examples/gpu-embedding-demo-cover.webp",
  "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day":
    "/docs-assets/more-examples/ghcn-rainiest-day-cover.webp",
  "/docs/all-examples/data-processing-examples/world-photo-index":
    "/docs-assets/more-examples/world-photo-index-cover.webp",
  "/docs/featured-examples/arxiv-fossils":
    "/docs-assets/more-examples/arxiv-fossils-cover.webp",
  "/docs/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning":
    "/docs-assets/more-examples/parallel-hyperparameter-tuning-cover.webp",
  "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing":
    "/docs-assets/more-examples/gdal-raster-processing-cover.webp",
  "/docs/all-examples/production-data-jobs/monte-carlo-simulation":
    "/docs-assets/more-examples/monte-carlo-simulation-cover.webp",
  "/docs/featured-examples/amazon-review-distiller":
    "/docs-assets/more-examples/amazon-review-distiller-cover.webp",
};

const FEATURED_EXAMPLES = WORKLOADS.examples.map((example) => ({
  title: example.title,
  description: example.desc,
  to: example.href,
  image: FEATURED_COVERS[example.href],
}));

function ResourceIcon({ icon }: { icon: (typeof RESOURCES)[number]["icon"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.45}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon === "book" && (
        <>
          <path d="M5.5 4.5h9a2 2 0 0 1 2 2v13h-9a2 2 0 0 1-2-2z" />
          <path d="M7.5 16.5h9M9 8h4.5M9 11h4.5" />
        </>
      )}
      {icon === "grid" && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </>
      )}
      {icon === "code" && (
        <>
          <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.7 4.5l-3.4 15" />
        </>
      )}
      {icon === "terminal" && (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="m7 9 3 3-3 3M12.5 15H17" />
        </>
      )}
    </svg>
  );
}

function HeroGraphic() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-[420px] w-full max-w-[520px] overflow-hidden lg:h-[560px] lg:max-w-none"
    >
      <div className="absolute inset-[15%] rounded-full bg-accent/[0.055] blur-3xl" />
      <Suspense fallback={null}>
        <DocsGalaxy />
      </Suspense>
    </div>
  );
}

export function DocsLanding() {
  const featuredRailRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollControls = useCallback(() => {
    const rail = featuredRailRef.current;
    if (!rail) return;
    setCanScrollLeft(rail.scrollLeft > 2);
    setCanScrollRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const rail = featuredRailRef.current;
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

  const scrollFeaturedExamples = (direction: -1 | 1) => {
    const rail = featuredRailRef.current;
    const row = rail?.firstElementChild;
    const card = row?.querySelector<HTMLElement>("[data-featured-example]");
    if (!rail || !row || !card) return;

    const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: "smooth" });
  };

  return (
    <>
      <main>
        <section className="mx-auto grid w-full max-w-[1380px] items-center gap-10 px-6 pb-14 pt-32 sm:px-10 lg:grid-cols-[1.12fr_0.88fr] lg:pb-16 lg:pt-36">
          <div className="max-w-[720px]">
            <h1 className="font-display text-[clamp(42px,5vw,64px)] font-medium leading-[1.02] tracking-[-0.045em] text-ink">
              Burla Documentation
            </h1>
            <div className="mt-7 max-w-[660px] space-y-5 text-[16px] leading-[1.65] text-inkDim sm:text-[17px]">
              <p>
                Burla is an open-source compute platform for engineers and researchers who want
                to run data-intensive Python workloads without thinking about infrastructure.
              </p>
              <p>
                Scale batch processing, machine learning, and scientific workloads to thousands
                of CPUs or GPUs with one function.
              </p>
            </div>
            <Link
              to="/docs/get-started"
              replace
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-mono text-[13px] font-medium text-void transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-ice"
            >
              Get Started
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="hidden lg:block">
            <HeroGraphic />
          </div>
        </section>

        <section
          aria-label="Documentation sections"
          className="mx-auto grid w-[calc(100%-3rem)] max-w-[1300px] overflow-hidden rounded-lg border-l border-t border-white/[0.16] sm:w-[calc(100%-5rem)] sm:grid-cols-2 xl:grid-cols-4"
        >
          {RESOURCES.map((resource) => (
            <Link
              key={resource.title}
              to={resource.to}
              replace
              className="group min-h-[230px] border-b border-r border-white/[0.16] bg-white/[0.012] p-7 transition-colors hover:bg-white/[0.045] sm:p-8"
            >
              <span className="text-accent transition-transform duration-200 group-hover:-translate-y-0.5">
                <ResourceIcon icon={resource.icon} />
              </span>
              <h2 className="mt-8 font-display text-[20px] font-medium tracking-[-0.02em] text-ink transition-colors group-hover:text-accent">
                {resource.title}
              </h2>
              <p className="mt-5 max-w-[27ch] text-[14px] leading-[1.55] text-inkFaint">
                {resource.description}
              </p>
            </Link>
          ))}
        </section>

        <section className="pt-16 lg:pt-20">
          <div className="mx-auto mb-7 flex w-full max-w-[1380px] items-end justify-between gap-3 px-6 sm:px-10">
            <h2 className="font-display text-[clamp(30px,3vw,40px)] font-medium tracking-[-0.035em] text-ink">
              Featured Examples
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                to="/docs/examples"
                replace
                className="mr-2 hidden min-h-11 items-center font-mono text-[12px] text-inkDim underline decoration-white/25 underline-offset-4 transition-colors hover:text-accent sm:inline-flex"
              >
                All examples&nbsp; →
              </Link>
              <button
                type="button"
                aria-label="Scroll featured examples left"
                disabled={!canScrollLeft}
                onClick={() => scrollFeaturedExamples(-1)}
                className="inline-flex size-11 items-center justify-center text-inkDim transition-[color,opacity,transform] hover:-translate-x-0.5 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Scroll featured examples right"
                disabled={!canScrollRight}
                onClick={() => scrollFeaturedExamples(1)}
                className="inline-flex size-11 items-center justify-center text-inkDim transition-[color,opacity,transform] hover:translate-x-0.5 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={featuredRailRef} className="docs-featured-rail">
            <div className="docs-featured-row flex w-max gap-[10px]">
              {FEATURED_EXAMPLES.map((example) => (
                <Link
                  key={example.to}
                  to={example.to}
                  replace
                  data-featured-example
                  className="group relative h-[380px] w-[min(82vw,316px)] shrink-0 overflow-hidden rounded-lg border border-white/[0.12] bg-card"
                >
                  <img
                    src={example.image}
                    alt=""
                    className="absolute inset-0 h-full w-full scale-[1.08] object-cover transition-transform duration-300 ease-out group-hover:scale-100"
                    loading="lazy"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,13,0.02)_18%,rgba(3,8,13,0.34)_48%,rgba(3,8,13,0.96)_100%)]"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex min-h-[58%] flex-col justify-end p-5">
                    <strong className="font-display text-[19px] font-medium leading-[1.18] tracking-[-0.02em] text-ink">
                      {example.title}
                    </strong>
                    <span className="mt-3 text-[13px] leading-[1.5] text-inkDim">
                      {example.description}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="mt-4 size-5 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17 17 7M7 7h10v10" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1380px] px-6 sm:hidden">
            <Link
              to="/docs/examples"
              replace
              className="mt-4 inline-flex min-h-11 items-center font-mono text-[12px] text-inkDim underline decoration-white/25 underline-offset-4"
            >
              All examples&nbsp; →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
