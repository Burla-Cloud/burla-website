---
cover: /docs-assets/more-examples/terabyte-etl-cover.webp
coverY: 0
---

# Process database rows without building a queue

In this example we:

* Split an indexed PostgreSQL table into non-overlapping ID ranges.
* Run one worker per range.
* Return small aggregate reports instead of raw rows.
* Use `max_parallelism` so the database remains the constraint, not the cluster.

This is the pattern I would use for a backfill where the source of truth is still the database. The goal is not to replace SQL. The goal is to run ordinary Python over many row ranges without turning one script into a queueing system.

### Dataset: an `orders` table

Assume the table has an indexed integer `id` column and a `status`, `amount`, and `updated_at` column.

The workers need a database URL they can reach from the Burla cluster. Do not use `localhost` unless the database is actually inside the worker.

```python
import os
from dataclasses import dataclass

import psycopg2
from burla import remote_parallel_map

DATABASE_URL = os.environ["DATABASE_URL"]
ROWS_PER_RANGE = 25_000
MAX_DB_CONNECTIONS = 20
```

`DATABASE_URL` is read on your machine, and the value is captured into the pickled function when the job starts (see [Pass API keys & secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers)).

### Step 1: Build ID ranges

First ask the database for the range you intend to scan. Then split that range into jobs.

```python
@dataclass(frozen=True)
class IdRange:
    start_id: int
    end_id: int

def get_id_bounds() -> tuple[int, int]:
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT min(id), max(id) FROM orders WHERE updated_at >= current_date - interval '1 day'")
            return cur.fetchone()

def build_id_ranges(start_id: int, end_id: int, rows_per_range: int) -> list[IdRange]:
    return [
        IdRange(start, min(start + rows_per_range - 1, end_id))
        for start in range(start_id, end_id + 1, rows_per_range)
    ]

start_id, end_id = get_id_bounds()
id_ranges = build_id_ranges(start_id, end_id, ROWS_PER_RANGE)

print(f"Built {len(id_ranges):,} ID ranges")
```

ID ranges are easy to reason about because they do not overlap. They also make reruns obvious: rerun the failed ranges.

### Step 2: Process one range

Each worker opens its own database connection, runs one bounded query, and returns a small aggregate.

```python
def summarize_order_range(id_range: IdRange) -> dict:
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    count(*) AS row_count,
                    count(*) FILTER (WHERE status = 'paid') AS paid_count,
                    coalesce(sum(amount) FILTER (WHERE status = 'paid'), 0) AS paid_amount
                FROM orders
                WHERE id BETWEEN %s AND %s
                """,
                (id_range.start_id, id_range.end_id),
            )
            row_count, paid_count, paid_amount = cur.fetchone()

    return {
        "start_id": id_range.start_id,
        "end_id": id_range.end_id,
        "row_count": int(row_count),
        "paid_count": int(paid_count),
        "paid_amount": float(paid_amount),
    }
```

If the worker needs to update rows, make the write idempotent. For read-only analytics, keep it read-only.

### Step 3: Smoke test one range

Test one small range before opening many database connections.

```python
test_result = remote_parallel_map(
    summarize_order_range,
    id_ranges[:1],
    func_cpu=1,
    func_ram=2,
)[0]

print(test_result)
```

This catches network access, credentials, package installs, and SQL mistakes before the full backfill starts.

### Step 4: Run the full range list

`max_parallelism` is the important line. It is the number of live workers allowed to hit the database at once.

```python
range_results = remote_parallel_map(
    summarize_order_range,
    id_ranges,
    func_cpu=1,
    func_ram=2,
    max_parallelism=MAX_DB_CONNECTIONS,
    grow=True,
)
```

### Step 5: Reduce the results

The client combines the small per-range reports.

```python
summary = {
    "ranges": len(range_results),
    "rows": sum(row["row_count"] for row in range_results),
    "paid_orders": sum(row["paid_count"] for row in range_results),
    "paid_amount": sum(row["paid_amount"] for row in range_results),
}

print(summary)
```
