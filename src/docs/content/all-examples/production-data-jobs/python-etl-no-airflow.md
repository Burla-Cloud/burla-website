---
cover: /docs-assets/more-examples/python-etl-no-airflow-cover.webp
coverY: 0
description: Transform a gzipped JSONL file drop in parallel while capping Postgres connections.
---

# Load an S3 file drop into Postgres

This example maps one gzipped JSONL object to one remote ETL call. Each call reads from S3, transforms its rows, and opens one Postgres connection. `max_parallelism` therefore limits the connections created by this job.

The input bucket and database belong to you. The [repository example](https://github.com/Burla-Cloud/examples/blob/main/python-etl-no-airflow/main.py) does not include a public dataset or a measured run, so this page does not claim a file count or runtime.

## Before you run

1. Complete [Getting Started](/docs/get-started) with AWS.
2. Use a deployed cluster. Run `burla deploy`, then grant its `burla-node` IAM role `s3:GetObject` access to the source prefix.
3. Make Postgres reachable from the Burla workers.
4. Install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install burla boto3 psycopg2-binary
```

Place each input object under `raw/<RUN_DATE>/`. It must contain one JSON object per line with `event_id`, `user_id`, `event_type`, and `ts` fields. `amount` and `country` are optional. Create the destination table before running the job:

```sql
CREATE TABLE events (
    event_id text PRIMARY KEY,
    user_id text NOT NULL,
    event_type text NOT NULL,
    ts timestamptz NOT NULL,
    amount double precision NOT NULL,
    country text NOT NULL
);
```

Set the source, run date, database connection string, and the number of connections this job may use:

```bash
export S3_BUCKET="<source-bucket>"
export RUN_DATE="<YYYY-MM-DD>"
export DATABASE_URL="<postgres-connection-string>"
export MAX_DB_LOADERS="<connection-limit-for-this-job>"
```

Your local AWS identity must be able to list the source prefix. The worker role handles object reads.

## The ETL script

Save the following as `main.py`:

```python
import gzip
import json
import os
from pathlib import Path

import boto3
import psycopg2
from burla import remote_parallel_map
from psycopg2.extras import execute_values

S3_BUCKET = os.environ["S3_BUCKET"]
RUN_DATE = os.environ["RUN_DATE"]
DATABASE_URL = os.environ["DATABASE_URL"]
MAX_DB_LOADERS = int(os.environ["MAX_DB_LOADERS"])
REPORT_PATH = Path("etl-report.jsonl")

if MAX_DB_LOADERS < 1:
    raise ValueError("MAX_DB_LOADERS must be at least 1")

s3 = boto3.client("s3")
keys = []
pages = s3.get_paginator("list_objects_v2").paginate(
    Bucket=S3_BUCKET,
    Prefix=f"raw/{RUN_DATE}/",
)
for page in pages:
    keys.extend(
        obj["Key"]
        for obj in page.get("Contents", [])
        if obj["Key"].endswith(".json.gz")
    )

print(f"Found {len(keys):,} files")


def etl_one_file(key: str) -> dict:
    body = boto3.client("s3").get_object(
        Bucket=S3_BUCKET,
        Key=key,
    )["Body"].read()
    rows_in = [
        json.loads(line)
        for line in gzip.decompress(body).splitlines()
        if line
    ]
    rows_out = [
        (
            row["event_id"],
            row["user_id"],
            row["event_type"],
            row["ts"],
            float(row.get("amount") or 0),
            (row.get("country") or "XX").upper(),
        )
        for row in rows_in
        if row.get("event_type") in {"click", "purchase", "signup"}
    ]

    connection = psycopg2.connect(DATABASE_URL)
    try:
        with connection:
            with connection.cursor() as cursor:
                if rows_out:
                    execute_values(
                        cursor,
                        """
                        INSERT INTO events (
                            event_id, user_id, event_type, ts, amount, country
                        )
                        VALUES %s
                        ON CONFLICT (event_id) DO NOTHING
                        """,
                        rows_out,
                        page_size=1_000,
                    )
    finally:
        connection.close()

    return {
        "key": key,
        "rows_in": len(rows_in),
        "rows_out": len(rows_out),
    }


with REPORT_PATH.open("w") as report_file:
    for report in remote_parallel_map(
        etl_one_file,
        keys,
        max_parallelism=MAX_DB_LOADERS,
        generator=True,
    ):
        report_file.write(json.dumps(report) + "\n")

print(REPORT_PATH)
```

`DATABASE_URL` is read by the local process. Because `etl_one_file` references that value, Burla sends it with the function. Burla does not copy local environment variables into worker environments. See [Pass API keys and secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers).

The S3 reads and Postgres inserts happen on workers. `etl-report.jsonl` is written by the local process as calls finish, so it is on your machine. This script does not use `/workspace/shared`.

## Run it

```bash
python main.py
```

Calls can finish in any order. The report follows completion order rather than S3 key order.

`ON CONFLICT (event_id) DO NOTHING` makes a rerun safe when an event ID should be inserted only once. It does not update an existing event whose other fields changed.

If a file raises an exception, Burla raises it in the local process. Inserts already committed by other calls remain in Postgres, and the idempotent statement lets you rerun the same date.
