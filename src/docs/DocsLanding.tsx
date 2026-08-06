import { Link } from "react-router-dom";
import { BrandLockup } from "../components/BrandLockup";

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

const FEATURED_EXAMPLES = [
  {
    title: "Query 2.4TB of Parquet in 76s",
    description: "Run one DuckDB query over 1,000 files on a 10,000-CPU cluster.",
    to: "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s",
    image: "/docs-assets/more-examples/query-2-4tb-parquet-cover.webp",
  },
  {
    title: "Test Airbnb hypotheses at public-data scale",
    description: "CLIP-score 1.7M listing photos across 119 cities.",
    to: "/docs/featured-examples/airbnb-burla",
    image: "/docs-assets/more-examples/airbnb-burla-cover.webp",
  },
  {
    title: "Rank 572M Amazon reviews",
    description: "Stream 275GB of reviews and keep the most interesting results.",
    to: "/docs/featured-examples/amazon-review-distiller",
    image: "/docs-assets/more-examples/amazon-review-distiller-cover.webp",
  },
  {
    title: "Cluster 2.7M arXiv abstracts",
    description: "Embed the full corpus and trace research topics through time.",
    to: "/docs/featured-examples/arxiv-fossils",
    image: "/docs-assets/more-examples/arxiv-fossils-cover.webp",
  },
  {
    title: "Run a genomic alignment pipeline",
    description: "Process 360 Illumina samples with native tools in one run.",
    to: "/docs/featured-examples/multi-stage-genomic-pipeline",
    image: "/docs-assets/more-examples/multi-stage-genomic-pipeline-cover.webp",
  },
] as const;

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
          <rect x="4" y="5" width="6" height="6" rx="1" />
          <rect x="14" y="3" width="6" height="8" rx="1" />
          <rect x="4" y="15" width="6" height="6" rx="1" />
          <rect x="14" y="15" width="6" height="6" rx="1" />
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
    <svg
      viewBox="0 0 420 300"
      aria-hidden="true"
      className="mx-auto w-full max-w-[430px]"
      fill="none"
    >
      <path d="M78 40h244v214H78z" stroke="rgba(126,203,221,0.35)" />
      <path d="M110 70h178v152H110z" stroke="rgba(126,203,221,0.28)" />
      <path d="m78 40 32 30M322 40l-34 30M322 254l-34-32" stroke="rgba(126,203,221,0.28)" />
      <path d="M78 168h82v86H78z" fill="rgba(126,203,221,0.95)" />
      <path d="M98 188h42v46H98z" fill="#0a141e" />
      <path d="m160 168 128-98M140 188l148-118" stroke="rgba(126,203,221,0.5)" />
      <path d="m206 130 10-1-2 10" stroke="rgba(126,203,221,0.55)" />
    </svg>
  );
}

export function DocsLanding() {
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

        <section className="mx-auto w-full max-w-[1380px] px-6 pb-24 pt-16 sm:px-10 lg:pb-28 lg:pt-20">
          <div className="mb-7 flex items-end justify-between gap-6">
            <h2 className="font-display text-[clamp(30px,3vw,40px)] font-medium tracking-[-0.035em] text-ink">
              Featured Examples
            </h2>
            <Link
              to="/docs/examples"
              replace
              className="hidden min-h-11 items-center font-mono text-[12px] text-inkDim underline decoration-white/25 underline-offset-4 transition-colors hover:text-accent sm:inline-flex"
            >
              All examples&nbsp; →
            </Link>
          </div>

          <div className="-mr-6 overflow-x-auto pb-4 pr-6 [scrollbar-color:rgba(126,203,221,0.28)_transparent] [scrollbar-width:thin] sm:-mr-10 sm:pr-10">
            <div className="flex w-max gap-3">
              {FEATURED_EXAMPLES.map((example) => (
                <Link
                  key={example.to}
                  to={example.to}
                  replace
                  className="group relative aspect-[4/5] w-[min(75vw,250px)] shrink-0 overflow-hidden rounded-md border border-white/[0.12] bg-card"
                >
                  <img
                    src={example.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
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
                    <span
                      aria-hidden="true"
                      className="mt-4 text-[16px] text-accent transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <Link
            to="/docs/examples"
            replace
            className="mt-4 inline-flex min-h-11 items-center font-mono text-[12px] text-inkDim underline decoration-white/25 underline-offset-4 sm:hidden"
          >
            All examples&nbsp; →
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.1]">
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="flex items-center gap-4">
            <BrandLockup />
            <span className="font-mono text-[10px] text-inkFaint">© Burla 2026</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Docs footer">
            <Link
              to="/docs/get-started"
              replace
              className="inline-flex min-h-11 items-center text-[12px] text-inkFaint transition-colors hover:text-accent"
            >
              Getting Started
            </Link>
            <Link
              to="/docs/examples"
              replace
              className="inline-flex min-h-11 items-center text-[12px] text-inkFaint transition-colors hover:text-accent"
            >
              Examples
            </Link>
            <a
              href="https://github.com/Burla-Cloud/burla"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-[12px] text-inkFaint transition-colors hover:text-accent"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
