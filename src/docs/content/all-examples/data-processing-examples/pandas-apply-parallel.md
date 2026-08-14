# Run pandas apply across Parquet partitions

In this example we:

* Divide a partitioned S3 dataset into worker-sized user ranges.
* Load each range into pandas on a remote worker.
* Run an ordinary row-wise `df.apply` transformation.
* Combine the transformed slices locally.

This is a configurable template, not a benchmark. The repository does not include the event dataset or measured output. You can [read the source template](https://github.com/Burla-Cloud/examples/blob/main/pandas-apply-parallel/main.py).

## Before you run

Complete [Getting Started](/docs/get-started), then download the example:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/pandas-apply-parallel
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Use a deployed AWS cluster so workers can use an instance role:

```bash
burla deploy
```

Run `burla login` instead if a teammate already deployed it.

This code expects:

- A deployed AWS Burla cluster whose `burla-node` role can list and read the source S3 prefix.
- A local AWS identity that can list and read the same prefix.
- A Parquet dataset with non-null `user_id` values and a `url` column.
- File partitions or row-group statistics that let PyArrow prune `user_id` filters. Without pruning, every worker may scan the full dataset.
- Slices that fit within 8 GB of worker memory.
- A combined result that fits in local memory, because the workers return DataFrames to your computer.

Burla grants `burla-node` access to its own shared-storage bucket by default, not to every bucket in your account.

The blocks below form one script. Use an existing user manifest if you have one. Building the manifest shown here scans the complete `user_id` column locally.

## 1. Build the user manifest

Scan the `user_id` column once:

```python
import re

import pandas as pd
import pyarrow.dataset as ds
from burla import remote_parallel_map

DATASET = "s3://my-bucket/events/"
N_CHUNKS = 1_200

dataset = ds.dataset(DATASET, format="parquet")
all_users = dataset.to_table(columns=["user_id"]).column("user_id").combine_chunks()
all_users = all_users.drop_null().unique().to_pylist()

if not all_users:
    raise RuntimeError(f"No users found in {DATASET}")
```

## 2. Split users into non-overlapping inputs

The source template uses 1,200 chunks. Treat that as configuration, not a measured worker count:

```python
n_chunks = min(N_CHUNKS, len(all_users))
chunks = [all_users[chunk_id::n_chunks] for chunk_id in range(n_chunks)]
print(f"Built {len(chunks):,} user-id chunks")
```

The strided split assigns every user to exactly one chunk. All rows for one user therefore go to the same remote call.

## 3. Define the row transformation

Keep the ordinary row-wise pandas function at module scope:

```python
utm_pattern = re.compile(r"utm_source=([^&]+)")


def enrich(row):
    url = row["url"] if isinstance(row["url"], str) else ""
    match = utm_pattern.search(url)
    return pd.Series({"utm_source": match.group(1) if match else None, "url_len": len(url)})
```

## 4. Apply the transformation to one slice

Each worker filters for its users, converts the matching rows to pandas, and applies the transformation. Without partition or row-group pruning, the filter can still scan the full dataset.

```python
def apply_on_chunk(user_ids):
    dataset = ds.dataset(DATASET, format="parquet")
    frame = dataset.filter(ds.field("user_id").isin(user_ids)).to_table(
        columns=["user_id", "url"]
    ).to_pandas()
    return pd.concat([frame, frame.apply(enrich, axis=1)], axis=1)
```

The parallel boundary is outside `enrich`. You can replace that function with existing row-wise parsing or scoring logic without converting it to another dataframe API.

## 5. Run the slices in parallel

```python
frames = remote_parallel_map(apply_on_chunk, chunks, func_cpu=2, func_ram=8, grow=True)
```

Burla replicates the installed pandas and PyArrow versions on the workers. Returned frames can arrive in any order.

## 6. Combine the returned frames

```python
final = pd.concat(frames, ignore_index=True)
```

## 7. Write the enriched dataset

```python
final.to_parquet("enriched.parquet", index=False)
print(f"Wrote {len(final):,} rows to enriched.parquet")
```

Both `frames` and `final` exist in local memory during concatenation. If the enriched dataset cannot fit there, have each worker write directly to a user-owned S3 output prefix and return only its object key and row count.
