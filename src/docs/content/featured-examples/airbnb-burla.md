---
cover: /docs-assets/more-examples/airbnb-burla-cover.webp
coverY: 0
description: Process 1.7 million Inside Airbnb photo rows and 50.7 million reviews through staged CLIP, embedding, and Haiku filters.
---

# Analyze 1.7 million Airbnb listing photos

This pipeline turns public [Inside Airbnb](https://insideairbnb.com/get-the-data/) exports into photo galleries and statistical findings. The published run covers 119 cities, 282 city-snapshot pairs, 1.74 million latest listings, 1.71 million photo-score rows, and 50.69 million reviews.

CLIP ranks the photos, Claude Haiku validates small visual shortlists, and a separate review funnel narrows tens of millions of reviews before asking Haiku to score them. You can [explore the published result](https://burla-cloud.github.io/examples/airbnb-burla-demo/) or [read the complete source](https://github.com/Burla-Cloud/examples/tree/main/airbnb-burla-demo).

## Before you run

Complete [Getting Started](/docs/get-started), then deploy the cluster with `burla deploy`. This example passes large artifacts between separate remote calls through `/workspace/shared`, which is available inside workers on a deployed cluster. The local Python process cannot open those paths.

Clone the example and install it with Python 3.12:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/airbnb-burla-demo
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .
export ANTHROPIC_API_KEY=...
```

The full workload uses paid cloud compute and the Anthropic API. Preload the two model weight sets once so hundreds of workers do not download the same files:

```bash
python scripts/preload_clip_weights.py
python scripts/preload_st_weights.py
```

The repository's `make all` target still includes the deprecated YOLO stage that failed during the published run. Its partial output is not needed for the photo galleries. Run the active stages directly, and invoke the review stage without the Makefile's reuse flags:

```bash
make PY="$PWD/.venv/bin/python" \
  stage00 stage01 stage02a stage02b stage07 \
  stage05b stage05c
python -m src.stages.s04_score_reviews
make PY="$PWD/.venv/bin/python" stage05 stage06 site_data
```

The code below is excerpted from those stage scripts. The complete repository contains the worker functions, prompts, checkpoint handling, and site renderer.

## The pipeline

```text
Inside Airbnb CSV exports
  -> listing, calendar, and photo Parquet files
  -> CLIP scores and Haiku-validated photo shortlists
  -> heuristic, embedding, and Haiku review scores
  -> findings and gallery JSON
```

### 1. Download each city snapshot

The first stages discover up to four snapshots per city and validate each URL. One remote call then downloads each valid city-snapshot pair and writes a Parquet file to shared storage:

```python
results = remote_parallel_map(
    download_and_clean_city,
    args_list,
    func_cpu=1,
    func_ram=4,
    max_parallelism=min(300, len(args_list)),
    grow=True,
    spinner=False,
)
```

Each result contains counts and a shared path, not the listing table. A larger reducer reads all of those files inside the cluster, keeps the latest row for each listing, and preserves the full snapshot history separately:

```python
[merge_result] = remote_parallel_map(
    merge_listings_parquets,
    [MergeListingsArgs(
        shared_root=SHARED_LISTINGS,
        output_path=f"{SHARED_ROOT}/listings_clean.parquet",
        history_path=f"{SHARED_ROOT}/listings_history.parquet",
    )],
    func_cpu=8,
    func_ram=64,
    max_parallelism=1,
    grow=True,
    spinner=False,
)
```

Calendar files follow the same pattern. Their latest 365-day availability summaries become the pipeline's occupancy proxy.

### 2. Score the photo manifest with CLIP

The photo stage splits the shared manifest into batches of 700 URLs. Each worker downloads and scores one batch, then writes one Parquet result:

```python
results = remote_parallel_map(
    cpu_score_image_batch,
    batches,
    func_cpu=1,
    func_ram=4,
    max_parallelism=min(800, len(batches)),
    grow=True,
    spinner=False,
)
```

The current stage uses CPU workers. A worker copies the preloaded ViT-B/32 weights from shared storage to its node's local `/tmp` once, then reuses the loaded model while processing its batch.

CLIP produces broad candidate scores for pets, unusual rooms, and TV placement. Haiku only sees the top 1,500 pet, 4,000 room, and 2,000 TV candidates, with at most 200 API workers running at once.

### 3. Narrow 50.7 million reviews

The review source is append-only, so the pipeline downloads only the latest review export for each city and deduplicates by review ID. It rewrites the merged Parquet file into 5,000-row groups so each heuristic worker reads one row group rather than scanning the full file.

The current source then keeps 250,000 reviews, embeds them with `all-MiniLM-L6-v2`, clusters them into 40 groups, and sends 12,000 candidates to Haiku:

```python
results = remote_parallel_map(
    embed_reviews_batch,
    batches,
    func_cpu=2,
    func_ram=8,
    max_parallelism=min(200, len(batches)),
    grow=True,
    spinner=False,
)
```

This call runs the embedding model on CPUs because it does not request `func_gpu`. Each batch writes its vectors and scores to shared Parquet; one 16-CPU reducer performs the clustering.

### 4. Build the published artifacts

One final 16-CPU, 64 GB worker joins the latest listings, calendar proxy, image scores, Haiku labels, review scores, and bootstrap intervals. It returns small JSON-compatible sections to the client, which writes the static site's data files.

## Published result

| Metric | Value |
|---|---:|
| Cities | 119 |
| Validated city-snapshot pairs | 282 |
| Latest listings | 1,740,077 |
| Photo manifest rows | 1,945,032 |
| Photo-score rows | 1,710,664 |
| Reviews | 50,686,612 |
| Peak workers recorded | 1,741 |

The committed findings accept associations for the pet proxy, unusual-photo flag, and messiness quartile. They reject brightness and plant-count findings under the pipeline's confidence-interval rule.

These are associations with an availability proxy, not causal estimates of bookings. `occupancy_365` counts every unavailable date, including dates blocked by a host. The pet correlation also uses CLIP or YOLO-derived features, not the Haiku-validated pet gallery.

The committed runtime log totals 22.9 hours and $1,024.89 across repeated attempts, failures, and reruns. It is evidence of the development run, not a clean end-to-end benchmark.
