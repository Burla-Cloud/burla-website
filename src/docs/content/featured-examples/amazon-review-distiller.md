---
cover: /docs-assets/more-examples/amazon-review-distiller-cover.webp
coverY: 0
---

# Ranking 572M Amazon reviews

In this example we:

* Stream 275 GB of Amazon review JSONL from HuggingFace.
* Split 34 category files into 545 byte-range chunks instead of downloading everything first.
* Find the most absurd ones (build the wall of rants & unhinged mode) with deterministic scoring.

The goal is not just a funny sample. The repo parses 571,544,386 reviews, keeps tiny top-K heaps per shard, merges them into category findings, then runs a second worst-of-worst pass for censored strong profanity and categorized slur hits.

### Dataset: Amazon Reviews 2023

The raw dataset is a set of large JSONL files, one per category. We stream byte ranges so each worker owns a slice of a file.

```python
import heapq
import json
import math
from pathlib import Path

import requests
from burla import remote_parallel_map
from huggingface_hub import HfApi

REPO_ID = "McAuley-Lab/Amazon-Reviews-2023"
HF_BASE = f"https://huggingface.co/datasets/{REPO_ID}/resolve/main/"
SHARD_DIR = Path("/workspace/shared/amazon-reviews/shards")
FINAL_DIR = Path("/workspace/shared/amazon-reviews/final")
TOP_K_PER_SHARD = 200
```

### Step 1: Plan byte ranges

Each category file is huge, so we turn it into roughly 500 MB jobs and keep one byte range per worker.

```python
def plan_chunks(chunk_mb: int = 500) -> list[dict]:
    infos = HfApi().list_repo_tree(
        REPO_ID,
        path_in_repo="raw/review_categories",
        repo_type="dataset",
        recursive=False,
    )
    files = sorted(
        [(i.path, i.size) for i in infos if getattr(i, "size", 0) > 0],
        key=lambda kv: -kv[1],
    )

    jobs = []
    chunk_bytes = chunk_mb * 1024 * 1024
    for path, size in files:
        n = max(1, math.ceil(size / chunk_bytes))
        span = size // n
        cat = Path(path).stem
        for i in range(n):
            start = i * span
            end = (i + 1) * span if i < n - 1 else size
            jobs.append({"path": path, "start": start, "end": end, "chunk_id": f"{cat}_{i:03d}", "category": cat})
    return jobs

jobs = plan_chunks()
print(f"Built {len(jobs):,} byte-range jobs")
```

### Step 2: Stream records safely

The worker asks HuggingFace for a byte range, discards the first partial line when needed, and parses JSON rows.

```python
def stream_reviews(file_path: str, start: int, end: int):
    resp = requests.get(
        HF_BASE + file_path,
        headers={"Range": f"bytes={start}-{end - 1}"},
        stream=True,
        timeout=300,
    )
    buf = b""
    first_line = True
    for raw in resp.iter_content(chunk_size=1 << 16):
        buf += raw
        lines = buf.split(b"\n")
        buf = lines.pop()
        if first_line and start > 0 and lines:
            lines.pop(0)
        first_line = False
        for line in lines:
            yield json.loads(line)
```

Byte ranges are what make the job restartable. A failed chunk is just one file path plus two byte offsets.

### Step 3: Score one chunk

The main pass keeps a small heap of the funniest/highest-signal reviews. The worker writes its heap to shared storage and returns a compact report.

```python
def rant_score(review: dict) -> float:
    text = review.get("text") or ""
    return (
        text.count("!") * 0.2
        + sum(1 for c in text if c.isupper()) / max(len(text), 1)
        + 2.0 * ("refund" in text.lower())
        + 1.5 * ("never again" in text.lower())
    )

def process_main(job: dict) -> dict:
    heap = []
    rows = 0
    for review in stream_reviews(job["path"], job["start"], job["end"]):
        rows += 1
        score = rant_score(review)
        item = (score, review.get("asin", ""), {
            "category": job["category"],
            "asin": review.get("asin"),
            "rating": review.get("rating"),
            "title": review.get("title"),
            "text": (review.get("text") or "")[:2_000],
            "score": score,
        })
        if len(heap) < TOP_K_PER_SHARD:
            heapq.heappush(heap, item)
        elif score > heap[0][0]:
            heapq.heapreplace(heap, item)

    SHARD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SHARD_DIR / f"{job['chunk_id']}.json"
    out_path.write_text(json.dumps([item[2] for item in sorted(heap, reverse=True)]) + "\n")
    return {"chunk_id": job["chunk_id"], "rows": rows, "path": str(out_path)}
```

### Step 4: Run both scoring passes

The main pass scores profanity, caps, rants, five-star mismatch, and punctuation storms. The worst pass hunts censored strong profanity and categorized slur hits for Unhinged Mode.

`process_worst` has the same input and output shape as `process_main`; only the scoring rules are stricter.

```python
test = remote_parallel_map(
    process_main,
    jobs[:1],
    func_cpu=1,
    func_ram=4,
)[0]

print(test)
```

```python
main_results = remote_parallel_map(
    process_main, jobs, func_cpu=1, func_ram=4,
    grow=True, max_parallelism=1000, spinner=True,
)

worst_results = remote_parallel_map(
    process_worst, jobs, func_cpu=1, func_ram=4,
    grow=True, max_parallelism=1000, spinner=True,
)
```

### Step 5: Reduce into site artifacts

One reducer merges the main shards into the Wall of Rants. Another merges the worst-of-worst shards. A final local analysis step handles rescoring, deduping, search pools, category findings, and the Unhinged Mode JSON.

```python
[main] = remote_parallel_map(reduce_main, [0], grow=True, spinner=True)
[worst] = remote_parallel_map(reduce_worst, [0], grow=True, spinner=True)

FINAL_DIR.mkdir(parents=True, exist_ok=True)
(FINAL_DIR / "ard_reduced.json").write_text(json.dumps(main))
(FINAL_DIR / "ard_worst.json").write_text(json.dumps(worst))

# Then run: python analysis.py
```
