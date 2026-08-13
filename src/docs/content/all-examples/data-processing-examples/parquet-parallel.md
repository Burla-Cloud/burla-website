---
cover: /docs-assets/more-examples/parquet-parallel-cover.webp
coverY: 0
description: Read every Parquet object in an S3 prefix on a separate remote call, then combine compact file statistics locally.
---

# Audit every Parquet file in an S3 prefix

This template lists the Parquet objects under one Amazon S3 prefix, runs the same checks on each object, and writes one local CSV row per file. Each remote call returns a small dictionary instead of transferring the Parquet data back to your computer.

Replace the bucket, prefix, and column names with your own. The example repository does not include a dataset or a recorded run, so no file count or runtime is claimed here. You can also [read the source template](https://github.com/Burla-Cloud/examples/blob/main/parquet-parallel/main.py).

## Before you run

Complete [Getting Started](/docs/get-started), then download the example:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/parquet-parallel
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Use a deployed AWS cluster so workers can use an instance role:

```bash
burla deploy
```

Run `burla login` instead if a teammate already deployed it.

This example is specific to a deployed AWS Burla cluster:

- The AWS identity on your computer needs `s3:ListBucket` for the source prefix.
- The `burla-node` instance role needs `s3:GetObject` for the source objects. Burla grants that role access to its own shared-storage bucket by default, not to every bucket in your account.
- Each object and its decoded columns must fit in one worker's memory.

The code below expects `user_id` and `revenue` columns. The blocks form one script.

## 1. List every Parquet object

The local process builds the input list. An S3 paginator is required because one response contains at most 1,000 objects:

```python
import io
from pathlib import Path

import boto3
import pandas as pd
import pyarrow.parquet as pq
from burla import remote_parallel_map

BUCKET = "my-events-bucket"
PREFIX = "events/2025/"
REPORT_PATH = Path("parquet_scan_report.csv")


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
if not parquet_keys:
    raise RuntimeError(f"No Parquet files found under s3://{BUCKET}/{PREFIX}")

print(f"Found {len(parquet_keys):,} Parquet files")
```

Each key becomes one input to `remote_parallel_map`.

## 2. Inspect one object

The worker downloads one object into memory, decodes only the two required columns, and returns the statistics needed for the report:

```python
def scan_parquet_file(key: str) -> dict:
    s3 = boto3.client("s3")
    response = s3.get_object(Bucket=BUCKET, Key=key)
    body = response["Body"].read()

    table = pq.read_table(
        io.BytesIO(body),
        columns=["user_id", "revenue"],
    )
    user_ids = table.column("user_id").combine_chunks()
    revenue = table.column("revenue").to_pandas()

    return {
        "key": key,
        "rows": table.num_rows,
        "bytes": response["ContentLength"],
        "distinct_users": len(user_ids.unique()),
        "revenue_sum": float(revenue.sum()),
        "revenue_null_rate": (
            float(revenue.isna().mean())
            if len(revenue)
            else 0.0
        ),
    }
```

Reading into `io.BytesIO` gives PyArrow the seekable input it needs. The file body and decoded columns coexist in memory, so increase `func_ram` when one object can approach 4 GB.

## 3. Scan the full prefix

```python
stats = remote_parallel_map(
    scan_parquet_file,
    parquet_keys,
    func_cpu=1,
    func_ram=4,
    grow=True,
)
```

Burla starts calls up to the cluster's available capacity and queues the rest. Return values can arrive in any order.

## 4. Write the local report

Sort by object key before writing the CSV so reruns are easy to compare:

```python
report = pd.DataFrame(stats).sort_values("key")
report.to_csv(REPORT_PATH, index=False)

print(f"Wrote {len(report):,} rows to {REPORT_PATH}")
```

Save the assembled script as `audit_parquet.py`, then run:

```bash
python audit_parquet.py
```

`REPORT_PATH` is on your computer. This example does not use `/workspace/shared`; only the compact dictionaries cross back from the workers.
