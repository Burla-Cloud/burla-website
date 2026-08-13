---
description: Reverse-geocode 4,094 Flickr metadata shards, aggregate user-written tags by country, and reduce them into a browsable index.
cover: /docs-assets/more-examples/world-photo-index-cover.webp
coverY: 0
---

# Build a geographic index of 9.5 million Flickr photos

This example processes the 4,094 compressed metadata shards in the [YFCC100M OpenAI subset](https://huggingface.co/datasets/dalle-mini/YFCC100M_OpenAI_subset). It keeps rows with coordinates, reverse-geocodes them, and aggregates user-written tags, titles, and descriptions by country, region, and city.

The pipeline reads metadata, not image pixels. A full run wrote 9,487,758 geotagged rows spanning 246 country and territory codes. You can [browse the generated index](https://burla-cloud.github.io/examples/world-photo-index/) or [read the complete source](https://github.com/Burla-Cloud/examples/tree/main/world-photo-index).

## Before you run

Complete [Getting Started](/docs/get-started), then deploy the cluster if you have not already:

```bash
burla deploy
```

The extraction, aggregation, and reduce jobs exchange files through `/workspace/shared`, which is available on a deployed cluster. A dashboard running only on your laptop does not mount this shared filesystem.

Download the example and install the packages used by these stages:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/world-photo-index
python -m venv .venv
source .venv/bin/activate
pip install burla huggingface_hub requests reverse_geocoder
```

The full run creates JSONL under `/workspace/shared/wpi/shards` and aggregate JSON under `/workspace/shared/wpi/agg`. It can grow to hundreds of paid CPU workers.

## The pipeline

```text
4,094 compressed metadata shards
  -> geotagged JSONL in shared storage
  -> per-shard geographic counters in shared storage
  -> 64 partial reductions returned locally
  -> local report data
```

The snippets below are excerpts. The linked source contains the complete extraction, aggregation, reduction, analysis, and report code.

### 1. Reverse-geocode each metadata shard

Each call downloads one compressed JSONL file, keeps rows with coordinates, and performs one batched lookup with `reverse_geocoder`:

```python
def process_shard(shard_id):
    metadata_url = hf_hub_url(
        REPO_ID,
        filename=f"metadata/metadata_{shard_id}.jsonl.gz",
        repo_type="dataset",
    )
    response = requests.get(metadata_url, timeout=60)
    response.raise_for_status()

    rows = [
        json.loads(line)
        for line in gzip.decompress(response.content)
        .decode("utf-8", errors="replace")
        .splitlines()
        if line.strip()
    ]
    geotagged = [
        row for row in rows
        if row.get("latitude") and row.get("longitude")
    ]
    coordinates = [
        (float(row["latitude"]), float(row["longitude"]))
        for row in geotagged
    ]
    places = rg.search(coordinates, mode=2) if coordinates else []

    out_path = f"/workspace/shared/wpi/shards/{shard_id}.jsonl"
    with open(out_path, "w") as file:
        for row, place in zip(geotagged, places):
            file.write(json.dumps({
                "photoid": row["photoid"],
                "country_cc": place.get("cc"),
                "admin1": place.get("admin1"),
                "city": place.get("name"),
                "title": (row.get("title") or "")[:300],
                "usertags": (row.get("usertags") or "")[:400],
                "description": (row.get("description") or "")[:400],
            }) + "\n")

    return {"shard": shard_id, "output_path": out_path}
```

The complete worker also preserves coordinates and source identifiers for the report. It never downloads the matching image archives.

### 2. Map all 4,094 shards

`scale.py` lists the metadata files from Hugging Face rather than assuming a numeric range:

```python
shards = list_all_shards()

reports = remote_parallel_map(
    process_shard,
    shards,
    func_cpu=1,
    func_ram=4,
    grow=True,
    max_parallelism=1000,
    spinner=True,
)
```

Each call writes its large output to shared storage and returns only counts and timing. Result order does not matter because every file is named with its shard ID.

### 3. Aggregate text on the workers

A second remote job reads each extracted JSONL file. It preserves comma-separated Flickr tags as phrases, extracts additional tokens from titles and descriptions, and writes bounded counters for each geography:

```python
def process_shard_file(shard_id):
    country_photos = Counter()
    country_phrases = defaultdict(Counter)
    country_tokens = defaultdict(Counter)

    with open(f"/workspace/shared/wpi/shards/{shard_id}.jsonl") as file:
        for line in file:
            row = json.loads(line)
            country = row.get("country_cc") or "??"
            country_photos[country] += 1
            country_phrases[country].update(
                _extract_phrases(row.get("usertags") or "")
            )
            country_tokens[country].update(_extract_tokens(row))

    # Write bounded counters to /workspace/shared/wpi/agg/{shard_id}.json.
```

`aggregate.py` maps this function over the same shard list. The separate call is why the shared filesystem is required.

### 4. Reduce in 64 buckets

The reducer first lists aggregate files on one worker, partitions their names into 64 buckets, and merges each bucket remotely:

```python
[shard_names] = remote_parallel_map(_list_shards, [0], grow=True)
buckets = [shard_names[index::64] for index in range(64)]

partial_aggregates = remote_parallel_map(
    reduce_bucket,
    buckets,
    func_cpu=1,
    func_ram=4,
    grow=True,
    max_parallelism=64,
)
```

Each partial aggregate comes back as serialized bytes. The local process merges the 64 `Counter` objects and writes `samples/wpi_reduced_v2.json`.

### 5. Build the report locally

`analysis.py` filters country names and observed place names, computes TF-IDF scores for the remaining phrases, and writes the static site's JSON.

The current source writes regenerated files to `frontend/data`, while the checked-in site reads `data`. Copy the generated directory before serving the report:

```bash
cp -R frontend/data/. data/
```

## Run it

Run the three remote stages, then the local analysis:

```bash
python scale.py
python aggregate.py
python reduce.py
python analysis.py
cp -R frontend/data/. data/
python -m http.server 8765
```

## Result from the recorded run

| Metric | Value |
|---|---:|
| Geotagged rows written | 9,487,758 |
| Country and territory codes | 246 |
| Metadata shards | 4,094 |
| Peak extraction calls | 967 |

The checked-in findings record these stage timings:

| Stage | Time | Peak calls |
|---|---:|---:|
| Extract and reverse-geocode | 118 seconds | 967 |
| Aggregate phrases and tokens | 107 seconds | 640 |
| Reduce | 230 seconds | 64 |
| Local analysis | 3 seconds | local |

Those stages total 7 minutes 38 seconds. The checked-in site labels the end-to-end runtime as 4 minutes 12 seconds, or 4.2 minutes, which conflicts with that total. There is no consistent measured end-to-end runtime to report.

After filtering known place names, the published result lists `art` as the top phrase for the United States with 99,607 occurrences, `music` for the United Kingdom with 46,004, and `shrine` for Japan with 3,102. These are occurrences in user metadata, not counts of visually verified subjects.

## Interpreting the index

- This is a fixed, 2014-era Flickr subset. It reflects its contributors and Creative Commons selection, not what a country's population photographs.
- No image model checks the contents of a photo. Titles, descriptions, and tags can be missing, wrong, duplicated, or unrelated to what is visible.
- The place filter combines reverse-geocoded labels with hand-written country aliases. A phrase surviving that filter is not guaranteed to be a non-place.
- City and region totals are omitted here because the checked-in artifacts disagree: `data/index.json` reports 37,662 cities and 2,408 regions, while the README and findings report 53,198 cities and 2,975 regions.
