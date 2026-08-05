---
cover: /docs-assets/more-examples/parquet-parallel-cover.webp
coverY: 0
---

# Scan every Parquet shard instead of trusting a sample

In this example we:

* List thousands of S3 Parquet files.
* Run one PyArrow scan per file.
* Return one QA row per object.
* Write a CSV report that shows which shards need attention.

This is a dataset audit. If you read ten files and hope the other 4,990 look the same, you have changed the question.

### Dataset: partitioned event Parquet

Assume a data lake folder like this:

```text
s3://my-events-bucket/events/2025/...
```

Each object is supposed to contain `user_id`, `event_ts`, and `revenue`.

```python
import io
import json
from pathlib import Path

import boto3
import pandas as pd
import pyarrow.parquet as pq
from burla import remote_parallel_map

BUCKET = "my-events-bucket"
PREFIX = "events/2025/"
REPORT_PATH = Path("/workspace/shared/parquet-audit/report.csv")
```

### Step 1: List the files

Object listing is cheap, so the client builds the work queue.

```python
def list_parquet_keys() -> list[str]:
    keys = []
    paginator = boto3.client("s3").get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=PREFIX):
        keys.extend(
            obj["Key"]
            for obj in page.get("Contents", [])
            if obj["Key"].endswith(".parquet")
        )
    return sorted(keys)

parquet_keys = list_parquet_keys()
print(f"Found {len(parquet_keys):,} Parquet files")
```

Each key becomes one input to Burla.

### Step 2: Inspect one file

The worker downloads one object, reads the Parquet footer and selected columns, then returns one report row. You can swap the checks for schema validation, timestamp bounds, partition checks, or rewrite logic.

```python
def scan_parquet_file(key: str) -> dict:
    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=BUCKET, Key=key)
    body = obj["Body"].read()

    table = pq.read_table(io.BytesIO(body), columns=["user_id", "event_ts", "revenue"])
    revenue = table.column("revenue").to_pandas()
    user_ids = table.column("user_id").combine_chunks()

    return {
        "key": key,
        "rows": table.num_rows,
        "bytes": obj["ContentLength"],
        "distinct_users": user_ids.unique().length(),
        "revenue_sum": float(revenue.sum()),
        "revenue_null_rate": float(revenue.isna().mean()),
    }
```

The worker does not send the file or dataframe back. It returns the QA facts needed for triage.

### Step 3: Smoke test a few files

Run a small sample first, but use it only to test the code path.

```python
test_stats = remote_parallel_map(
    scan_parquet_file,
    parquet_keys[:10],
    func_cpu=1,
    func_ram=4,
)

print(pd.DataFrame(test_stats).head())
```

If the columns and memory look right, scan the full list.

```python
stats = remote_parallel_map(
    scan_parquet_file,
    parquet_keys,
    func_cpu=1,
    func_ram=4,
    grow=True,
)
```

### Step 4: Build the report

Each file becomes one row in the audit report.

```python
report = pd.DataFrame(stats).sort_values("key")
report["empty_file"] = report["rows"] == 0
report["high_null_revenue"] = report["revenue_null_rate"] > 0.05

REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
report.to_csv(REPORT_PATH, index=False)

print(report[report["empty_file"] | report["high_null_revenue"]].head(20))
print(REPORT_PATH)
```
