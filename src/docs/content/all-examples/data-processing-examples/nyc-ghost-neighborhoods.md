---
cover: /docs-assets/more-examples/nyc-ghost-neighborhoods-cover.webp
coverY: 0
---

# Scan every NYC taxi month

In this example we:

* Download every public TLC monthly Parquet file from 2011 through 2024.
* Count pickups for yellow, green, FHV, and HVFHS trips.
* Build a zone-by-month matrix across all 264 taxi zones.
* Classify zones by the shape of their own time series.

I wanted to find ghost neighborhoods, but only after including the ride-share data. Otherwise you are mostly measuring the limits of yellow cab coverage.

### Dataset: NYC TLC monthly trip files

The public files are already split by taxi type, year, and month. That is the work queue.

```python
import io
from dataclasses import dataclass

import pandas as pd
import pyarrow.parquet as pq
import requests
from burla import remote_parallel_map

BASE = "https://d37ci6vzurychx.cloudfront.net/trip-data"
TAXI_TYPES = ["yellow", "green", "fhv", "fhvhv"]
YEARS = range(2011, 2025)

@dataclass(frozen=True)
class MonthJob:
    taxi_type: str
    year: int
    month: int

def monthly_url(taxi_type: str, year: int, month: int) -> str:
    return f"{BASE}/{taxi_type}_tripdata_{year}-{month:02d}.parquet"
```

### Step 1: Make one task per month file

The client builds one input per possible file. Missing files are handled inside the worker, because not every taxi type exists for the full time range.

```python
jobs = [
    MonthJob(taxi_type, year, month)
    for taxi_type in TAXI_TYPES
    for year in YEARS
    for month in range(1, 13)
]

print(f"Built {len(jobs):,} month-file jobs")
```

### Step 2: Count pickups for one file

Each worker downloads one Parquet file and returns pickup counts by zone. It does not send raw trips back to the client.

```python
def process_month(job: MonthJob) -> dict:
    url = monthly_url(job.taxi_type, job.year, job.month)
    response = requests.get(url, timeout=300)
    if response.status_code == 404:
        return {"taxi_type": job.taxi_type, "year": job.year, "month": job.month, "missing": True, "counts": {}}
    response.raise_for_status()

    table = pq.read_table(io.BytesIO(response.content))
    pickup_col = "PULocationID"
    if pickup_col not in table.column_names:
        return {"taxi_type": job.taxi_type, "year": job.year, "month": job.month, "missing_column": True, "counts": {}}

    counts = table.column(pickup_col).to_pandas().value_counts().to_dict()
    return {
        "taxi_type": job.taxi_type,
        "year": job.year,
        "month": job.month,
        "rows": table.num_rows,
        "counts": {int(k): int(v) for k, v in counts.items() if pd.notna(k)},
    }
```

The missing-file behavior matters. A public corpus this old will have schema and availability edges.

### Step 3: Smoke test a few months

Run a mixed slice first so the code sees both old and new formats.

```python
test_results = remote_parallel_map(
    process_month,
    jobs[:24],
    func_cpu=1,
    func_ram=4,
)

print(test_results[:2])
```

Then scan the full corpus.

```python
month_results = remote_parallel_map(
    process_month,
    jobs,
    func_cpu=1,
    func_ram=4,
    grow=True,
)
```

### Step 4: Build the time series

The client reduces the monthly counts into a zone-by-month matrix and classifies the shape of each zone.

```python
def build_zone_month_matrix(month_results: list[dict]) -> pd.DataFrame:
    rows = []
    for result in month_results:
        for zone_id, pickups in result.get("counts", {}).items():
            rows.append({
                "zone_id": zone_id,
                "taxi_type": result["taxi_type"],
                "month": f"{result['year']}-{result['month']:02d}",
                "pickups": pickups,
            })
    return pd.DataFrame(rows)

matrix = build_zone_month_matrix(month_results)
zone_month = matrix.groupby(["zone_id", "month"], as_index=False)["pickups"].sum()
zone_month.to_parquet("/workspace/shared/nyc-taxi/zone_month_pickups.parquet", index=False)

early = zone_month[zone_month["month"] < "2016-01"].groupby("zone_id")["pickups"].mean()
late = zone_month[zone_month["month"] >= "2022-01"].groupby("zone_id")["pickups"].mean()
classified = (
    pd.DataFrame({"early_avg": early, "late_avg": late})
    .fillna(0)
    .assign(change_ratio=lambda df: (df["late_avg"] + 1) / (df["early_avg"] + 1))
    .sort_values("change_ratio")
)
classified.to_csv("/workspace/shared/nyc-taxi/zone_classification.csv")
```

The classification happens after the scan, when every feed and every month is visible.
