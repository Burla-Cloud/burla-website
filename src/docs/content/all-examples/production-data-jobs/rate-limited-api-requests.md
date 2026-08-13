---
cover: /docs-assets/more-examples/rate-limited-api-requests-cover.webp
coverY: 0
description: Backfill an HTTP API with bounded concurrency, local pacing, and retryable error handling.
---

# Backfill a rate-limited API with bounded concurrency

This example splits a text file of user IDs into remote calls. Each call reuses one HTTP client, processes its IDs sequentially, waits between requests, and retries `429` and `5xx` responses.

The endpoint and input IDs belong to you. The [repository example](https://github.com/Burla-Cloud/examples/blob/main/rate-limited-api-requests/main.py) uses a placeholder endpoint and has no measured run, so this page does not claim a request count or runtime.

{% hint style="warning" %}
`max_parallelism` limits concurrent function calls. It is not a strict account-wide requests-per-second limiter. Calls start independently, so the job can send an initial burst of up to one request per live call. Use a provider-supported batch API, API gateway, or shared rate limiter when the quota must never be exceeded.
{% endhint %}

## Before you run

1. Complete [Getting Started](/docs/get-started).
2. Confirm that the API can be reached from workers in your selected cloud.
3. Create `user_ids.txt` with one ID per line.
4. Install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install burla httpx
```

This template expects `GET <base-url>/v1/users/<id>` to accept a bearer token and return JSON. Adapt the URL and authentication for your provider, then set its controls:

```bash
export API_BASE_URL="<https://provider.example>"
export API_KEY="<api-key>"
export CHUNK_SIZE="<ids-per-remote-call>"
export MAX_PARALLELISM="<maximum-live-calls>"
export SECONDS_BETWEEN_REQUESTS="<delay-within-each-call>"
```

Choose the values from the provider's documented limits. `MAX_PARALLELISM` bounds simultaneous chunks. The delay paces each chunk after its first request.

## The backfill script

Save the following as `main.py`:

```python
import json
import os
import time
from pathlib import Path
from urllib.parse import quote

import httpx
from burla import remote_parallel_map

API_BASE_URL = os.environ["API_BASE_URL"].rstrip("/")
API_KEY = os.environ["API_KEY"]
CHUNK_SIZE = int(os.environ["CHUNK_SIZE"])
MAX_PARALLELISM = int(os.environ["MAX_PARALLELISM"])
SECONDS_BETWEEN_REQUESTS = float(
    os.environ["SECONDS_BETWEEN_REQUESTS"]
)
MAX_ATTEMPTS = 5
OUT_PATH = Path("users.jsonl")

if CHUNK_SIZE < 1:
    raise ValueError("CHUNK_SIZE must be at least 1")
if MAX_PARALLELISM < 1:
    raise ValueError("MAX_PARALLELISM must be at least 1")
if SECONDS_BETWEEN_REQUESTS < 0:
    raise ValueError("SECONDS_BETWEEN_REQUESTS cannot be negative")


def retry_delay(response: httpx.Response, attempt: int) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after is not None:
        try:
            return max(0.0, float(retry_after))
        except ValueError:
            pass
    return float(2 ** attempt)


def enrich_chunk(user_ids: list[str]) -> list[dict]:
    rows = []
    headers = {"Authorization": f"Bearer {API_KEY}"}

    with httpx.Client(
        timeout=30.0,
        headers=headers,
        follow_redirects=True,
    ) as client:
        for index, user_id in enumerate(user_ids):
            row = None

            for attempt in range(MAX_ATTEMPTS):
                try:
                    response = client.get(
                        f"{API_BASE_URL}/v1/users/"
                        f"{quote(user_id, safe='')}"
                    )
                except httpx.TransportError as error:
                    if attempt == MAX_ATTEMPTS - 1:
                        row = {
                            "user_id": user_id,
                            "ok": False,
                            "error": repr(error),
                        }
                    else:
                        time.sleep(2 ** attempt)
                    continue

                retryable = (
                    response.status_code == 429
                    or response.status_code >= 500
                )
                if retryable:
                    if attempt == MAX_ATTEMPTS - 1:
                        row = {
                            "user_id": user_id,
                            "ok": False,
                            "status": response.status_code,
                        }
                    else:
                        time.sleep(retry_delay(response, attempt))
                    continue

                try:
                    response.raise_for_status()
                    data = response.json()
                except (httpx.HTTPStatusError, ValueError) as error:
                    row = {
                        "user_id": user_id,
                        "ok": False,
                        "status": response.status_code,
                        "error": repr(error),
                    }
                else:
                    row = {
                        "user_id": user_id,
                        "ok": True,
                        "data": data,
                    }
                break

            if row is None:
                row = {
                    "user_id": user_id,
                    "ok": False,
                    "error": "retry attempts exhausted",
                }
            rows.append(row)

            if index < len(user_ids) - 1:
                time.sleep(SECONDS_BETWEEN_REQUESTS)

    return rows


with open("user_ids.txt") as input_file:
    user_ids = [
        line.strip()
        for line in input_file
        if line.strip()
    ]

chunks = [
    user_ids[start:start + CHUNK_SIZE]
    for start in range(0, len(user_ids), CHUNK_SIZE)
]

with OUT_PATH.open("w") as output_file:
    for rows in remote_parallel_map(
        enrich_chunk,
        chunks,
        max_parallelism=MAX_PARALLELISM,
        generator=True,
    ):
        for row in rows:
            output_file.write(json.dumps(row) + "\n")

print(OUT_PATH)
```

`API_KEY` is read by the local process and sent with the function because `enrich_chunk` references it. Burla does not copy your environment to workers. See [Pass API keys and secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers).

The HTTP calls happen on workers. `users.jsonl` is written by the local process, and chunk results arrive in completion order. This script does not use `/workspace/shared`.

## Run it

```bash
python main.py
```
