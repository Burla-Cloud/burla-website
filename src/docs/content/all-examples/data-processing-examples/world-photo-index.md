---
cover: /docs-assets/more-examples/world-photo-index-cover.webp
coverY: 0
---

# Map what the world photographed

In this example we:

* Process 9,487,758 public Flickr photos from the YFCC100M subset.
* Reverse-geocode every photo with latitude and longitude.
* Build country-level signatures from user-written tags.
* Reduce shard outputs into browsable country and region summaries.

No captions are generated here. The text comes from people, which is part of what makes the result interesting.

### Dataset: YFCC100M metadata shards

The input is a set of compressed JSONL metadata shards on Hugging Face. Each row may contain a title, user tags, and optional latitude/longitude.

```python
import gzip
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

import requests
from huggingface_hub import hf_hub_url
import reverse_geocoder as rg
from burla import remote_parallel_map

REPO_ID = "dalle-mini/YFCC100M_OpenAI_subset"
SHARD_DIR = Path("/workspace/shared/wpi/shards")
FINAL_DIR = Path("/workspace/shared/wpi/final")
SHARD_IDS = [f"{i:05d}" for i in range(96)]
```

### Step 1: Process one metadata shard per worker

Each worker downloads one metadata shard, keeps geotagged photos, reverse-geocodes them, and writes compact JSONL.

```python
def process_shard(shard_id: str) -> dict:
    meta_url = hf_hub_url(REPO_ID, filename=f"metadata/metadata_{shard_id}.jsonl.gz", repo_type="dataset")
    body = requests.get(meta_url, timeout=300).content
    rows = [
        json.loads(line)
        for line in gzip.decompress(body).decode("utf-8", errors="replace").splitlines()
        if line.strip()
    ]

    geotagged = [
        row for row in rows
        if row.get("latitude") not in (None, "") and row.get("longitude") not in (None, "")
    ]
    coords = [(float(row["latitude"]), float(row["longitude"])) for row in geotagged]
    geo_results = rg.search(coords, mode=2) if coords else []

    SHARD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SHARD_DIR / f"{shard_id}.jsonl"
    with out_path.open("w") as out_f:
        for row, geo in zip(geotagged, geo_results):
            out_f.write(json.dumps({
                "photoid": row["photoid"],
                "country_cc": geo.get("cc"),
                "admin1": geo.get("admin1"),
                "city": geo.get("name"),
                "title": (row.get("title") or "")[:300],
                "usertags": (row.get("usertags") or "")[:400],
            }) + "\n")

    return {"shard_id": shard_id, "rows": len(rows), "geotagged": len(geotagged), "path": str(out_path)}
```

The worker writes only the fields needed for the later token counts. It does not keep image bytes or generate captions.

### Step 2: Run the shard workers

```python
test_report = remote_parallel_map(
    process_shard,
    SHARD_IDS[:1],
    func_cpu=1,
    func_ram=4,
)[0]

print(test_report)
```

Then run the full metadata set.

```python
shard_reports = remote_parallel_map(
    process_shard,
    SHARD_IDS,
    func_cpu=1,
    func_ram=4,
    grow=True,
)
```

### Step 3: Reduce counters

The reduce stage reads shard JSONL files and counts user-written words by geography.

```python
def tokenize(text: str) -> list[str]:
    return [
        token.strip(".,:;!?()[]{}\"'").lower()
        for token in text.split()
        if len(token.strip(".,:;!?()[]{}\"'")) >= 3
    ]

country_counts = defaultdict(Counter)
country_photos = Counter()

for report in shard_reports:
    with open(report["path"]) as f:
        for line in f:
            row = json.loads(line)
            country = row.get("country_cc") or "unknown"
            country_photos[country] += 1
            country_counts[country].update(tokenize(f"{row.get('title', '')} {row.get('usertags', '')}"))

FINAL_DIR.mkdir(parents=True, exist_ok=True)
out_path = FINAL_DIR / "country-tags.json"
out_path.write_text(json.dumps({
    country: {
        "photos": country_photos[country],
        "top_tags": country_counts[country].most_common(50),
    }
    for country in sorted(country_counts)
}, indent=2) + "\n")

print(out_path)
```
