---
cover: /docs-assets/more-examples/pandas-apply-parallel-cover.webp
coverY: 0
---

# Keep the pandas apply, scale the dataset

In this example we:

* Split a Parquet event table by user id.
* Run normal `df.apply(..., axis=1)` on each worker.
* Write enriched Parquet chunks to shared storage.
* Concatenate the chunk outputs into one final dataset.

Sometimes the ugly pandas row function is the business logic. Rewriting it into Spark just to make it run faster can quietly change the answer.

### Dataset: event rows in Parquet

Assume the source dataset has `user_id`, `url`, and other event fields.

```python
from pathlib import Path

import pandas as pd
import pyarrow.dataset as ds
from burla import remote_parallel_map

DATASET = "s3://my-bucket/events/"
OUT_DIR = Path("/workspace/shared/pandas-apply/enriched")
N_CHUNKS = 1_200
```

### Step 1: Pick a partition key

Here we stripe user ids across 1,200 chunks. The important part is that every row belongs to exactly one chunk.

```python
dataset = ds.dataset(DATASET, format="parquet")
all_users = dataset.to_table(columns=["user_id"]).column("user_id").unique().to_pylist()
chunks = [
    {"chunk_id": i, "user_ids": all_users[i::N_CHUNKS]}
    for i in range(N_CHUNKS)
]

print(f"Built {len(chunks):,} user-id chunks")
```

If you already have a user manifest, use that instead. The point is to create stable, non-overlapping inputs.

### Step 2: Write the pandas function

The worker reads its slice, applies the same row function you would run locally, writes one Parquet chunk, and returns a small report.

```python
import re

def enrich_chunk(job: dict) -> dict:
    pd.set_option("future.infer_string", False)
    chunk_id = job["chunk_id"]
    user_ids = job["user_ids"]

    dataset = ds.dataset(DATASET, format="parquet")
    table = dataset.filter(ds.field("user_id").isin(user_ids)).to_table()
    df = table.to_pandas()

    utm_re = re.compile(r"utm_source=([^&]+)")

    def enrich(row):
        src = utm_re.search(row["url"] or "")
        return pd.Series({
            "utm_source": src.group(1) if src else None,
            "url_len": len(row["url"] or ""),
        })

    enriched = pd.concat([df, df.apply(enrich, axis=1)], axis=1)
    out_path = OUT_DIR / f"chunk-{chunk_id:05d}.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    enriched.to_parquet(out_path, index=False)

    return {"chunk_id": chunk_id, "rows": len(enriched), "out_path": str(out_path)}
```

The row function stays ugly if the real business logic is ugly. The scaling change is around it, not inside it.

### Step 3: Run the chunks

```python
reports = remote_parallel_map(
    enrich_chunk,
    chunks,
    func_cpu=2,
    func_ram=8,
    grow=True,
)
```

### Step 4: Combine the enriched chunks

The client reads the output files after the parallel work finishes.

```python
reports = sorted(reports, key=lambda row: row["chunk_id"])
frames = [pd.read_parquet(row["out_path"]) for row in reports if row["rows"]]

final = pd.concat(frames, ignore_index=True)
final_path = Path("/workspace/shared/pandas-apply/enriched.parquet")
final.to_parquet(final_path, index=False)

print(f"Wrote {len(final):,} enriched rows to {final_path}")
```
