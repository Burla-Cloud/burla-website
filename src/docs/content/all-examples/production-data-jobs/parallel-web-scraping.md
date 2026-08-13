---
description: Scrape authorized static pages in parallel across hosts while pacing each host sequentially.
---

# Scrape static pages without overwhelming one host

This example groups URLs by origin, then runs one remote call per origin. Origins can run in parallel, while requests to the same origin remain sequential and wait between pages.

The URL list belongs to you. The [repository example](https://github.com/Burla-Cloud/examples/blob/main/parallel-web-scraping/main.py) uses a placeholder input and has no measured run, so this page does not claim a page count or runtime.

## Before you run

1. Complete [Getting Started](/docs/get-started).
2. Confirm that every target permits automated access under its terms and `robots.txt`.
3. Create `urls.txt` with one authorized `http` or `https` URL per line.
4. Install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install burla "httpx[http2]" selectolax
```

Set an identifying user agent, the number of origins that may run at once, and the delay between requests to one origin:

```bash
export SCRAPER_USER_AGENT="<bot-name and contact>"
export MAX_PARALLEL_HOSTS="<maximum-live-origins>"
export SECONDS_BETWEEN_REQUESTS="<per-origin-delay>"
```

Choose the delay from each site's published crawl policy. The script does not parse `robots.txt` for you.

## The scraper

Save the following as `main.py`:

```python
import json
import os
import time
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from burla import remote_parallel_map
from selectolax.parser import HTMLParser

USER_AGENT = os.environ["SCRAPER_USER_AGENT"]
MAX_PARALLEL_HOSTS = int(os.environ["MAX_PARALLEL_HOSTS"])
SECONDS_BETWEEN_REQUESTS = float(
    os.environ["SECONDS_BETWEEN_REQUESTS"]
)
MAX_ATTEMPTS = 4
OUT_PATH = Path("scraped.jsonl")

if MAX_PARALLEL_HOSTS < 1:
    raise ValueError("MAX_PARALLEL_HOSTS must be at least 1")
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


def scrape_origin(task: dict) -> list[dict]:
    rows = []

    with httpx.Client(
        http2=True,
        timeout=20.0,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=False,
    ) as client:
        for index, url in enumerate(task["urls"]):
            row = None

            for attempt in range(MAX_ATTEMPTS):
                try:
                    response = client.get(url)
                except httpx.TransportError as error:
                    if attempt == MAX_ATTEMPTS - 1:
                        row = {
                            "url": url,
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
                            "url": url,
                            "ok": False,
                            "status": response.status_code,
                        }
                    else:
                        time.sleep(retry_delay(response, attempt))
                    continue

                if response.is_redirect:
                    row = {
                        "url": url,
                        "ok": False,
                        "status": response.status_code,
                        "redirect": response.headers.get("Location"),
                    }
                    break

                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as error:
                    row = {
                        "url": url,
                        "ok": False,
                        "status": response.status_code,
                        "error": repr(error),
                    }
                else:
                    document = HTMLParser(response.text)
                    title = document.css_first("title")
                    row = {
                        "url": url,
                        "ok": True,
                        "status": response.status_code,
                        "title": (
                            title.text(strip=True)
                            if title is not None
                            else None
                        ),
                    }
                break

            if row is None:
                row = {
                    "url": url,
                    "ok": False,
                    "error": "retry attempts exhausted",
                }
            rows.append(row)

            if index < len(task["urls"]) - 1:
                time.sleep(SECONDS_BETWEEN_REQUESTS)

    return rows


urls_by_origin = defaultdict(list)
with open("urls.txt") as input_file:
    for line in input_file:
        url = line.strip()
        if not url:
            continue

        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(f"Invalid URL: {url}")

        origin = f"{parsed.scheme}://{parsed.netloc}"
        urls_by_origin[origin].append(url)

tasks = [
    {"urls": urls}
    for urls in urls_by_origin.values()
]

with OUT_PATH.open("w") as output_file:
    for rows in remote_parallel_map(
        scrape_origin,
        tasks,
        max_parallelism=MAX_PARALLEL_HOSTS,
        generator=True,
    ):
        for row in rows:
            output_file.write(json.dumps(row) + "\n")

print(OUT_PATH)
```

One task contains every URL for one origin, so this job never issues two requests to that origin at once. `max_parallelism` caps the number of origins being processed concurrently. Separate scraper jobs do not coordinate with each other.

The scraper records redirects instead of following them into an origin with a separate task. The parser reads the HTML returned by the server and does not run JavaScript. Each failed page becomes a JSONL row rather than disappearing from the result.

HTTP requests happen on workers. `scraped.jsonl` is written by the local process as origin tasks finish, so rows are grouped by completion rather than input order. This script does not use `/workspace/shared`.

## Run it

```bash
python main.py
```
