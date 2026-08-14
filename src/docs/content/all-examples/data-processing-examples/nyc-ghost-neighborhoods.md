# Find changes in NYC pickup activity across 2.76 billion trips

In this example we:

* Process 371 monthly NYC taxi Parquet files in parallel.
* Reduce each file to pickup counts by taxi zone.
* Combine the compact results into 168 monthly histories.
* Rank the zones with the largest changes in pickup activity.

A run completed the 371-call map in 14.48 seconds and aggregated 2,758,715,765 trips with a valid pickup zone from the [NYC TaxiData mirror](https://huggingface.co/datasets/DinoPonjevic/NYC_TaxiData_RAW). You can [browse the generated report](https://burla-cloud.github.io/examples/nyc-ghost-neighborhoods/).

## Before you run

Complete [Getting Started](/docs/get-started). This workflow does not use `/workspace/shared`: workers return compact counts directly, and the report is written on your local machine. A deployed cluster is not required.

The current `main` copy of the example has an import regression: `process_month` calls `_requests.get` after that alias was removed. Download the [complete script before that regression](https://github.com/Burla-Cloud/examples/blob/fde0fde0e5/nyc-ghost-neighborhoods/nyc_ghost_neighborhoods.py), then install the dependencies it uses:

```bash
mkdir nyc-ghost-neighborhoods
cd nyc-ghost-neighborhoods
BASE_URL=https://raw.githubusercontent.com/Burla-Cloud/examples/fde0fde0e5
curl -L "$BASE_URL/nyc-ghost-neighborhoods/nyc_ghost_neighborhoods.py" \
  -o nyc_ghost_neighborhoods.py
python -m venv .venv
source .venv/bin/activate
pip install burla numpy pyarrow requests fsspec pyshp
```

The script does not pass `grow=True`, so it uses the capacity already available in your cluster. Start the machines you want from the dashboard before running it. The measured 14.48-second result is not a runtime guarantee.

## The pipeline

```text
371 monthly Parquet files
  -> 371 remote pickup-count dictionaries
  -> local zone-by-month matrix
  -> local HTML and JSON report
```

The snippets below are abridged excerpts from the pinned complete script.

### 1. Build one input per file

The source defines only the periods that exist in the mirror:

```python
from collections import defaultdict

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import requests
from burla import remote_parallel_map


TAXI_TYPES = [
    ("yellow", 201101, 202412, ("tpep_pickup_datetime", "pickup_datetime")),
    ("green", 201401, 202412, ("lpep_pickup_datetime", "pickup_datetime")),
    ("fhvhv", 201902, 202412, ("pickup_datetime",)),
]

def build_task_list():
    tasks = []
    for prefix, first, last, _ in TAXI_TYPES:
        tasks.extend(_list_months_for_type(prefix, first, last))
    return tasks
```

A task is a string such as `yellow_tripdata_2023-01`, which is enough to derive the mirror URL and expected month.

### 2. Count one file on each worker

The worker downloads one Parquet file into memory, reads only its pickup-zone and timestamp columns, and counts valid zones in batches:

```python
def process_month(task_id):
    prefix = task_id.split("_", 1)[0]
    year, month = map(int, task_id.rsplit("_", 1)[-1].split("-"))

    response = requests.get(_hf_url_for_task(task_id), timeout=300, allow_redirects=True)
    response.raise_for_status()

    parquet = pq.ParquetFile(pa.BufferReader(response.content))
    names_by_lowercase = {name.lower(): name for name in parquet.schema_arrow.names}

    def find_column(candidates):
        for name in candidates:
            if name.lower() in names_by_lowercase:
                return names_by_lowercase[name.lower()]
        return None

    zone_col = find_column(("PULocationID", "PUlocationID", "pickup_location_id"))
    pickup_time_col = find_column(
        ("tpep_pickup_datetime", "lpep_pickup_datetime", "pickup_datetime",
         "Pickup_date", "Trip_Pickup_DateTime")
    )
    if zone_col is None:
        return {
            "taxi_type": prefix,
            "year": year,
            "month": month,
            "rows_with_zone": 0,
            "counts": [],
            "skip_reason": "pickup-zone column missing",
        }

    counts = defaultdict(int)
    rows_with_zone = 0
    columns = [zone_col]
    if pickup_time_col is not None:
        columns.append(pickup_time_col)

    for batch in parquet.iter_batches(batch_size=500_000, columns=columns):
        if pickup_time_col is None:
            in_month = np.ones(batch.num_rows, dtype=bool)
        else:
            pickup_times = batch.column(pickup_time_col).to_numpy(zero_copy_only=False)
            if np.issubdtype(pickup_times.dtype, np.datetime64):
                pickup_years = pickup_times.astype("datetime64[Y]").astype(int) + 1970
                pickup_months = pickup_times.astype("datetime64[M]").astype(int) % 12 + 1
                in_month = (pickup_years == year) & (pickup_months == month)
            else:
                in_month = np.ones(batch.num_rows, dtype=bool)

        try:
            zones = np.asarray(
                batch.column(zone_col).to_numpy(zero_copy_only=False), dtype="float64"
            )
        except (TypeError, ValueError):
            continue

        valid = ~np.isnan(zones) & (zones > 0) & (zones < 1_000) & in_month
        rows_with_zone += int(valid.sum())
        zone_ids, zone_counts = np.unique(zones[valid].astype("int32"), return_counts=True)
        for zone_id, count in zip(zone_ids, zone_counts):
            counts[int(zone_id)] += int(count)

    return {
        "taxi_type": prefix,
        "year": year,
        "month": month,
        "rows_with_zone": rows_with_zone,
        "counts": sorted([[zone, count] for zone, count in counts.items()]),
    }
```

The complete worker handles more historical column names, filters rows whose timestamps fall outside the file's stated month, and returns a skip reason for 404 responses, exhausted download retries, or missing zone columns.

### 3. Map the archive

```python
results = remote_parallel_map(process_month, build_task_list(), func_cpu=1, func_ram=4)
```

`remote_parallel_map` does not promise result order. The reducer uses the `year` and `month` in each dictionary, so completion order does not affect the matrix.

No Parquet data is written to the client or shared storage. One count comes back for each distinct valid pickup-zone ID in the file.

### 4. Classify the local time series

For each zone, the script compares the mean of its last 12 months with its largest single month and with the 24-month window beginning at its first nonzero month:

```python
ghost_ratio = recent_mean / peak_volume
emergent_ratio = recent_mean / birth_mean

if peak_volume >= 5_000 and ghost_ratio < 0.35:
    label = "ghost"
elif recent_mean >= 500 and emergent_ratio >= 4 and birth_mean < 1_000:
    label = "emergent"
elif peak_volume >= 5_000 and ghost_ratio < 0.7:
    label = "cooling"
elif recent_mean >= 500 and emergent_ratio >= 1.5:
    label = "warming"
else:
    label = "stable"
```

The report also builds separate leaderboards. Its "Ghost Zones" leaderboard shows the 12 lowest recent-to-peak ratios, even when a zone does not meet the `< 0.35` classifier threshold. This is why the recorded classification contains two `ghost` zones while the leaderboard contains 12 entries.

## Run it

Set the report path explicitly because the pinned script's default points to the original author's machine:

```bash
NYC_OUT_DIR="$PWD/nyc_ghost_out" python nyc_ghost_neighborhoods.py
python -m http.server 8765 --directory nyc_ghost_out
```

The generated `summary.json` contains the rankings and exact run metadata. `index.html` contains the map, time series, and leaderboards.

## Result from the recorded run

| Metric | Value |
|---|---:|
| Trips with a valid pickup zone | 2,758,715,765 |
| Monthly files | 371 |
| Calendar months | 168 |
| Taxi zones | 264 |
| Map stage | 14.48 seconds |

Three rows show how to read the rankings:

| Ranking | Zone | Recorded values |
|---|---|---:|
| Lowest recent-to-peak | Battery Park | 11,483 peak; 3,694.1 recent mean (32%) |
| Largest recent-to-birth | Far Rockaway | 43.9 birth mean; 42,053.8 recent mean (about 958x) |
| Recovered from a trough | JFK Airport | 13,689 in April 2020; 526,788.8 recent mean |

## Interpreting the result

- The source coverage changes over time. High-volume FHV data begins in 2019, so an "emergent" zone can reflect a new feed or a shift from taxis to ride-share rather than a neighborhood being born.
- The pipeline includes yellow, green, and high-volume FHV records. It does not include the ordinary FHV feed.
- Activity means pickups only. A trip ending in a zone does not count toward that zone.
- "Recent" means the final 12 months of this fixed dataset, ending in December 2024. The report is not a live view of New York.
