---
description: Stream 275 GB of review JSONL as byte ranges, keep bounded candidates on each worker, and reduce them into one ranked report.
cover: /docs-assets/more-examples/amazon-review-distiller-cover.webp
coverY: 0
---

# Rank 571 million Amazon reviews with byte-range map-reduce

This example scans the 34 raw JSONL files in [Amazon Reviews 2023](https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023). It divides the 275 GB corpus into 545 byte ranges, scores each range in a separate remote call, and keeps only bounded candidate sets for the final ranking.

The recorded main pass parsed 571,544,386 reviews in 3.21 minutes and reduced its shard files in 9.2 seconds, with more than 500 calls running at peak. You can [browse the report](https://burla-cloud.github.io/examples/amazon-review-distiller/) or [read the complete source](https://github.com/Burla-Cloud/examples/tree/main/amazon-review-distiller).

{% hint style="warning" %}
The report contains uncensored review text, profanity, and slurs.
{% endhint %}

## Before you run

Complete [Getting Started](/docs/get-started), then deploy the cluster if you have not already:

```bash
burla deploy
```

This workflow requires a deployed cluster because separate remote calls exchange files through `/workspace/shared`. The current source writes main-pass shards under `/workspace/shared/ard/shards` and second-pass shards under `/workspace/shared/ard_worst/shards`. A dashboard running only on your laptop does not mount this shared filesystem.

Download the example and install its dependencies:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/amazon-review-distiller
python -m venv .venv
source .venv/bin/activate
pip install burla -r requirements.txt
```

Each scoring call reserves 1 CPU and 4 GB of RAM. Each pass streams the source corpus once, so running both current passes reads the 275 GB corpus twice and uses paid cloud compute.

## The pipeline

The code runs two map-reduce passes:

```text
34 category JSONL files
  -> 545 byte-range jobs
  -> bounded candidate files in shared storage
  -> one reduced result per pass on the local machine
  -> static report data
```

The snippets below are excerpts from `pipeline.py`. The complete source contains the scoring lexicons, error summaries, command-line interface, and report builder.

### 1. Plan the byte ranges

`plan_chunks` reads each category file's size from Hugging Face and creates ranges of roughly 500 MB:

```python
def plan_chunks(chunk_mb: int = 500):
    infos = HfApi().list_repo_tree(
        "McAuley-Lab/Amazon-Reviews-2023",
        path_in_repo="raw/review_categories",
        repo_type="dataset",
        recursive=False,
    )
    files = sorted(
        [(info.path, info.size) for info in infos if getattr(info, "size", 0) > 0],
        key=lambda item: -item[1],
    )

    jobs = []
    chunk_bytes = chunk_mb * 1024 * 1024
    for path, size in files:
        n_chunks = max(1, math.ceil(size / chunk_bytes))
        span = size // n_chunks
        category = path.rsplit("/", 1)[-1].replace(".jsonl", "")
        for index in range(n_chunks):
            start = index * span
            end = (index + 1) * span if index < n_chunks - 1 else size
            jobs.append((path, start, end, f"{category}_{index:03d}"))
    return jobs
```

Each input is a four-item tuple. `remote_parallel_map` unpacks tuple inputs, so the values become the four arguments to `process_main(file_path, start, end, chunk_id)`.

### 2. Keep bounded state on each worker

The worker requests only its byte range and parses complete newline-delimited records. It scores each review against several deterministic signals, including word-list hits, all-caps text, rant length, and punctuation runs.

For each signal, the main pass keeps at most 40 candidates in memory:

```python
TOP_K_MAIN = 40

def process_main(file_path, start, end, chunk_id):
    heaps = {
        name: []
        for name in (
            "profane_strong",
            "rant",
            "screaming",
            "exclamation",
            "short_brutal",
            "five_star_obscene",
            "five_star_one_word",
        )
    }
    n_parsed = 0
    tie = 0

    for review in stream_reviews(file_path, start, end):
        n_parsed += 1
        score = _score_main(review.get("text") or "")
        candidate = {
            "text": review.get("text") or "",
            "rating": review.get("rating"),
            "asin": review.get("asin"),
            "score": score,
        }
        tie += 1
        _heappush_topk(
            heaps["profane_strong"],
            TOP_K_MAIN,
            (score["strong"] + score["medium"] * 0.4, tie, candidate),
        )
        # The complete worker updates the other six signal heaps here.

    top = {
        signal: [
            {"score": value, "review": review}
            for value, _, review in sorted(heap, reverse=True)
        ]
        for signal, heap in heaps.items()
    }

    out_path = os.path.join(SHARED_MAIN, f"{chunk_id}.json")
    with open(out_path, "w") as file:
        json.dump({"chunk_id": chunk_id, "top": top}, file)

    return {"chunk_id": chunk_id, "n_parsed": n_parsed}
```

The complete worker returns row counts and timings. The candidate payload stays in shared storage.

### 3. Map every range

The CLI sends all 545 tuples in one call:

```python
results = remote_parallel_map(
    process_main,
    jobs,
    func_cpu=1,
    func_ram=4,
    grow=True,
    max_parallelism=1000,
    spinner=True,
)
```

`grow=True` lets Burla add capacity, while `max_parallelism=1000` caps simultaneous calls. Results can arrive in any order, so each result and shared file carries its own `chunk_id`.

The second pass maps `process_worst` over the same jobs. It uses separate shared paths and stricter rules for censored terms and categorized slur hits.

### 4. Reduce shared files, then build locally

One remote call reads every shard for a pass from shared storage and returns the merged dictionary:

```python
[result] = remote_parallel_map(
    reduce_main,
    [0],
    grow=True,
    spinner=True,
)

Path("samples/ard_reduced.json").write_text(json.dumps(result))
```

`samples/ard_reduced.json` is written by your local Python process. `analysis.py` reads that file, deduplicates and rescores candidates, then writes the static site's JSON under `data/`.

## Run it

Run the main pass, then the later second pass:

```bash
python pipeline.py map-main
python pipeline.py reduce-main
python pipeline.py map-worst
python pipeline.py reduce-worst
python analysis.py
```

Serve the generated report from the example directory:

```bash
python -m http.server 8766
```

## Recorded result

The measured numbers below come from the original main scoring pass:

| Metric | Value |
|---|---:|
| Reviews parsed | 571,544,386 |
| Source data streamed | 275 GB |
| Categories | 34 |
| Byte-range jobs | 545 |
| Peak concurrent calls | more than 500 |
| Map stage | 3.21 minutes |
| Reduce stage | 9.2 seconds |

The later second pass was added after this run. Its runtime, and the runtime of the current two-pass workflow, were not recorded.

The report labels 20,187,204 reviews, or 3.53%, as profane. In the implementation, that count includes any hit in the strong, medium, or mild lists. The mild list includes words such as `terrible`, `worst`, and `hate`, so 3.53% is best read as this project's lexicon-hit rate, not a measured profanity prevalence.

Video Games has the highest reported rate: 302,219 of 4,624,610 parsed reviews, or 6.54%, matched at least one configured term.

## Limits of the ranking

- A JSONL record split by an interior byte boundary is discarded by both adjacent jobs. The recorded total is the number of rows parsed, not proof that every source row was visited.
- Each shard contributes a bounded candidate set. The final wall ranks those candidates; it is not guaranteed to contain the exact global top 120 reviews.
- The rules are English-oriented and deterministic. They do not measure sentiment, intent, or whether a flagged term is quoted critically.
