// Every word on the page lives here so copy is trivial to iterate on.
// Numbers are the agreed set: 1,000 VMs in ~1s, thousands of CPUs per job,
// and 20-50% less compute.

export const LINKS = {
  docs: "/docs",
  blog: "/blog",
  getStarted: "/docs/get-started",
  github: "https://github.com/Burla-Cloud/burla",
  email: "mailto:jake@burla.dev",
};

export const PIP_COMMAND = "pip install burla";

export const NAV = {
  wordmark: "Burla",
  links: [
    { label: "Docs", href: LINKS.docs },
    { label: "Blog", href: LINKS.blog },
    { label: "GitHub", href: LINKS.github },
  ],
  login: { label: "Login", href: "https://login.burla.dev/" },
};

// ---------------------------------------------------------------------------
// Act I · the hero
// ---------------------------------------------------------------------------

export const HERO = {
  statement: ["The simplest way to process", "massive", "amounts of data."],
  sub: "Burla is the world's simplest cluster-compute software.\nEasily scale ML-pipelines, AI inference, batch processing, and more.",
};

// ---------------------------------------------------------------------------
// Act II · what it is, how it works
// ---------------------------------------------------------------------------

export const WHAT = {
  heading: ["The open-source compute platform for", "big data"],
  features: {
    api: {
      title: "Single function API.",
      copy: "Define hardware next to the code that needs it. With Burla, running code in the cloud feels the same as coding on your laptop.",
    },
    speed: {
      title: "Scale to 1,000 CPUs in one second.",
      copy: "Develop at scale with an instant feedback loop. Burla can deploy any Python function to thousands of CPUs in your cloud in under one second.",
    },
    agents: {
      title: "Built for AI coding agents.",
      copy: "Give your agent the tools to scale any workload. With Burla, agents finish work faster and use 20-50% less total compute for the same work.",
    },
    observability: {
      title: "Built-in observability.",
      copy: "Monitor live progress, worker activity, logs, and errors from your phone. Burla makes it trivial to launch and monitor large background jobs.",
    },
  },
};

// ---------------------------------------------------------------------------
// Act III · workloads
// ---------------------------------------------------------------------------

const EXAMPLES = {
  allExamples: "/docs/examples",
};

// One muted hue per field, used to tint the cycling words in the section
// heading. Values are space-separated RGB channels (same convention as the
// theme variables in index.css). All hues sit near the accent's lightness,
// low saturation, so the cycle reads varied without turning loud.
export const DOMAIN_COLORS: Record<string, string> = {
  ML: "126 203 221", // cyan, the page accent family
  Biotech: "143 211 166", // soft green
  Geospatial: "217 182 120", // amber
  Finance: "172 152 218", // violet
  Data: "142 168 196", // steel, the catch-all for plain data work
};

export type ExampleEntry = {
  icon: string;
  /** The headline figure, set large. Not always a number. */
  metric: string;
  /** What the figure counts, set as the line beneath it. */
  metricLabel: string;
  /** Key into DOMAIN_COLORS, drives the tag tint. */
  domain: string;
  /** The three that get a large tile at the top of the home page. */
  featured?: boolean;
  /** Kept out of the home grid so it fills whole rows. Still in the docs. */
  hideOnHome?: boolean;
  title: string;
  desc: string;
  href: string;
};

export const WORKLOADS = {
  heading: ["Built to scale", "any kind of data work."],
  // Fields the accent line cycles through, once, before settling on
  // heading[1]. Each word is tinted with its domain's chip color.
  headingCycle: [
    { text: "biotech.", domain: "Biotech" },
    { text: "geospatial.", domain: "Geospatial" },
    { text: "finance.", domain: "Finance" },
    { text: "machine learning.", domain: "ML" },
  ],
  moreLabel: "Browse all examples",
  moreHref: EXAMPLES.allExamples,
  // Twelve real examples. Every card links to a page in the on-site docs
  // (/docs); `icon` picks the inline mark drawn by ExampleIcon3D.
  //
  // `metric` and `metricLabel` are the same claim as `title`, split so the
  // number can be set as the headline and the subject as the line under it.
  // Nothing here is estimated: every figure already appears in the title or
  // desc of its own example. Two workloads have no countable headline figure,
  // so their metric slot carries the strongest technical token instead.
  //
  // `featured` marks the three that earn a large tile at the top of the home
  // page, in this array's order. Their metric carries its own unit, since a
  // bare number at that size reads as a score rather than a quantity.
  //
  // `hideOnHome` trims the home grid to a whole number of rows. Hidden examples
  // still appear in the docs rail and on the examples page.
  examples: [
    {
      icon: "parquet",
      metric: "2.4TB",
      metricLabel: "of Parquet, queried in 76s",
      domain: "Data",
      featured: true,
      title: "Query 2.4TB of Parquet in 76s",
      desc: "One DuckDB query over 1,000 files on a 10,000-CPU cluster.",
      href: "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s",
    },
    {
      icon: "sliders",
      metric: "1,000 CPUs",
      metricLabel: "tuning XGBoost in parallel",
      domain: "ML",
      featured: true,
      title: "Tune XGBoost on 1,000 CPUs",
      desc: "Train dozens of models at once and keep the best AUC.",
      href: "/docs/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning",
    },
    {
      icon: "helix",
      metric: "360 genomes",
      metricLabel: "aligned in parallel",
      domain: "Biotech",
      featured: true,
      title: "Multi-stage genomic pipeline",
      desc: "Align 360 raw Illumina samples and convert them to PGEN in one run.",
      href: "/docs/featured-examples/multi-stage-genomic-pipeline",
    },
    {
      icon: "house",
      metric: "1.7M",
      metricLabel: "Airbnbs ranked by TV location",
      domain: "ML",
      title: "Rank 1.7M Airbnbs by TV location",
      desc: "CLIP-score every listing photo across 119 cities, then validate.",
      href: "/docs/featured-examples/airbnb-burla",
    },
    {
      icon: "route",
      metric: "2.76B",
      metricLabel: "NYC taxi trips scanned",
      domain: "Data",
      title: "Scan 2.76B NYC taxi trips",
      desc: "Two decades of cab data reduced to a zone-by-month matrix.",
      href: "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods",
    },
    {
      icon: "gpu",
      metric: "A100s",
      metricLabel: "embedding Wikipedia with bge-large",
      domain: "ML",
      hideOnHome: true,
      title: "Embed Wikipedia articles on GPUs",
      desc: "CPU workers stream text while A100 workers embed with bge-large.",
      href: "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo",
    },
    {
      icon: "raindrop",
      metric: "3.18B",
      metricLabel: "rain records reduced to one answer",
      domain: "Geospatial",
      title: "Find NOAA's rainiest day",
      desc: "Reduce 3.18B daily rain records down to a single global answer.",
      href: "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day",
    },
    {
      icon: "pin",
      metric: "9.5M",
      metricLabel: "geotagged photos reverse-geocoded",
      domain: "Geospatial",
      title: "Map 9.5M geotagged photos",
      desc: "Reverse-geocode the Flickr YFCC100M archive into a world index.",
      href: "/docs/all-examples/data-processing-examples/world-photo-index",
    },
    {
      icon: "spiral",
      metric: "2.7M",
      metricLabel: "arXiv abstracts clustered by topic",
      domain: "ML",
      title: "Cluster 2.7M arXiv abstracts",
      desc: "Embed a fixed snapshot in parallel, cluster it by topic, and find its semantic outlier.",
      href: "/docs/featured-examples/arxiv-fossils",
    },
    {
      icon: "raster",
      metric: "2,000",
      metricLabel: "Sentinel-2 tiles turned into NDVI",
      domain: "Geospatial",
      hideOnHome: true,
      title: "NDVI over 2,000 Sentinel-2 tiles",
      desc: "Compute vegetation indexes with GDAL, one GeoTIFF per tile.",
      href: "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing",
    },
    {
      icon: "dice",
      metric: "1B",
      metricLabel: "option paths simulated",
      domain: "Finance",
      title: "Run 1B option simulations",
      desc: "Monte Carlo paths split across workers for one tight error bar.",
      href: "/docs/all-examples/production-data-jobs/monte-carlo-simulation",
    },
    {
      icon: "star",
      metric: "572M",
      metricLabel: "Amazon reviews ranked from 275GB",
      domain: "Data",
      title: "Rank 572M Amazon reviews",
      desc: "Stream 275GB of JSONL and keep the top K, deterministically.",
      href: "/docs/featured-examples/amazon-review-distiller",
    },
  ] as ExampleEntry[],
};

// ---------------------------------------------------------------------------
// Act III.5 · develop locally, run remotely
// ---------------------------------------------------------------------------

export const LAPTOP = {
  // Signature emphasis lands on the payoff, "1,000 CPUs or GPUs."
  heading: ["Develop like your laptop has", "1,000 CPUs or GPUs."],
  // The notebook window on the left of the schematic. Code tokens live in
  // Laptop.tsx because each one carries its own syntax color.
  window: {
    title: "experiment.ipynb",
    prompt: "In [2]:",
    output: [
      "[worker-07] trial complete · auc=0.947",
      "[worker-12] trial complete · auc=0.951",
    ],
    done: "1,024 trials complete",
    // Second cell: reading the returned results back, In/Out prompt pair.
    prompt2: "In [3]:",
    outPrompt: "Out[3]:",
    result: "0.9512",
  },
  // The fleet on the right. Eight named machines stand in for the whole pool;
  // the caption and monochrome cloud marks below name where the pool can
  // live. Logo paths live in Laptop.tsx, in this order.
  fleet: {
    workers: [
      "worker-01",
      "worker-02",
      "worker-03",
      "worker-04",
      "worker-05",
      "worker-06",
      "worker-07",
      "worker-08",
    ],
    cpus: "64 vCPU",
    clouds: ["Amazon Web Services", "Google Cloud", "Microsoft Azure"],
  },
  // Three columns below the schematic; `icon` keys the glyph drawn in
  // Laptop.tsx.
  stats: [
    {
      icon: "replicate",
      label: "Automatic environment replication",
      copy: "Your Python environment is automatically cloned on all remote workers in seconds.",
    },
    {
      icon: "stream",
      label: "Local feel",
      copy: "Print statements, exceptions, and return values appear locally on your laptop.",
    },
    {
      icon: "bolt",
      label: "Fast developer cycle",
      copy: "Code deploys in under 1 second, even with thousands of CPUs or GPUs.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Act IV · features
// ---------------------------------------------------------------------------

export const FEATURES = {
  // Signature emphasis lands on "Maximum efficiency" (the outcome).
  headline: ["Maximum efficiency,", "minimum complexity."],
  lede: "Adaptive concurrency keeps VM utilization close to 90%, so the same workload needs 20-50% less compute than Ray, Dask, Airflow, or AWS Batch. Burla runs on raw VMs in your cloud, without managed-platform markup.",
  blog: {
    label: "How adaptive concurrency works",
    href: LINKS.blog,
  },
  compare: {
    title: "Relative workload cost",
    // Self-hosted Ray/Dask is the 1x baseline; bar lengths track `value`.
    // Burla is always the last (highlighted) bar.
    bars: [
      { name: "Managed platforms (Modal, Anyscale)", amount: "2-3x", value: 2.5 },
      { name: "Self-hosted (Ray, Dask, Airflow, AWS Batch)", amount: "1x", value: 1 },
      { name: "Burla", amount: "0.5-0.8x", value: 0.65 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Finale
// ---------------------------------------------------------------------------

export const FINALE = {
  headline: ["Try Burla", "with two commands."],
  // One short reassurance line; the terminal block below carries the actual
  // instructions so the copy never repeats them.
  sub: "Zero deployment required. Burla can run the dashboard locally and boot VMs using local cloud credentials.",
  commands: ["pip install burla", "burla dashboard"],
};

export const FOOTER = {
  blurb: "The open source compute platform for big data.",
  // Investor marks render as quiet white silhouettes in the footer's brand
  // column. The -white.png files are pre-processed white-on-transparent
  // versions of the originals; `h` balances their very different aspect
  // ratios to one optical size.
  backedBy: {
    label: "Backed by",
    logos: [
      {
        src: "/investors/bessemer-white.png",
        alt: "Bessemer Venture Partners",
        href: "https://www.bvp.com/bessemer-beam",
        h: "h-7",
      },
      {
        src: "/investors/pioneer-white.png",
        alt: "Pioneer",
        href: "https://pioneer.app",
        h: "h-6",
      },
      {
        src: "/investors/boost-white.png",
        alt: "Boost VC",
        href: "https://www.boost.vc",
        h: "h-5",
      },
    ],
  },
  columns: [
    {
      title: "Product",
      links: [
        { label: "Getting started", href: LINKS.getStarted },
        { label: "API reference", href: "/docs/api-reference" },
        { label: "Examples", href: WORKLOADS.moreHref },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "GitHub", href: LINKS.github },
        { label: "Blog", href: LINKS.blog },
        { label: "Book a call", href: "https://cal.com/jakez/burla?user=jakez" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Contact", href: LINKS.email },
        { label: "Privacy Policy", href: "/privacy/" },
        { label: "Terms of Service", href: "/terms/" },
      ],
    },
  ],
  copyright: "© 2026 Burla, Inc. All rights reserved.",
};
