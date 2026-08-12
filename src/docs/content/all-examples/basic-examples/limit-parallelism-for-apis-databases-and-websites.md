---
cover: /docs-assets/how-to-guides/limit-parallelism-cover.webp
coverY: 0
description: Cap concurrent function calls around an API or database.
---

# Limit parallelism for APIs or databases

Set `max_parallelism` to the number of function calls an external service can safely handle at once. Burla queues the remaining inputs. Without this setting, the limit defaults to the number of inputs.

## Limit concurrent API requests

Assume `customer_ids.txt` contains one customer ID per line, and your API URL and token are set as environment variables.

```python
import os

import httpx
from burla import remote_parallel_map

API_URL = os.environ["API_URL"]
API_TOKEN = os.environ["API_TOKEN"]

def fetch_customer(customer_id):
    response = httpx.get(
        f"{API_URL}/customers/{customer_id}",
        headers={"Authorization": f"Bearer {API_TOKEN}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()

with open("customer_ids.txt") as f:
    customer_ids = [line.strip() for line in f]

customers = remote_parallel_map(
    fetch_customer,
    customer_ids,
    max_parallelism=20,
)
```

Each function call sends one request, so no more than 20 requests are in flight at once. If the cluster has fewer than 20 available slots, Burla uses the smaller number.

`API_TOKEN` is read on your machine and captured into the function sent to workers. See [Pass API keys & secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers).

## Limit database connections

Apply the same rule to database connections. If each function call opens one connection and your job may use 12 connections, set `max_parallelism=12`. If each call opens two connections, set it to 6.

Reserve enough connections for the application, migrations, and administrative queries.

## Concurrency is not a rate limit

`max_parallelism` limits concurrent function calls, not requests per second or tokens per minute. A concurrency of 20 can produce different request rates as latency changes.

For a rate-based quota, pace requests inside the function or use the provider's rate-limiting mechanism.
