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
        "Run one remote function call per shared file, then combine the results locally.",
      icon: "parquet",
    },
    {
      route: "/docs/all-examples/basic-examples/process-one-giant-file-quickly",
      title: "Process one giant file",
      description:
        "Read non-overlapping byte ranges of one JSONL file in parallel.",
      icon: "spiral",
    },
    {
      route: "/docs/all-examples/basic-examples/process-data-in-your-database-quickly",
      title: "Backfill database rows",
      description:
        "Backfill non-overlapping ID ranges while capping database connections.",
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
          "Embed a 2.7M-paper snapshot, assign 400 topic clusters, and summarize representative papers.",
        icon: "spiral",
      },
      {
        route: "/docs/featured-examples/airbnb-burla",
        title: "CLIP-score 1.7M Airbnb photos",
        description:
          "Score public listing photos with CLIP, then rank one text prompt inside Burla.",
        icon: "image",
      },
      {
        route: "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo",
        title: "Embed 50K Wikipedia articles",
        description:
          "Embed Wikipedia text on up to eight A100s, then search the shared vector shards on Burla.",
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
        title: "Classify 45K tweets in parallel",
        description:
          "Classify 45,615 posts across CPU workers and stream predictions back to the client.",
        icon: "net",
      },
      {
        route: "/docs/all-examples/ml-embeddings-and-search/met-weirdest-art",
        title: "Search 192K artworks with CLIP",
        description:
          "Embed 191,922 Met images and surface cross-century visual matches with FAISS.",
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
          "Score 545 newline-aligned byte ranges once, then reduce bounded candidates into one ranking.",
        icon: "star",
      },
      {
        route: "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods",
        title: "Scan 2.76B NYC taxi trips",
        description:
          "Count pickups across 371 monthly files and reduce 2.76B trips into zone histories.",
        icon: "city",
      },
      {
        route: "/docs/all-examples/data-processing-examples/world-photo-index",
        title: "Map geotagged Flickr photos",
        description:
          "Map 4,094 Flickr metadata shards to nearest-city country codes and combine the counts.",
        icon: "pin",
      },
      {
        route: "/docs/all-examples/data-processing-examples/github-repo-summarizer",
        title: "Summarize 1M GitHub READMEs",
        description:
          "Classify 1.2M READMEs with deterministic rules, then reduce them into an inspectable report.",
        icon: "code",
      },
      {
        route: "/docs/all-examples/data-processing-examples/parquet-parallel",
        title: "Audit 5,000 Parquet files",
        description:
          "Run one PyArrow check per S3 object and combine compact file statistics into a local CSV.",
        icon: "scan",
      },
      {
        route: "/docs/all-examples/data-processing-examples/pandas-apply-parallel",
        title: "Parallelize pandas apply",
        description:
          "Run a familiar pandas transformation on worker-sized Parquet slices, then combine results locally.",
        icon: "table",
      },
    ],
  },
  {
    label: "Production Data Workflows",
    description: "Repeatable ETL, backfills, image processing, and simulation jobs.",
    legacyRoute: "/docs/all-examples/production-data-jobs",
    examples: [
      {
        route: "/docs/all-examples/production-data-jobs/python-etl-no-airflow",
        title: "ETL 10K S3 files to Postgres",
        description:
          "Transform gzipped S3 objects while capping concurrent Postgres connections.",
        icon: "etl",
      },
      {
        route: "/docs/all-examples/production-data-jobs/image-dataset-resize",
        title: "Resize an image corpus",
        description:
          "Resize S3 images into three JPEG variants and record every result in a local manifest.",
        icon: "image",
      },
      {
        route: "/docs/all-examples/production-data-jobs/rate-limited-api-requests",
        title: "Run a 2M-user API backfill",
        description:
          "Backfill records with bounded concurrency, local pacing, and explicit retry outcomes.",
        icon: "gate",
      },
      {
        route: "/docs/all-examples/production-data-jobs/monte-carlo-simulation",
        title: "Run 1B option simulations",
        description:
          "Reduce seeded option-price paths into an estimate with a standard error.",
        icon: "dice",
      },
    ],
  },
  {
    label: "Scientific & Geospatial Computing",
    description: "Bioinformatics, climate, and raster workloads with native tools.",
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
          "Align paired-end FASTQ samples in parallel and save indexed BAMs to shared storage.",
        icon: "reads",
      },
      {
        route: "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day",
        title: "Find NOAA's rainiest day",
        description:
          "Scan GHCN-Daily year files in parallel and reduce quality-controlled precipitation values.",
        icon: "raindrop",
      },
      {
        route: "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing",
        title: "NDVI for 2K Sentinel tiles",
        description:
          "Compute NDVI from public Sentinel-2 COGs in parallel and save GeoTIFFs.",
        icon: "raster",
      },
    ],
  },
];

export const ALL_EXAMPLE_CATEGORIES = [BASICS_CATEGORY, ...EXAMPLE_CATEGORIES];
