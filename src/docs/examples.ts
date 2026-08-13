export type ExampleCard = {
  route: string;
  title: string;
  description: string;
  icon: string;
};

export type ExampleCategory = {
  label: string;
  description: string;
  legacyRoute: string;
  examples: [ExampleCard, ...ExampleCard[]];
};

export const BASICS_CATEGORY: ExampleCategory = {
  label: "Basics",
  description: "The core patterns for structuring, running, and combining Burla work.",
  legacyRoute: "/docs/all-examples/basic-examples",
  examples: [
    {
      route: "/docs/all-examples/basic-examples/read-and-write-gcs-files",
      title: "Read/Write Files to Cloud Storage",
      description: "Read and write shared files through /workspace/shared.",
      icon: "cloud",
    },
    {
      route: "/docs/all-examples/basic-examples/use-custom-docker-images",
      title: "Use custom Docker images",
      description:
        "Use a public or private container image. Choose it in Settings or per job.",
      icon: "code",
    },
    {
      route: "/docs/all-examples/basic-examples/use-gpus",
      title: "Use GPUs",
      description:
        "Run PyTorch in a CUDA image. Allocate one A100 or H100 to each function call.",
      icon: "gpu",
    },
    {
      route: "/docs/all-examples/basic-examples/run-python-in-the-background",
      title: "Run jobs in the background",
      description:
        "Keep a job running after you close your laptop. Track progress from the dashboard.",
      icon: "clock",
    },
    {
      route:
        "/docs/all-examples/basic-examples/limit-parallelism-for-apis-databases-and-websites",
      title: "Limit parallelism for APIs or databases",
      description:
        "Cap concurrent function calls around an API or database.",
      icon: "sliders",
    },
    {
      route: "/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers",
      title: "Pass API keys and secrets to workers",
      description:
        "Use an API key from your local environment inside a remote function.",
      icon: "gate",
    },
    {
      route: "/docs/all-examples/basic-examples/process-thousands-of-files-quickly",
      title: "Process thousands of files",
      description:
        "Process one file per worker at massive scale. Combine compact reports afterward.",
      icon: "parquet",
    },
    {
      route: "/docs/all-examples/basic-examples/process-one-giant-file-quickly",
      title: "Process one giant file",
      description:
        "Stream a giant file in parallel chunks. Merge each chunk's result.",
      icon: "spiral",
    },
    {
      route: "/docs/all-examples/basic-examples/process-data-in-your-database-quickly",
      title: "Process database rows",
      description:
        "Process database rows across many workers. Avoid building a custom queue.",
      icon: "database",
    },
  ],
};

export const EXAMPLE_CATEGORIES: ExampleCategory[] = [
  {
    label: "ML, Embeddings & Search",
    description: "GPU embeddings, batch inference, model tuning, and semantic search.",
    legacyRoute: "/docs/all-examples/ml-embeddings-and-search",
    examples: [
      {
        route: "/docs/featured-examples/arxiv-fossils",
        title: "Cluster 2.7M arXiv abstracts",
        description:
          "Embed a 2.7M-paper snapshot in parallel, cluster it by topic, and find its semantic outlier.",
        icon: "spiral",
      },
      {
        route: "/docs/featured-examples/airbnb-burla",
        title: "CLIP-score 1.7M Airbnb photos",
        description:
          "Rank listings across 119 cities by where the TV is. Validate each shortlist with a vision model.",
        icon: "image",
      },
      {
        route: "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo",
        title: "Embed 50K Wikipedia articles",
        description:
          "Generate Wikipedia embeddings across A100 workers. Build a searchable index when the job completes.",
        icon: "embed",
      },
      {
        route: "/docs/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning",
        title: "Tune XGBoost on 1,000 CPUs",
        description:
          "Evaluate a large hyperparameter grid in parallel. Keep the best model and its metrics.",
        icon: "peak",
      },
      {
        route: "/docs/all-examples/ml-embeddings-and-search/ml-inference-batch",
        title: "Run batch LLM inference",
        description:
          "Run offline model inference as a distributed job. Avoid maintaining an endpoint for batch work.",
        icon: "net",
      },
      {
        route: "/docs/all-examples/ml-embeddings-and-search/met-weirdest-art",
        title: "Search 192K artworks with CLIP",
        description:
          "Embed every available Met artwork with CLIP. Search the collection by visual meaning.",
        icon: "star",
      },
    ],
  },
  {
    label: "Large-Scale Data Processing",
    description: "High-throughput scans, indexing, summarization, and dataframe work.",
    legacyRoute: "/docs/all-examples/data-processing-examples",
    examples: [
      {
        route: "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s",
        title: "Query 2.4TB of Parquet in 76s",
        description:
          "Run one DuckDB query across 1,000 files on a 10,000-CPU cluster. Reduce every partial result into one table.",
        icon: "parquet",
      },
      {
        route: "/docs/featured-examples/amazon-review-distiller",
        title: "Rank 572M Amazon reviews",
        description:
          "Stream 275GB of review JSONL as byte-range chunks. Score every review to surface the strangest ones.",
        icon: "star",
      },
      {
        route: "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods",
        title: "Scan 2.76B NYC taxi trips",
        description:
          "Scan every monthly taxi dataset in parallel. Find neighborhoods whose activity disappeared.",
        icon: "city",
      },
      {
        route: "/docs/all-examples/data-processing-examples/world-photo-index",
        title: "Map geotagged Flickr photos",
        description:
          "Index a global archive of geotagged photos. Turn billions of coordinates into a browsable map.",
        icon: "pin",
      },
      {
        route: "/docs/all-examples/data-processing-examples/github-repo-summarizer",
        title: "Summarize 1M GitHub READMEs",
        description:
          "Score a million README files with inspectable rules. Produce useful category summaries without an LLM.",
        icon: "code",
      },
      {
        route: "/docs/all-examples/data-processing-examples/parquet-parallel",
        title: "Audit 5,000 Parquet files",
        description:
          "Inspect every Parquet shard in parallel. Combine schema and quality findings into one report.",
        icon: "scan",
      },
      {
        route: "/docs/all-examples/data-processing-examples/pandas-apply-parallel",
        title: "Parallelize pandas apply",
        description:
          "Keep a familiar pandas transformation. Distribute it across a dataset that no longer fits one machine.",
        icon: "table",
      },
    ],
  },
  {
    label: "Production Data Workflows",
    description: "Repeatable ETL, backfills, scraping, and simulation jobs.",
    legacyRoute: "/docs/all-examples/production-data-jobs",
    examples: [
      {
        route: "/docs/all-examples/production-data-jobs/python-etl-no-airflow",
        title: "ETL 10K S3 files to Postgres",
        description:
          "Transform a large file drop into database rows. Run the workflow without adopting an orchestrator.",
        icon: "etl",
      },
      {
        route: "/docs/all-examples/production-data-jobs/image-dataset-resize",
        title: "Resize an image corpus",
        description:
          "Resize an entire image dataset in parallel. Write training-ready outputs back to shared storage.",
        icon: "image",
      },
      {
        route: "/docs/all-examples/production-data-jobs/rate-limited-api-requests",
        title: "Run a 2M-user API backfill",
        description:
          "Backfill millions of records through a rate-limited API. Bound concurrency without giving up parallelism.",
        icon: "gate",
      },
      {
        route: "/docs/all-examples/production-data-jobs/parallel-web-scraping",
        title: "Scrape 1M web pages",
        description:
          "Fetch a million pages across many workers. Retry failures and preserve incremental results.",
        icon: "globe",
      },
      {
        route: "/docs/all-examples/production-data-jobs/monte-carlo-simulation",
        title: "Run 1B option simulations",
        description:
          "Distribute a billion independent market simulations. Reduce the outcomes into one risk estimate.",
        icon: "dice",
      },
    ],
  },
  {
    label: "Scientific & Geospatial Computing",
    description: "Bioinformatics, climate, and raster workloads at full-dataset scale.",
    legacyRoute: "/docs/all-examples/scientific-and-geospatial-work",
    examples: [
      {
        route: "/docs/featured-examples/multi-stage-genomic-pipeline",
        title: "Convert 360 IDAT samples to PGEN",
        description:
          "Chain bcftools and plink across a whole cohort in parallel. Merge every sample into one PGEN dataset.",
        icon: "helix",
      },
      {
        route: "/docs/all-examples/scientific-and-geospatial-work/bioinformatics-alignment",
        title: "Align every FASTQ sample",
        description:
          "Align sequencing samples in parallel with native tools. Keep each sample isolated and reproducible.",
        icon: "reads",
      },
      {
        route: "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day",
        title: "Find NOAA's rainiest day",
        description:
          "Scan every NOAA annual weather file. Reduce decades of station readings to the wettest day.",
        icon: "raindrop",
      },
      {
        route: "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing",
        title: "NDVI for 2K Sentinel tiles",
        description:
          "Process Sentinel raster tiles with GDAL in parallel. Produce an NDVI output for every scene.",
        icon: "raster",
      },
    ],
  },
];

export const ALL_EXAMPLE_CATEGORIES = [BASICS_CATEGORY, ...EXAMPLE_CATEGORIES];
