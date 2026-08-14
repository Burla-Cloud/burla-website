---
cover: /docs-assets/more-examples/terabyte-etl-cover.webp
coverY: 0
description: Backfill non-overlapping ID ranges while capping database connections.
---

# Backfill database rows without a queue

Split an indexed PostgreSQL table into ID ranges and process those ranges in parallel. This example extracts the hostname from each customer's website and writes it back to the table.

## Before you run this

1. Complete [Getting Started](/docs/get-started).
2. Make PostgreSQL reachable from the Burla workers.
3. Use a `customers` table with an indexed integer `id`, a `website` column, and a nullable `website_host` column.

Install the PostgreSQL driver and set the connection string on your machine:

```bash
pip install "psycopg[binary]"
export DATABASE_URL="<postgres-connection-string>"
```

## Step 1: Build ID ranges

Read the bounds remotely so only the workers need network access to PostgreSQL:

```python
import os
from urllib.parse import urlsplit

import psycopg
from burla import remote_parallel_map

DATABASE_URL = os.environ["DATABASE_URL"]
IDS_PER_CALL = 10_000
MAX_DB_CONNECTIONS = 20

def get_id_bounds(_):
    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT min(id), max(id)
                FROM customers
                WHERE website IS NOT NULL AND website_host IS NULL
                """
            )
            return cursor.fetchone()

first_id, last_id = remote_parallel_map(get_id_bounds, [None])[0]
if first_id is None:
    raise SystemExit("No rows need this backfill")

id_ranges = [
    (start, min(start + IDS_PER_CALL, last_id + 1))
    for start in range(first_id, last_id + 1, IDS_PER_CALL)
]
print(f"Built {len(id_ranges):,} ID ranges")
```

## Step 2: Backfill one range

Each call reads and updates one half-open range: `start_id <= id < end_id`.

```python
def backfill_website_hosts(start_id, end_id):
    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, website
                FROM customers
                WHERE id >= %s AND id < %s
                  AND website IS NOT NULL
                  AND website_host IS NULL
                """,
                (start_id, end_id),
            )
            updates = []
            for customer_id, website in cursor:
                value = website if "://" in website else f"https://{website}"
                hostname = urlsplit(value).hostname
                if hostname:
                    updates.append((hostname.lower(), customer_id))

            cursor.executemany(
                """
                UPDATE customers
                SET website_host = %s
                WHERE id = %s AND website_host IS NULL
                """,
                updates,
            )
            return len(updates)
```

## Step 3: Run the backfill

Set `MAX_DB_CONNECTIONS` to the number of connections the database can spare. Each call opens one connection, so `max_parallelism` keeps the job at or below that limit:

```python
updated_counts = remote_parallel_map(
    backfill_website_hosts,
    id_ranges,
    max_parallelism=MAX_DB_CONNECTIONS,
    grow=True,
)
print(f"Updated {sum(updated_counts):,} customers")
```

The `website_host IS NULL` condition makes reruns skip completed rows. `DATABASE_URL` is read on your machine and sent with the function; Burla does not copy worker environment variables. See [Pass API keys and secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers).
