---
description: Stream NOAA's annual GHCN-Daily files in parallel and reduce them to the largest quality-controlled precipitation value.
---

# Find NOAA's largest daily precipitation value

[GHCN-Daily](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily) combines daily observations from land stations around the world. NOAA publishes the data as one compressed CSV per year, so each remote call can scan one file independently and return only that year's maximum.

This example excludes the current, incomplete calendar year. NOAA updates the full period of record every day, so the result can still change when historical observations or quality flags are revised.

## Before you run

Complete [Getting Started](/docs/get-started), then install the two Python dependencies:

```bash
mkdir ghcn-rainiest-day
cd ghcn-rainiest-day
python -m venv .venv
source .venv/bin/activate
pip install burla requests
```

{% hint style="warning" %}
The full scan downloads every selected historical file and uses paid cloud compute.
{% endhint %}

## The dataset

The [by-year directory](https://www.ncei.noaa.gov/pub/data/ghcn/daily/by_year/) contains a gzip-compressed CSV for each available year. Its [format notes](https://www.ncei.noaa.gov/pub/data/ghcn/daily/by_year/readme-by_year.txt) define precipitation as `PRCP` in tenths of a millimeter and place the quality flag in the sixth column.

Do not generate years with a continuous range. The archive contains `1750.csv.gz`, then resumes at 1763. The script reads the directory listing so it submits only files that exist.

## Scan and reduce

Save this complete script as `rainiest_day.py`:

```python
import csv
import gzip
import io
import json
import re
from datetime import date
from pathlib import Path

import requests
from burla import remote_parallel_map

BASE_URL = "https://www.ncei.noaa.gov/pub/data/ghcn/daily"
BY_YEAR_URL = f"{BASE_URL}/by_year"
STATIONS_URL = f"{BASE_URL}/ghcnd-stations.txt"
HEADERS = {"User-Agent": "burla-ghcn-example/1.0"}


def available_complete_years() -> list[int]:
    response = requests.get(f"{BY_YEAR_URL}/", headers=HEADERS, timeout=60)
    response.raise_for_status()
    listed_years = {
        int(year)
        for year in re.findall(r'href="(\d{4})\.csv\.gz"', response.text)
    }
    return sorted(year for year in listed_years if year < date.today().year)


def process_year(year: int) -> dict:
    rows_seen = 0
    max_tenths_mm = None
    max_records = []

    with requests.get(
        f"{BY_YEAR_URL}/{year}.csv.gz",
        headers=HEADERS,
        stream=True,
        timeout=(30, 600),
    ) as response:
        response.raise_for_status()
        with gzip.GzipFile(fileobj=response.raw) as compressed:
            text = io.TextIOWrapper(
                compressed,
                encoding="utf-8",
                errors="replace",
                newline="",
            )
            for row in csv.reader(text):
                rows_seen += 1
                if len(row) < 7 or row[2] != "PRCP":
                    continue
                if row[5] or not row[3] or row[3] == "-9999":
                    continue

                value = int(row[3])
                record = {
                    "station_id": row[0],
                    "date": row[1],
                    "measurement_flag": row[4] or None,
                    "source_flag": row[6] or None,
                }
                if max_tenths_mm is None or value > max_tenths_mm:
                    max_tenths_mm = value
                    max_records = [record]
                elif value == max_tenths_mm:
                    max_records.append(record)

    return {
        "year": year,
        "rows_seen": rows_seen,
        "max_tenths_mm": max_tenths_mm,
        "records": max_records,
    }


def load_stations(station_ids: set[str]) -> dict:
    response = requests.get(STATIONS_URL, headers=HEADERS, timeout=60)
    response.raise_for_status()

    stations = {}
    for line in response.text.splitlines():
        station_id = line[:11]
        if station_id in station_ids:
            stations[station_id] = {
                "name": line[41:71].strip(),
                "latitude": float(line[12:20]),
                "longitude": float(line[21:30]),
            }
    return stations


years = available_complete_years()
year_results = remote_parallel_map(
    process_year,
    years,
    func_cpu=1,
    func_ram=2,
    grow=True,
    max_parallelism=8,
)

global_max = max(
    result["max_tenths_mm"]
    for result in year_results
    if result["max_tenths_mm"] is not None
)
records = [
    record
    for result in year_results
    if result["max_tenths_mm"] == global_max
    for record in result["records"]
]
stations = load_stations({record["station_id"] for record in records})

output = {
    "years_scanned": len(years),
    "rows_scanned": sum(result["rows_seen"] for result in year_results),
    "precipitation_mm": global_max / 10,
    "records": [
        {
            **record,
            "date": (
                f"{record['date'][:4]}-{record['date'][4:6]}-"
                f"{record['date'][6:]}"
            ),
            **stations.get(record["station_id"], {}),
        }
        for record in records
    ],
}

Path("rainiest-days.json").write_text(json.dumps(output, indent=2) + "\n")
print(json.dumps(output, indent=2))
```

Run it:

```bash
python rainiest_day.py
```

Each worker streams its CSV and retains only the tied maximum records for that year. `max_parallelism=8` limits the job to eight simultaneous downloads from NOAA. The final reduction happens locally over a few hundred small dictionaries.

The output is the largest `PRCP` value with a blank NOAA quality flag. It is a database result, not an independently validated rainfall record; the measurement and source flags are retained for that review.
