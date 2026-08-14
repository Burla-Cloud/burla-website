# Count 9.5 million Flickr photos by country code

In this example we:

* List 4,094 compressed YFCC100M metadata shards.
* Download and parse the shards in parallel.
* Assign each valid coordinate to its nearest city's country code.
* Combine the returned country counters into one local JSON file.

The pipeline reads metadata, not image pixels. A recorded full-corpus run assigned 9,487,758 coordinates to 246 country and territory codes from the [YFCC100M OpenAI subset](https://huggingface.co/datasets/dalle-mini/YFCC100M_OpenAI_subset).

`reverse_geocoder` returns the nearest city in its local database. This example counts that city's country code, which is an approximation for coordinates near international borders.

## Before you run

Complete [Getting Started](/docs/get-started), then create a Python environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla huggingface-hub requests reverse-geocoder
burla deploy
```

Each worker returns at most one count per country code. The local process never receives the 9.5 million row-level records.

{% hint style="warning" %}
The full run downloads 4,094 metadata files and uses paid cloud compute.
{% endhint %}

## Build the script

Create `flickr_country_counts.py`. Each section below adds one step.

### 1. Configure the dataset

```python
import gzip
import json
from collections import Counter
from pathlib import Path

import requests
import reverse_geocoder as rg
from burla import remote_parallel_map
from huggingface_hub import HfApi, hf_hub_url

REPO_ID = "dalle-mini/YFCC100M_OpenAI_subset"
```

### 2. List the metadata shards

Ask Hugging Face for the current filenames instead of assuming a numeric range:

```python
def list_metadata_shards():
    filenames = HfApi().list_repo_files(repo_id=REPO_ID, repo_type="dataset")
    return sorted(
        name for name in filenames
        if name.startswith("metadata/") and name.endswith(".jsonl.gz")
    )
```

The recorded dataset listing contained 4,094 matching files.

### 3. Read one shard

Download one compressed JSONL file and keep only valid coordinates:

```python
def read_coordinates(filename):
    url = hf_hub_url(repo_id=REPO_ID, filename=filename, repo_type="dataset")
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    coordinates = []
    text = gzip.decompress(response.content).decode("utf-8", errors="replace")
    for line in text.splitlines():
        if not line:
            continue

        row = json.loads(line)
        try:
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
        except (KeyError, TypeError, ValueError):
            continue

        if -90 <= latitude <= 90 and -180 <= longitude <= 180:
            coordinates.append((latitude, longitude))

    return coordinates
```

Explicit range checks retain valid coordinates on the equator or prime meridian.

### 4. Reverse-geocode one shard

Use the package's single-process mode because each Burla call reserves one CPU:

```python
def count_shard(filename):
    coordinates = read_coordinates(filename)
    places = rg.search(coordinates, mode=1) if coordinates else []
    country_counts = Counter(place["cc"] for place in places)

    return {
        "coordinate_count": len(coordinates),
        "country_counts": dict(country_counts),
    }
```

The package uses a local city database, so the worker does not make one network request per coordinate.

### 5. Combine the country counters

The 4,094 small counters fit comfortably in the local process:

```python
def combine_reports(reports):
    country_counts = Counter()
    for report in reports:
        country_counts.update(report["country_counts"])

    result = {
        "photo_count": sum(country_counts.values()),
        "country_count": len(country_counts),
        "countries": dict(country_counts.most_common()),
    }
    Path("country_counts.json").write_text(json.dumps(result, indent=2))
    return result
```

### 6. Run the map

Add the entry point:

```python
def main():
    reports = remote_parallel_map(
        count_shard, list_metadata_shards(),
        func_cpu=1, func_ram=4, max_parallelism=1_000, grow=True,
    )

    result = combine_reports(reports)
    print(f"{result['photo_count']:,} photos across {result['country_count']:,} country codes")


if __name__ == "__main__":
    main()
```

Result order does not matter because `Counter.update` is commutative.

## Run it

```bash
python flickr_country_counts.py
```

## Recorded dataset scale

| Metric | Value |
|---|---:|
| Coordinates assigned | 9,487,758 |
| Nearest-city country and territory codes | 246 |
| Metadata shards | 4,094 |

Those figures come from the earlier full-corpus extraction, which also persisted row-level JSONL. The focused version omits those unused files and returns only country counters.

This fixed, 2014-era Flickr subset reflects its contributors and Creative Commons selection. The counts describe records in the dataset, not a country's population or photographic activity.
