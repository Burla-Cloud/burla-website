# Rank 571 million Amazon reviews with byte-range map-reduce

In this example we:

* Discover 275 GB of newline-delimited Amazon review files.
* Divide the files into 545 newline-aligned byte ranges.
* Score every range in parallel while retaining only its top 100 reviews.
* Reduce the shared candidate shards into one global top 100.

The archived run parsed 571,544,386 records from [Amazon Reviews 2023](https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023), with more than 500 calls running at peak. The example below focuses on one deterministic strong-language ranking.

{% hint style="warning" %}
The output contains uncensored review text and profanity.
{% endhint %}

## Before you run

Complete [Getting Started](/docs/get-started), then download the scoring lexicon and install the dependencies:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/amazon-review-distiller
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla huggingface-hub requests
burla deploy
```

Each map call reserves 1 CPU and 4 GB of RAM. The candidate files move between the map and reduce calls through `/workspace/shared/amazon-review-ranking`.

{% hint style="warning" %}
The full run streams 275 GB and uses paid cloud compute.
{% endhint %}

## Build the script

Create `rank_reviews.py` beside the repository's `lexicon.py`. Each section below adds one step.

### 1. Configure the input and output

Use the strong and medium word lists from the checked-in lexicon:

```python
import heapq
import json
import math
from pathlib import Path

import requests
from burla import remote_parallel_map
from huggingface_hub import HfApi
from lexicon import MEDIUM_PROFANE, STRONG_PROFANE, WORD_RX

REPO_ID = "McAuley-Lab/Amazon-Reviews-2023"
DATASET_ROOT = f"https://huggingface.co/datasets/{REPO_ID}/resolve/main/"
SHARED_DIR = Path("/workspace/shared/amazon-review-ranking")

RANGE_SIZE = 500 * 1024 * 1024
TOP_K = 100
```

### 2. List the source files

Read each category file's size from Hugging Face:

```python
def list_source_files():
    entries = HfApi().list_repo_tree(
        REPO_ID, path_in_repo="raw/review_categories", repo_type="dataset", recursive=False
    )
    return sorted(
        ((entry.path, entry.size) for entry in entries
         if getattr(entry, "size", 0) > 0 and entry.path.endswith(".jsonl")),
        key=lambda item: item[0],
    )
```

The recorded dataset listing contained 34 category files.

### 3. Align each range boundary

A raw byte offset can land in the middle of a JSON record. Move each interior boundary to the byte after its next newline:

```python
def align_boundary(file_path, position, file_size):
    while position < file_size:
        stop = min(position + 64 * 1024 - 1, file_size - 1)
        response = requests.get(
            DATASET_ROOT + file_path, headers={"Range": f"bytes={position}-{stop}"}, timeout=60
        )
        if response.status_code != 206:
            raise RuntimeError(f"Range request returned {response.status_code}")

        newline = response.content.find(b"\n")
        if newline >= 0:
            return position + newline + 1
        position = stop + 1

    return file_size
```

Adjacent jobs now meet at a record boundary. No job needs to discard a partial first or last record.

### 4. Plan the byte ranges

Create roughly 500 MB jobs from those aligned boundaries:

```python
def plan_ranges(files):
    jobs = []

    for file_path, file_size in files:
        range_count = max(1, math.ceil(file_size / RANGE_SIZE))
        raw_boundaries = [index * file_size // range_count for index in range(range_count + 1)]
        boundaries = [0] + [
            align_boundary(file_path, offset, file_size) for offset in raw_boundaries[1:-1]
        ] + [file_size]

        category = Path(file_path).name.removesuffix(".jsonl")
        for index, (start, end) in enumerate(zip(boundaries, boundaries[1:])):
            if start == end:
                continue
            jobs.append((file_path, start, end, f"{category}_{index:03d}"))

    return jobs
```

Each tuple becomes the four arguments to one map call.

### 5. Stream one range

Because both offsets are newline-aligned, every yielded line is one complete JSON object:

```python
def stream_reviews(file_path, start, end):
    with requests.get(
        DATASET_ROOT + file_path,
        headers={"Range": f"bytes={start}-{end - 1}"},
        stream=True,
        timeout=300,
    ) as response:
        if response.status_code != 206:
            raise RuntimeError(f"Range request returned {response.status_code}")
        for line in response.iter_lines():
            if line:
                yield json.loads(line)
```

### 6. Score one review

Count exact lexicon matches and weight medium terms below strong terms:

```python
def score_review(text):
    words = WORD_RX.findall(text.lower())
    strong_hits = sum(word in STRONG_PROFANE for word in words)
    medium_hits = sum(word in MEDIUM_PROFANE for word in words)
    return strong_hits + 0.4 * medium_hits
```

This score is deliberately simple and deterministic. It does not infer tone or context.

### 7. Keep one bounded candidate shard

Maintain a 100-item min-heap while streaming the range:

```python
def process_range(file_path, start, end, chunk_id):
    candidates = []
    parsed_count = 0

    for review in stream_reviews(file_path, start, end):
        parsed_count += 1
        text = review.get("text") or ""
        score = score_review(text)
        if score <= 0:
            continue

        candidate = {
            "score": score, "text": text,
            "rating": review.get("rating"), "asin": review.get("asin"),
        }
        item = (score, parsed_count, candidate)

        if len(candidates) < TOP_K:
            heapq.heappush(candidates, item)
        elif score > candidates[0][0]:
            heapq.heapreplace(candidates, item)

    SHARED_DIR.mkdir(parents=True, exist_ok=True)
    (SHARED_DIR / f"{chunk_id}.json").write_text(json.dumps({
        "parsed_count": parsed_count,
        "candidates": [candidate for _, _, candidate in candidates],
    }))
```

Each map call writes at most 100 reviews to shared storage, regardless of range size.

### 8. Reduce the candidate shards

Merge the per-range heaps on one worker:

```python
def reduce_candidates(chunk_ids):
    candidates = []
    parsed_count = 0
    tie_breaker = 0

    for chunk_id in chunk_ids:
        shard = json.loads((SHARED_DIR / f"{chunk_id}.json").read_text())
        parsed_count += shard["parsed_count"]

        for candidate in shard["candidates"]:
            tie_breaker += 1
            item = (candidate["score"], tie_breaker, candidate)
            if len(candidates) < TOP_K:
                heapq.heappush(candidates, item)
            elif item[0] > candidates[0][0]:
                heapq.heapreplace(candidates, item)

    return {
        "parsed_count": parsed_count,
        "reviews": [candidate for _, _, candidate in sorted(candidates, reverse=True)],
    }
```

Retaining `TOP_K` candidates from every range is sufficient to recover the global top `TOP_K`.

### 9. Run the map and reduce

Add the entry point:

```python
def main():
    jobs = plan_ranges(list_source_files())
    remote_parallel_map(
        process_range, jobs, func_cpu=1, func_ram=4, max_parallelism=1_000, grow=True
    )

    chunk_ids = [job[3] for job in jobs]
    [result] = remote_parallel_map(
        reduce_candidates, [chunk_ids], func_cpu=2, func_ram=8, grow=True
    )

    Path("ranked_reviews.json").write_text(json.dumps(result, indent=2))
    print(f"Parsed {result['parsed_count']:,} reviews")


if __name__ == "__main__":
    main()
```

The local process receives only the final 100 reviews and one count.

## Run it

```bash
python rank_reviews.py
```

## Recorded source run

| Metric | Value |
|---|---:|
| Reviews parsed | 571,544,386 |
| Source data streamed | 275 GB |
| Category files | 34 |
| Byte-range jobs | 545 |
| Peak concurrent calls | more than 500 |
| Map stage | 3.21 minutes |
| Reduce stage | 9.2 seconds |

Those measurements come from the archived main pass, which calculated several deterministic rankings at once. Its older range parser discarded records crossing interior byte boundaries. The focused version above aligns every boundary first, so its exact corrected row count requires a fresh full run.

Lexicon matches do not measure sentiment, intent, or whether a term is quoted critically. Treat the output as a deterministic text ranking, not a statement about the reviewers.
