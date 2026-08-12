---
cover: /docs-assets/more-examples/parallel-web-scraping-cover.webp
coverY: 0
---

# Scrape the archive, not the easy page sample

In this example we:

* Read 1,000,000 URLs from a file.
* Scrape them in 500-URL chunks.
* Stream JSONL rows with either parsed fields or errors.
* Keep retry and politeness rules inside the worker.

The stale pages, redirects, 503s, and broken HTML are the dataset. A happy-path sample filters out the part you most need to measure.

### Dataset: URL archive

The input is a text file with one URL per line.

```python
import json
import random
import time
from pathlib import Path

import httpx
from burla import remote_parallel_map
from selectolax.parser import HTMLParser

OUT_PATH = Path("/workspace/shared/web-scrape/pages.jsonl")
CHUNK = 500
MAX_PARALLELISM = 1_000
```

### Step 1: Chunk URLs

The client only plans work. Each worker gets a chunk.

```python
with open("urls.txt") as f:
    urls = [u.strip() for u in f if u.strip()]

chunks = [urls[i:i + CHUNK] for i in range(0, len(urls), CHUNK)]

print(f"Built {len(chunks):,} chunks for {len(urls):,} URLs")
```

### Step 2: Fetch and parse inside the worker

The worker keeps one HTTP client open, backs off on temporary failures, and returns an error row when a page fails.

```python
def scrape_chunk(urls: list[str]) -> list[dict]:
    out = []
    with httpx.Client(http2=True, timeout=20.0, follow_redirects=True) as client:
        for url in urls:
            for attempt in range(4):
                try:
                    r = client.get(url)
                    if r.status_code in (429, 503):
                        time.sleep(2 ** attempt + random.random())
                        continue
                    r.raise_for_status()
                    tree = HTMLParser(r.text)
                    title = tree.css_first("title")
                    out.append({"url": url, "title": title.text(strip=True) if title else None})
                    break
                except (httpx.HTTPError, httpx.TimeoutException) as e:
                    if attempt == 3:
                        out.append({"url": url, "error": str(e)})
            time.sleep(0.5 + random.random() * 0.5)
    return out
```

Returning error rows is important. A failed page is still data about the archive.

### Step 3: Stream the crawl

Chunks stream back as they finish, so the scrape can run for hours without building one giant result list.

```python
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with OUT_PATH.open("w") as f:
    for rows in remote_parallel_map(
        scrape_chunk,
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
