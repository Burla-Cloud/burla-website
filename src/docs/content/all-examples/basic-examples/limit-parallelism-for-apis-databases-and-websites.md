---
cover: /docs-assets/how-to-guides/limit-parallelism-cover.webp
coverY: 0
description: Keep Burla jobs inside external service limits.
---

# Limit parallelism for APIs or databases.

Use this when the slowest or most fragile part of your job is outside Burla. Do not use every available CPU when an API quota, website, database, or model provider is the real limit. The unit of work is usually a chunk of IDs, URLs, prompts, files, or database ranges. Each worker should reuse one client or connection inside that chunk. The output should include successes and failures so you can retry only the work that failed.

Parallelism is not always the target. Sometimes the target is finishing the whole job without breaking the contract with another system.

## Start from the external limit

Write down the real limit first.

Examples:

1. API: 1,000 requests per second
2. website: 2 requests per second per worker, plus a global worker cap
3. Postgres: 200 safe write connections
4. LLM provider: 60,000 tokens per minute
5. vector database: 100 concurrent upsert batches

Then choose:

1. chunk size
2. per-worker pacing
3. `max_parallelism`

The rough formula is:

```
global throughput = live workers * per-worker throughput
```

If each worker makes one request per second and you set `max_parallelism=500`, your job tries to make about 500 requests per second.

## Chunk IDs for an API backfill

Plan chunks on the client.

```python
def chunks(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]


with open("user_ids.txt") as f:
    user_ids = [line.strip() for line in f if line.strip()]

id_chunks = chunks(user_ids, 1000)
```

Put pacing and provider behavior next to the HTTP call.

```python
import os
import time
import httpx
def enrich_users(user_ids):

    rows = []
    headers = {"Authorization": f"Bearer {os.environ['API_TOKEN']}"}
    with httpx.Client(timeout=30.0, headers=headers) as client:
        for user_id in user_ids:
            response = client.get(f"https://api.example.com/v1/users/{user_id}")
            if response.status_code == 429:
                rows.append({"user_id": user_id, "ok": False, "status": 429})
            else:
                response.raise_for_status()
                rows.append({"user_id": user_id, "ok": True, "profile": response.json()})
            time.sleep(1.0)
    return rows
```

Cap live workers with `max_parallelism`.

```python
import json
from burla import remote_parallel_map

with open("profiles.jsonl", "w") as f:
    for rows in remote_parallel_map(
        enrich_users,
        id_chunks,
        func_cpu=1,
        func_ram=2,
        max_parallelism=500,
        generator=True,
        grow=True,
    ):
        for row in rows:
            f.write(json.dumps(row) + "\n")
```

The JSONL file is the output and the retry manifest. Failed rows are visible.

## Keep one database connection per worker

For databases, count connections before CPUs.

If each worker opens one connection and Postgres can safely handle 80 write connections, start with `max_parallelism=80`.

```python
import gzip
import json
import os
import boto3
import psycopg2
from psycopg2.extras import execute_values
def load_file_to_postgres(key):

    body = boto3.client("s3").get_object(Bucket="my-events", Key=key)["Body"].read()
    rows = [json.loads(line) for line in gzip.decompress(body).splitlines()]
    values = [(row["event_id"], row["user_id"], row["ts"]) for row in rows]

    connection = psycopg2.connect(os.environ["DATABASE_URL"])
    with connection, connection.cursor() as cursor:
        execute_values(
            cursor,
            "INSERT INTO events(event_id, user_id, ts) VALUES %s ON CONFLICT DO NOTHING",
            values,
            page_size=1000,
        )
    connection.close()
    return {"key": key, "rows": len(values)}
```

```python
for report in remote_parallel_map(
    load_file_to_postgres,
    s3_keys,
    func_cpu=1,
    func_ram=2,
    max_parallelism=80,
    generator=True,
    grow=True,
):
    print(report["key"], report["rows"])
```

The bottleneck here is not Python. It is the sink.

## Be polite to websites

For static pages, one worker should keep one HTTP client open for a chunk of URLs.

```python
import random
import time
import httpx
from selectolax.parser import HTMLParser
def scrape_urls(urls):

    rows = []
    with httpx.Client(http2=True, timeout=20.0, follow_redirects=True) as client:
        for url in urls:
            try:
                response = client.get(url)
                if response.status_code in (429, 503):
                    rows.append({"url": url, "ok": False, "status": response.status_code})
                else:
                    response.raise_for_status()
                    title = HTMLParser(response.text).css_first("title")
                    rows.append({"url": url, "ok": True, "title": title.text(strip=True) if title else None})
            except httpx.HTTPError as error:
                rows.append({"url": url, "ok": False, "error": str(error)})
            time.sleep(0.5 + random.random() * 0.5)
    return rows
```

```python
url_chunks = chunks(urls, 500)

import json

with open("scrape-results.jsonl", "w") as f:
    for rows in remote_parallel_map(
        scrape_urls,
        url_chunks,
        func_cpu=1,
        func_ram=2,
        max_parallelism=200,
        generator=True,
        grow=True,
    ):
        for row in rows:
            f.write(json.dumps(row) + "\n")
```

For pages that need JavaScript, use a browser image or a browser-specific tool. Do not pretend `httpx` tested the same thing.

## Model providers and token limits

For an LLM provider, the limit is often tokens per minute, not requests per second.

Estimate tokens per input, then choose a chunk size and worker count that stay below the limit.

```python
PROMPTS_PER_WORKER = 20
SECONDS_BETWEEN_PROMPTS = 2.0
MAX_WORKERS = 50

prompt_chunks = chunks(prompts, PROMPTS_PER_WORKER)
```

This tries to send about 25 prompts per second across the job:

```
50 workers * 1 prompt every 2 seconds = 25 prompts per second
```

If the provider bills or limits by token, reduce worker count when prompts or outputs get longer.

## Choose the first value for max\_parallelism

Start lower than the theoretical limit.

Examples:

1. API allows 1,000 requests per second. Start at 500.
2. Postgres has 200 available connections. Start at 80.
3. Website tolerated 100 workers in a test. Start at 50.
4. GPU quota allows 16 workers. Start at 8.
5. Vector database allows 100 upserts. Start at 40.

Raise the cap after you see clean logs, stable latency, and no growing error rate.

## Examples that use this pattern

* [Make millions of API calls without lying about the rate cap](/docs/all-examples/production-data-jobs/rate-limited-api-requests)
* [Scrape the archive, not the easy page sample](/docs/all-examples/production-data-jobs/parallel-web-scraping)
* [Run the file-drop ETL before it becomes a platform project](/docs/all-examples/production-data-jobs/python-etl-no-airflow)
* [Process data in your database quickly](/docs/all-examples/basic-examples/process-data-in-your-database-quickly)
* [Summarize a million READMEs without calling an LLM](/docs/all-examples/data-processing-examples/github-repo-summarizer)
