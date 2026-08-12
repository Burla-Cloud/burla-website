---
cover: /docs-assets/more-examples/python-etl-no-airflow-cover.webp
coverY: 0
---

# Run the file-drop ETL before it becomes a platform project

In this example we:

* List 10,000 gzipped JSON files from S3.
* Transform each file in a Burla worker.
* Load cleaned rows into Postgres while capping database concurrency.
* Return per-file load reports so retries are obvious.

This is the kind of job that turns into an Airflow ticket when the actual problem is just: yesterday's files are too slow on one machine.

### Dataset: daily S3 file drop

Assume each raw file is gzipped JSONL under a date prefix.

```python
import gzip
import json
import os
from pathlib import Path

import boto3
import psycopg2
from burla import remote_parallel_map
from psycopg2.extras import execute_values

S3_BUCKET = "my-events-bucket"
DATE = "2025-04-19"
DATABASE_URL = os.environ["DATABASE_URL"]
MAX_DB_LOADERS = 25
REPORT_PATH = Path("/workspace/shared/file-drop-etl/load-report.jsonl")
```

`DATABASE_URL` is read on your machine, and the value is captured into the pickled function when the job starts (see [Pass API keys & secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers)).

### Step 1: List the files

The client lists the daily prefix and builds one input per file.

```python
keys = []
for page in boto3.client("s3").get_paginator("list_objects_v2").paginate(Bucket=S3_BUCKET, Prefix=f"raw/{DATE}/"):
    keys += [obj["Key"] for obj in page.get("Contents", []) if obj["Key"].endswith(".json.gz")]

print(f"Found {len(keys):,} files")
```

### Step 2: Transform and insert one file

The worker owns extract, transform, and load for one object. `execute_values` keeps each file as a small number of batched inserts.

```python
def etl_one_file(key: str) -> dict:
    body = boto3.client("s3").get_object(Bucket=S3_BUCKET, Key=key)["Body"].read()
    rows_in = [json.loads(line) for line in gzip.decompress(body).splitlines() if line]
    rows_out = [
        (r["event_id"], r["user_id"], r["event_type"], r["ts"], float(r.get("amount") or 0))
        for r in rows_in
        if r.get("event_type") in ("click", "purchase", "signup")
    ]

    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO events (event_id, user_id, event_type, ts, amount)
                VALUES %s
                ON CONFLICT (event_id) DO NOTHING
                """,
                rows_out,
                page_size=1000,
            )

    return {"key": key, "rows_in": len(rows_in), "rows_out": len(rows_out)}
```

The insert is idempotent because `event_id` is the conflict key. That makes retries safe.

### Step 3: Protect Postgres

The database is the constraint, so `max_parallelism` is the important line.

```python
REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
done = 0

with REPORT_PATH.open("w") as f:
    for report in remote_parallel_map(
        etl_one_file,
        keys,
        func_cpu=1,
        func_ram=2,
        max_parallelism=MAX_DB_LOADERS,
        generator=True,
        grow=True,
    ):
        done += 1
        f.write(json.dumps(report) + "\n")
        if done % 100 == 0:
            print(done, report["rows_out"])

print(REPORT_PATH)
```
