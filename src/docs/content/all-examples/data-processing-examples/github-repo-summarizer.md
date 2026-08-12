---
cover: /docs-assets/more-examples/github-repo-summarizer-cover.webp
coverY: 0
---

# Summarize a million READMEs without calling an LLM

In this example we:

* Export 1,200,000 GitHub READMEs from BigQuery.
* Upload the Parquet to Burla shared storage.
* Run deterministic summarizers over 600 stable shards.
* Reduce category counts, examples, and keyword statistics into frontend JSON.

I like this one because the first instinct is to ask an LLM. That would make individual rows prettier and the aggregate harder to trust.

### Dataset: README Parquet export

The BigQuery export includes repository metadata, README text, language, stars, and a deterministic `shard_id`.

```python
import heapq
import json
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd
import pyarrow.dataset as ds
from burla import remote_parallel_map

PARQUET_PATH = "/workspace/shared/grs/readmes.parquet"
SHARD_DIR = Path("/workspace/shared/grs/shards")
FINAL_DIR = Path("/workspace/shared/grs/final")
N_SHARDS = 600

CATEGORIES = {
    "ml": {"tensorflow": 4, "pytorch": 4, "embedding": 2, "llm": 4},
    "web": {"react": 3, "django": 2, "graphql": 3, "frontend": 2},
    "devops": {"docker": 3, "kubernetes": 4, "terraform": 4},
}
```

The `shard_id` is what keeps workers from all reading and filtering the same giant file by accident.

### Step 1: Score one README

The scoring function is deliberately inspectable. If a category looks wrong later, the weights are right here.

```python
def score_readme(text: str) -> tuple[str, int, dict]:
    text_lower = (text or "").lower()
    scores = {
        category: sum(text_lower.count(word) * weight for word, weight in weights.items())
        for category, weights in CATEGORIES.items()
    }
    category, score = max(scores.items(), key=lambda item: item[1])
    if score == 0:
        category = "other"

    badges = text_lower.count("![") + text_lower.count("<img")
    code_blocks = text_lower.count("```")
    return category, score, {"badges": badges, "code_blocks": code_blocks}
```

This is not trying to write beautiful prose. It is trying to make aggregate README patterns measurable.

### Step 2: Summarize one shard

Each worker reads one `shard_id`, scores the READMEs, and writes a JSON shard.

```python
def summarize_shard(shard_id: int) -> dict:
    dataset = ds.dataset(PARQUET_PATH, format="parquet")
    table = dataset.filter(ds.field("shard_id") == shard_id).to_table()
    df = table.to_pandas()

    rows = []
    for row in df.itertuples(index=False):
        category, score, badges = score_readme(row.readme_text)
        rows.append({
            "repo": row.repo_name,
            "language": row.language or "unknown",
            "stars": int(row.stars or 0),
            "category": category,
            "score": int(score),
            **badges,
        })

    SHARD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SHARD_DIR / f"shard-{shard_id:05d}.json"
    out_path.write_text(json.dumps({"rows": rows}) + "\n")
    return {"shard_id": shard_id, "rows": len(rows), "path": str(out_path)}
```

### Step 3: Run the shards

```python
shard_reports = remote_parallel_map(
    summarize_shard,
    range(N_SHARDS),
    func_cpu=2,
    func_ram=8,
    grow=True,
)
```

### Step 4: Reduce counters and examples

The reducer keeps counts plus small heaps of representative repos.

```python
by_category = Counter()
by_language = Counter()
examples = defaultdict(list)

for report in shard_reports:
    with open(report["path"]) as f:
        rows = json.load(f)["rows"]
    for row in rows:
        by_category[row["category"]] += 1
        by_language[row["language"]] += 1
        quality = row["stars"] + row["badges"] * 10 + row["code_blocks"]
        heapq.heappush(examples[row["category"]], (quality, row["repo"], row))
        if len(examples[row["category"]]) > 50:
            heapq.heappop(examples[row["category"]])

FINAL_DIR.mkdir(parents=True, exist_ok=True)
out_path = FINAL_DIR / "readme-summary.json"
out_path.write_text(json.dumps({
    "by_category": by_category,
    "by_language": by_language,
    "examples": {
        category: [row for _, _, row in sorted(heap, reverse=True)]
        for category, heap in examples.items()
    },
}, indent=2) + "\n")

print(out_path)
```
