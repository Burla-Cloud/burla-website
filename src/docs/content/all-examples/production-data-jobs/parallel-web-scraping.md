# Scrape static pages without overwhelming one host

In this example we:

* Group authorized URLs by hostname.
* Run one remote call per host.
* Pace requests to each host sequentially.
* Stream compact page records into a local JSONL file.

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

Set an identifying user agent, the number of hosts that may run at once, and the delay between requests to one host:

```bash
export SCRAPER_USER_AGENT="<bot-name and contact>"
export MAX_PARALLEL_HOSTS="<maximum-live-hosts>"
export SECONDS_BETWEEN_REQUESTS="<per-host-delay>"
```

Choose the delay from each site's published crawl policy. The script does not parse `robots.txt` for you.

## 1. Configure the scraper

Create `main.py` and add the next five blocks in order. Start with the request and concurrency settings:

```python
import json
import os
import time
from collections import defaultdict
from urllib.parse import urlsplit

import httpx
from burla import remote_parallel_map
from selectolax.parser import HTMLParser

USER_AGENT = os.environ["SCRAPER_USER_AGENT"]
MAX_PARALLEL_HOSTS = int(os.environ["MAX_PARALLEL_HOSTS"])
SECONDS_BETWEEN_REQUESTS = float(os.environ["SECONDS_BETWEEN_REQUESTS"])
MAX_ATTEMPTS = 4
OUT_PATH = "scraped.jsonl"

if MAX_PARALLEL_HOSTS < 1:
    raise ValueError("MAX_PARALLEL_HOSTS must be at least 1")
if SECONDS_BETWEEN_REQUESTS < 0:
    raise ValueError("SECONDS_BETWEEN_REQUESTS cannot be negative")
```

## 2. Scrape one host

One remote call reuses one HTTP client and visits one host's pages sequentially:

```python
def retry_delay(response, attempt):
    retry_after = response.headers.get("Retry-After")
    if retry_after is not None:
        try:
            return max(0.0, float(retry_after))
        except ValueError:
            pass
    return 2 ** attempt


def scrape_host(urls):
    rows = []

    with httpx.Client(
        http2=True, timeout=20, headers={"User-Agent": USER_AGENT}, follow_redirects=False
    ) as client:
        for index, url in enumerate(urls):
            for attempt in range(MAX_ATTEMPTS):
                try:
                    response = client.get(url)
                except httpx.TransportError as error:
                    if attempt < MAX_ATTEMPTS - 1:
                        time.sleep(2 ** attempt)
                        continue
                    row = {"url": url, "ok": False, "error": repr(error)}
                    break

                if response.status_code == 429 or response.status_code >= 500:
                    if attempt < MAX_ATTEMPTS - 1:
                        time.sleep(retry_delay(response, attempt))
                        continue
                    row = {"url": url, "ok": False, "status": response.status_code}
                    break

                if response.is_redirect:
                    row = {
                        "url": url, "ok": False, "status": response.status_code,
                        "redirect": response.headers.get("Location"),
                    }
                    break

                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as error:
                    row = {
                        "url": url, "ok": False, "status": response.status_code,
                        "error": repr(error),
                    }
                else:
                    title = HTMLParser(response.text).css_first("title")
                    row = {
                        "url": url, "ok": True, "status": response.status_code,
                        "title": title.text(strip=True) if title is not None else None,
                    }
                break

            rows.append(row)

            if index < len(urls) - 1:
                time.sleep(SECONDS_BETWEEN_REQUESTS)

    return rows
```

## 3. Group URLs by host

Validate each URL and make one task per hostname:

```python
urls_by_host = defaultdict(list)
with open("urls.txt") as input_file:
    for line in input_file:
        url = line.strip()
        if not url:
            continue

        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"} or parsed.hostname is None:
            raise ValueError(f"Invalid URL: {url}")

        urls_by_host[parsed.hostname.lower()].append(url)

tasks = list(urls_by_host.values())
```

## 4. Run hosts in parallel

Submit one task per host:

```python
completed_hosts = remote_parallel_map(
    scrape_host, tasks, max_parallelism=MAX_PARALLEL_HOSTS, generator=True
)
```

## 5. Write results locally

Stream page records to a local JSONL file:

```python
with open(OUT_PATH, "w") as output_file:
    for rows in completed_hosts:
        output_file.writelines(json.dumps(row) + "\n" for row in rows)

print(OUT_PATH)
```

One task contains every URL for one hostname, so this job never issues two requests to that host at once. `max_parallelism` caps the number of hosts being processed concurrently. Separate scraper jobs do not coordinate with each other.

The scraper records redirects instead of following them to another host. The parser reads the HTML returned by the server and does not run JavaScript. Each failed page becomes a JSONL row rather than disappearing from the result.

HTTP requests happen on workers. `scraped.jsonl` is written by the local process as host tasks finish, so rows are grouped by completion rather than input order. This script does not use `/workspace/shared`.

## Run it

```bash
python main.py
```
