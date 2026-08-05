---
cover: /docs-assets/more-examples/airbnb-burla-cover.webp
coverY: 0
---

# Test Airbnb hypotheses at public-data scale

In this example we:

* Process every public Inside Airbnb listing across 119 cities and 4 quarterly snapshots.
* CLIP-score 1.7M photos, then use Claude Haiku Vision to validate the shortlists.
* Analyze 50,686,612 reviews with a staged review funnel.
* Reduce everything into reusable Parquet artifacts and site JSON.

This is the demo where the infrastructure really changes the experiment. A few cities can make a nice story. The whole corpus tells you whether the story survives contact with the rest of the world.

### Dataset: Inside Airbnb snapshots

The input is public city-level Inside Airbnb data: listings, photos, and reviews across multiple quarterly snapshots.

```python
import json
from dataclasses import dataclass
from pathlib import Path

from burla import remote_parallel_map

ROOT = Path("/workspace/shared/airbnb")
LISTING_DIR = ROOT / "listings"
PHOTO_DIR = ROOT / "photos"
REVIEW_DIR = ROOT / "reviews"
FINAL_DIR = ROOT / "final"
N_WORKERS = 1000

@dataclass(frozen=True)
class CitySnapshot:
    city_slug: str
    snapshot: str
    listings_url: str
    reviews_url: str

city_snapshots = [
    CitySnapshot(**row)
    for row in json.loads(Path("inside-airbnb-snapshots.json").read_text())
]
```

### Step 1: Write artifacts, not vibes

Every stage writes Parquet under `/workspace/shared/airbnb`. That way a failed GPU stage does not force a listing re-download, and a new correlation test can reuse the same scored files.

```python
def run_stage(worker_fn, inputs, *, cpu=1, ram=8, parallelism=1000):
    return remote_parallel_map(
        worker_fn,
        inputs,
        func_cpu=cpu,
        func_ram=ram,
        max_parallelism=parallelism,
        grow=True,
        spinner=False,
    )
```

That wrapper is not magic. It just keeps the resource choices visible at each stage.

### Step 2: Normalize listings first

The listing stage downloads each city snapshot, keeps the columns the later stages need, and writes one Parquet file per city snapshot.

```python
def process_listing_snapshot(snapshot: CitySnapshot) -> dict:
    import pandas as pd

    df = pd.read_csv(snapshot.listings_url)
    keep = df[[
        "id",
        "name",
        "neighbourhood_cleansed",
        "latitude",
        "longitude",
        "price",
        "review_scores_rating",
    ]].copy()
    keep["city_slug"] = snapshot.city_slug
    keep["snapshot"] = snapshot.snapshot

    LISTING_DIR.mkdir(parents=True, exist_ok=True)
    out_path = LISTING_DIR / f"{snapshot.city_slug}-{snapshot.snapshot}.parquet"
    keep.to_parquet(out_path, index=False)
    return {"city_slug": snapshot.city_slug, "snapshot": snapshot.snapshot, "rows": len(keep), "path": str(out_path)}
```

Run one city before the full matrix.

```python
test_listing = run_stage(process_listing_snapshot, city_snapshots[:1], cpu=1, ram=4, parallelism=1)[0]
print(test_listing)
```

Then run every city snapshot.

```python
listing_reports = run_stage(
    process_listing_snapshot,
    city_snapshots,
    cpu=1,
    ram=4,
    parallelism=500,
)
```

### Step 3: Score every photo first

The photo stage downloads image URLs, runs CLIP on CPU workers, and writes Parquet shards for the next stages. The broad pass stays cheap and parallel.

The source notebook builds `photo_batches` from the listing artifacts, with each batch containing image URLs and listing ids.

```python
clip_reports = remote_parallel_map(
    cpu_score_image_batch,
    photo_batches,
    func_cpu=1,
    func_ram=4,
    max_parallelism=N_WORKERS,
    grow=True,
    spinner=False,
)
```

The broad pass should be cheap enough to run over every photo. It only needs to produce shortlist scores.

### Step 4: Validate the photo shortlists

The original YOLOv8 GPU stage is still in the source repo for completeness, but it is not the live photo pipeline. The published demo uses Haiku Vision to validate the CLIP shortlists for pets, TV placement, hectic kitchens, and drug-den vibes.

```python
tv_validation = remote_parallel_map(
    haiku_validate_tv_batch,
    tv_batches,
    func_cpu=2,
    func_ram=8,
    max_parallelism=N_WORKERS,
    grow=True,
    spinner=False,
)
```

This is a useful split: cheap model over everything, expensive model only where it can change the answer.

### Step 5: Funnel the reviews

Reviews use the same shape: cheap heuristic scoring on every review, SBERT embeddings for the top 200,000, then Claude Haiku scoring for the top 12,000.

The review batches are built from the downloaded review artifacts. Each stage narrows the candidate set before the next, more expensive stage.

```python
heuristic_reports = remote_parallel_map(
    heuristic_score_batch,
    review_batches,
    func_cpu=1,
    func_ram=2,
    max_parallelism=N_WORKERS,
    grow=True,
    spinner=False,
)

embedding_reports = remote_parallel_map(
    embed_reviews_batch,
    embed_batches,
    func_cpu=2,
    func_ram=8,
    max_parallelism=N_WORKERS,
    grow=True,
    spinner=False,
)
```

Each stage writes an artifact. The next stage reads artifacts, not notebook variables.

### Step 6: Reduce into analysis outputs

The final reducer joins listings, photo labels, review scores, and bootstrap confidence intervals into the files used by the public site.

```python
def build_site_outputs(inputs: dict) -> dict:
    listing_paths = inputs["listing_paths"]
    photo_paths = inputs["photo_paths"]
    review_paths = inputs["review_paths"]

    outputs = reduce_airbnb_outputs(
        listing_paths=listing_paths,
        photo_paths=photo_paths,
        review_paths=review_paths,
        out_dir=str(FINAL_DIR),
    )
    return outputs

[site_outputs] = remote_parallel_map(
    build_site_outputs,
    [{
        "listing_paths": [r["path"] for r in listing_reports],
        "photo_paths": [r["path"] for r in clip_reports],
        "review_paths": [r["path"] for r in heuristic_reports],
    }],
    func_cpu=16,
    func_ram=64,
    grow=True,
)
```
