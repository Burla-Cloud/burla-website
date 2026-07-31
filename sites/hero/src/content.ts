// Every word on the page lives here so copy is trivial to iterate on.
// Numbers are the agreed set: 1,000 VMs in ~1s, 10,000 CPUs per job,
// 2-5x utilization, and the Wikipedia job at 218,492,113 chunks / 108s / $14.20
// vs Coiled $32 and DIY Ray $48.

export const LINKS = {
  docs: "https://docs.burla.dev",
  github: "https://github.com/Burla-Cloud/burla",
  email: "mailto:jake@burla.dev",
};

export const PIP_COMMAND = "pip install burla";

export const NAV = {
  wordmark: "burla",
  links: [
    { label: "Docs", href: LINKS.docs },
    { label: "GitHub", href: LINKS.github },
  ],
};

// ---------------------------------------------------------------------------
// Act I · the zoom
// ---------------------------------------------------------------------------

export const ZOOM = {
  codeLine: "results = remote_parallel_map(embed, wikipedia)",
  phaseA: "This is one line of Python.",
  phaseB: ["These are the", "10,000 machines", "running it."],
  resolve: {
    kicker: "burla · open source · runs in your cloud",
    statement: ["The simplest way to process", "massive", "amounts of data."],
    sub: "Burla runs any Python function on thousands of VMs inside your own cloud. You call one function. So can your coding agent. Everything else is Burla's problem.",
    stats: [
      "1,000 VMs in ~1 s",
      "10,000 CPUs per call",
      "2 to 5x utilization",
      "$0 to burla",
    ],
  },
  scrollCue: "scroll",
};

// ---------------------------------------------------------------------------
// Act II · what it is, how it works
// ---------------------------------------------------------------------------

export const WHAT = {
  eyebrow: "what is burla",
  headline: ["One function.", "A cluster in your cloud."],
  lead: "Burla is an open-source engine for running Python on thousands of machines at once. It is two pieces: a pip-installable client, and a cluster that deploys into your own cloud account. The whole API is one function. remote_parallel_map takes any Python function and a list of inputs, runs the function on every input in parallel, and hands the results back like the code never left your laptop.",
  setupLabel: "The entire setup:",
  apiLabel: "The entire API:",
  chips: ["any package", "any container", "any machine type, GPUs included"],
  stepsLabel: "how it works",
  steps: [
    {
      title: "Deploy it in your cloud",
      body: "pip install burla, then one command stands the cluster up inside your own account. Your VPC, your IAM, your bill. Data, code, and results never leave your perimeter.",
    },
    {
      title: "Write a plain Python function",
      body: "No DAGs, no YAML, no cluster config, no new dialect. Bring any packages, any Docker image, and any machine type your cloud sells, GPUs included.",
    },
    {
      title: "Call remote_parallel_map",
      body: "Burla clones your code, packages, and local modules onto up to 1,000 fresh VMs and starts running in about a second, even with millions of inputs.",
    },
    {
      title: "Work like it never left",
      body: "Prints stream back to your terminal. Exceptions raise locally. A live dashboard shows every machine and log, and VMs scale to zero seconds after the last result lands.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Act III · examples
// ---------------------------------------------------------------------------

export const EXAMPLES = {
  eyebrow: "what people run on it",
  headline: ["What would you do", "with 10,000 CPUs?"],
  sub: "Twelve real jobs, each one a normal Python function fanned out with remote_parallel_map. Every tile links to the full writeup with the code.",
  moreLabel: "Browse all examples",
  moreHref: "https://docs.burla.dev/all-examples/basic-examples",
  items: [
    {
      stat: "2.4 TB",
      title: "of Parquet queried in 76 seconds",
      tag: "data",
      href: "https://docs.burla.dev/featured-examples/process-2.4tb-of-parquet-files-in-76s",
    },
    {
      stat: "2.76 B",
      title: "NYC taxi trips scanned for ghost neighborhoods",
      tag: "data",
      href: "https://docs.burla.dev/all-examples/data-processing-examples/nyc-ghost-neighborhoods",
    },
    {
      stat: "572 M",
      title: "Amazon reviews distilled by an LLM",
      tag: "llm",
      href: "https://docs.burla.dev/featured-examples/amazon-review-distiller",
    },
    {
      stat: "1.7 M",
      title: "Airbnbs ranked by TV location",
      tag: "vision",
      href: "https://docs.burla.dev/featured-examples/airbnb-burla",
    },
    {
      stat: "2.7 M",
      title: "arXiv abstracts embedded and clustered",
      tag: "embeddings",
      href: "https://docs.burla.dev/featured-examples/arxiv-fossils",
    },
    {
      stat: "1 B",
      title: "Monte Carlo option simulations",
      tag: "quant",
      href: "https://docs.burla.dev/all-examples/production-data-jobs/monte-carlo-simulation",
    },
    {
      stat: "360",
      title: "Illumina samples aligned, IDAT to PGEN",
      tag: "genomics",
      href: "https://docs.burla.dev/featured-examples/multi-stage-genomic-pipeline",
    },
    {
      stat: "1 M",
      title: "GitHub READMEs summarized",
      tag: "llm",
      href: "https://docs.burla.dev/all-examples/data-processing-examples/github-repo-summarizer",
    },
    {
      stat: "1 M",
      title: "web pages scraped in parallel",
      tag: "scraping",
      href: "https://docs.burla.dev/all-examples/production-data-jobs/parallel-web-scraping",
    },
    {
      stat: "192 K",
      title: "Met artworks CLIP-searched for the weirdest",
      tag: "vision",
      href: "https://docs.burla.dev/all-examples/ml-embeddings-and-search/met-weirdest-art",
    },
    {
      stat: "1,000",
      title: "CPUs tuning a single XGBoost model",
      tag: "ml",
      href: "https://docs.burla.dev/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning",
    },
    {
      stat: "2 K",
      title: "Sentinel-2 tiles rendered into NDVI maps",
      tag: "geospatial",
      href: "https://docs.burla.dev/all-examples/scientific-and-geospatial-work/gdal-raster-processing",
    },
  ],
};

// ---------------------------------------------------------------------------
// Act IV · features
// ---------------------------------------------------------------------------

export const FEATURES = {
  eyebrow: "why burla",
  headline: ["Three unfair", "advantages."],
  efficiency: {
    index: "01",
    kicker: "vastly more efficient",
    headline: ["Same job.", "A fraction of the bill."],
    copy: "Burla watches every VM live and packs more work onto machines with headroom, holding clusters near 90% utilization: 2 to 5x better than typical Spark, Ray, or Dask setups. The same workload needs 20 to 50% less compute, and machines release in seconds, so you only rent core-hours that are actually busy.",
    bars: [
      { name: "burla", cost: 14.2, tone: "accent" as const, note: "108s · your cloud" },
      { name: "coiled", cost: 32.0, tone: "dim" as const, note: "managed dask" },
      { name: "ray, diy on k8s", cost: 48.0, tone: "coral" as const, note: "plus your weekends" },
    ],
    fine: "Illustrative: embedding all of English Wikipedia, 218,492,113 chunks, 108 seconds on Burla.",
  },
  simplicity: {
    index: "02",
    kicker: "vastly simpler",
    headline: ["One function.", "Nobody gets it wrong."],
    copy: "There is no cluster to define, no DAG, no YAML, nothing to babysit. If it runs on your laptop, it runs on 10,000 CPUs. And because the entire API is one function, your coding agent already knows how to drive it: paste one line into its rules and every pipeline it writes can scale to your whole cloud quota, while you get coffee.",
    snippetLabel: "paste into your agent's rules",
    snippet:
      "For large data-processing tasks, use Burla: `from burla import remote_parallel_map`, then `remote_parallel_map(fn, inputs)`. It runs fn on every input in parallel across up to 10,000 CPUs in our own cloud account. Docs: https://docs.burla.dev",
  },
  scale: {
    index: "03",
    kicker: "faster & more scalable",
    headline: ["1,000 VMs.", "One second."],
    copy: "Clusters ignite in about a second instead of ten minutes, even with millions of inputs. A single call fans out across up to 10,000 CPUs, mixes machine types and images mid-pipeline, and scales back to zero the moment the work is done. Nothing idles at 2 a.m.",
    stats: ["~1 s cold start", "10,000 CPUs per call", "scale to zero in seconds"],
    wallZone: "your-cloud · zone-a",
    wallCpus: 10_000,
  },
};

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const FAQ = {
  eyebrow: "faq",
  headline: "Fine print, out loud.",
  items: [
    {
      q: "Is it actually free?",
      a: "Yes. Burla is open source. You pay your cloud provider for the VMs you use, and you pay Burla nothing.",
    },
    {
      q: "Where does it run?",
      a: "Inside your own private cloud account: AWS, GCP, or Azure. Your data, code, and results never leave your perimeter.",
    },
    {
      q: "Do I have to rewrite my code?",
      a: "No. Burla runs plain Python functions with whatever packages or custom containers they need. If it runs on your laptop, it can run on 10,000 CPUs.",
    },
    {
      q: "How fast does it actually scale?",
      a: "About 1,000 VMs in a second, up to 10,000 CPUs in a single call. Clusters scale back down the moment work finishes.",
    },
    {
      q: "How is it 2 to 5x cheaper?",
      a: "Utilization. Burla packs work tightly onto VMs and releases them in seconds, so you only rent core-hours that are actually busy. Idle clusters are where compute budgets go to die.",
    },
    {
      q: "GPUs?",
      a: "Yes. Any machine type your cloud offers, including GPUs, and you can mix hardware within a single job.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Finale
// ---------------------------------------------------------------------------

export const FINALE = {
  headline: ["Process", "everything."],
  sub: "Open source. One function. Your cloud.",
  ctaGithub: "Star on GitHub",
  ctaDocs: "Read the docs",
};

export const FOOTER = {
  line: "burla · open-source distributed Python",
  links: [
    { label: "GitHub", href: LINKS.github },
    { label: "Docs", href: LINKS.docs },
    { label: "Email", href: LINKS.email },
  ],
};
