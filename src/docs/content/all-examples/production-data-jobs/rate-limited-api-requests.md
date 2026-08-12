---
cover: /docs-assets/more-examples/rate-limited-api-requests-cover.webp
coverY: 0
---

# Make millions of API calls without lying about the rate cap

In this example we:

* Split 2,000,000 ids into 2,000 chunks.
* Run up to 1,000 Burla workers.
* Sleep inside each worker so the global rate stays around 1,000 requests per second.
* Stream successful rows and retryable failures to a JSONL output.

A 5,000-id test does not tell you much if it never hits the provider's real limit.

### Dataset: user ids to backfill

The input is a plain text file with one user id per line.

```python
import json
import os
import time
from pathlib import Path

import httpx
from burla import remote_parallel_map

API_KEY = os.environ["API_KEY"]
OUT_PATH = Path("/workspace/shared/api-backfill/users.jsonl")
CHUNK = 1_000
MAX_PARALLELISM = 1_000
SECONDS_BETWEEN_CALLS_PER_WORKER = 1.0
```

`API_KEY` is read on your machine, and the value is captured into the pickled function when the job starts (see [Pass API keys & secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers)).

### Step 1: Chunk the ids

Each chunk is large enough to amortize startup and small enough to stream results as it finishes.

```python
with open("user_ids.txt") as f:
    user_ids = [line.strip() for line in f if line.strip()]

chunks = [user_ids[i:i + CHUNK] for i in range(0, len(user_ids), CHUNK)]

print(f"Built {len(chunks):,} chunks for {len(user_ids):,} ids")
```

### Step 2: Put pacing near the HTTP call

The worker owns local pacing and retry behavior. A 429 becomes a paced retry, not a cluster-wide retry storm.

```python
def enrich_chunk(ids: list[str]) -> list[dict]:
    out = []
    headers = {"Authorization": f"Bearer {API_KEY}"}

    with httpx.Client(timeout=30.0, headers=headers) as client:
        for uid in ids:
            for attempt in range(5):
                try:
                    response = client.get(f"https://api.example.com/v1/users/{uid}")
                    if response.status_code == 429:
                        time.sleep(float(response.headers.get("Retry-After", 2 ** attempt)))
                        continue
                    response.raise_for_status()
                    out.append({"user_id": uid, "ok": True, **response.json()})
                    break
                except httpx.HTTPError as exc:
                    if attempt == 4:
                        out.append({"user_id": uid, "ok": False, "error": repr(exc)})
                    else:
                        time.sleep(2 ** attempt)

            time.sleep(SECONDS_BETWEEN_CALLS_PER_WORKER)

    return out
```

### Step 3: Cap live workers

`max_parallelism` is the global throttle.

```python
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with OUT_PATH.open("w") as f:
    for rows in remote_parallel_map(
        enrich_chunk,
        chunks,
        func_cpu=1,
        func_ram=2,
        max_parallelism=MAX_PARALLELISM,
        generator=True,
        grow=True,
    ):
        for row in rows:
            f.write(json.dumps(row) + "\n")

print(OUT_PATH)
```
