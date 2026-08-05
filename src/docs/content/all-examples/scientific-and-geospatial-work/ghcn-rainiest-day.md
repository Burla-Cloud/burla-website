---
cover: /docs-assets/more-examples/ghcn-rainiest-day-cover.webp
coverY: 0
---

# Find the rainiest day by scanning every NOAA year file

In this example we:

* Scan every GHCN-Daily year file from 1750 through today.
* Keep daily precipitation records with clean quality flags.
* Reduce 3,177,336,585 rows into a global rain leaderboard.

The run found 1,750.0 mm at Koumac, New Caledonia on 1976-01-17.

### Dataset: NOAA GHCN-Daily by-year files

NOAA publishes one compressed CSV per year. That makes the input list obvious.

```python
import csv
import gzip
import heapq
import io
import json
from datetime import date
from pathlib import Path

import requests
from burla import remote_parallel_map

BASE = "https://www.ncei.noaa.gov/pub/data/ghcn/daily/by_year"
PART_DIR = Path("/workspace/shared/ghcn-rain/parts")
FINAL_DIR = Path("/workspace/shared/ghcn-rain/final")
TOP_PER_YEAR = 100
START_YEAR = 1750
END_YEAR = date.today().year
```

### Step 1: Stream one year per worker

Each worker downloads one compressed year file and streams it row by row.

```python
def _stream_year_rows(year: int):
    url = f"{BASE}/{year}.csv.gz"
    with requests.get(url, stream=True, timeout=300, headers={"User-Agent": "ghcn-rainiest-day/1.0"}) as resp:
        resp.raise_for_status()
        with gzip.GzipFile(fileobj=resp.raw) as gz:
            text = io.TextIOWrapper(gz, encoding="utf-8", errors="replace", newline="")
            yield from csv.reader(text)
```

### Step 2: Keep a heap, not the whole file

The worker filters precipitation rows, applies the unit conversion, and keeps only the top records for that year.

```python
def process_year(year: int) -> str:
    heap = []
    rows_seen = 0
    for row in _stream_year_rows(year):
        rows_seen += 1
        if len(row) < 4 or row[2] != "PRCP":
            continue
        if len(row) > 5 and row[5]:
            continue
        if not row[3] or row[3] == "-9999":
            continue
        prcp_mm = int(row[3]) / 10.0
        item = (prcp_mm, row[0], row[1])
        if len(heap) < TOP_PER_YEAR:
            heapq.heappush(heap, item)
        elif prcp_mm > heap[0][0]:
            heapq.heapreplace(heap, item)

    PART_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PART_DIR / f"{year}.json"
    out_path.write_text(json.dumps({
        "year": year,
        "rows_seen": rows_seen,
        "top": sorted(heap, reverse=True),
    }) + "\n")
    return str(out_path)
```

The worker never holds a full year in memory. It holds a 100-record heap.

### Step 3: Smoke test one year

```python
test_path = remote_parallel_map(
    process_year,
    [2024],
    func_cpu=1,
    func_ram=2,
)[0]

print(test_path)
```

### Step 4: Reduce the years

The reducer merges yearly heaps, joins station metadata, computes country-decade stats, and renders the map.

```python
def reduce_years(part_paths: list[str]) -> str:
    heap = []
    for part_path in part_paths:
        part = json.loads(Path(part_path).read_text())
        for item in part["top"]:
            prcp_mm, station_id, date = item
            if len(heap) < 500:
                heapq.heappush(heap, (prcp_mm, station_id, date, part["year"]))
            elif prcp_mm > heap[0][0]:
                heapq.heapreplace(heap, (prcp_mm, station_id, date, part["year"]))

    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FINAL_DIR / "rainiest-days.json"
    out_path.write_text(json.dumps(sorted(heap, reverse=True), indent=2) + "\n")
    return str(out_path)

years = list(range(START_YEAR, END_YEAR + 1))
part_paths = remote_parallel_map(process_year, years, func_cpu=1, func_ram=2, grow=True)
[result_path] = remote_parallel_map(reduce_years, [part_paths], func_cpu=8, func_ram=32, grow=True)

print(result_path)
```
