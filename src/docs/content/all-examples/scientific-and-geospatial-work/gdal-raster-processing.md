---
cover: /docs-assets/more-examples/gdal-raster-processing-cover.webp
coverY: 0
---

# Process every raster tile, not a pretty subset

In this example we:

* Process 2,000 Sentinel-2 tiles.
* Read red and near-infrared bands from S3.
* Compute NDVI and write per-tile GeoTIFF outputs.
* Return a report with per-tile stats.

The first tile usually works. The full region is where missing bands, bad nodata values, CRS surprises, and requester-pays mistakes show up.

### Dataset: Sentinel-2 tile ids

The input is a plain list of tile ids. Each worker owns one tile.

```python
import io
from pathlib import Path

import boto3
import numpy as np
import pandas as pd
import rasterio
from burla import remote_parallel_map
from rasterio.io import MemoryFile

SRC_BUCKET = "sentinel-s2-l2a"
DST_BUCKET = "my-ndvi-outputs"
REPORT_PATH = Path("/workspace/shared/ndvi/ndvi_report.csv")
```

### Step 1: Make one task per tile

```python
with open("sentinel_tiles.txt") as f:
    tile_ids = [line.strip() for line in f if line.strip()]

print(f"Loaded {len(tile_ids):,} Sentinel tile ids")
```

### Step 2: Compute NDVI in the worker

The worker reads both bands, computes NDVI, writes a compressed GeoTIFF, and returns summary stats.

```python
def compute_ndvi(tile_id: str) -> dict:
    s3 = boto3.client("s3", region_name="eu-central-1")

    def read_band(band: str):
        key = f"tiles/{tile_id}/{band}.jp2"
        body = s3.get_object(Bucket=SRC_BUCKET, Key=key, RequestPayer="requester")["Body"].read()
        with MemoryFile(body) as mem, mem.open() as src:
            return src.read(1).astype("float32"), src.profile

    red, profile = read_band("B04")
    nir, _ = read_band("B08")
    ndvi = (nir - red) / (nir + red + 1e-6)
    profile.update(driver="GTiff", dtype="float32", count=1, compress="DEFLATE", tiled=True)

    with MemoryFile() as mem:
        with mem.open(**profile) as dst:
            dst.write(ndvi.astype("float32"), 1)
        out_key = f"ndvi/{tile_id}.tif"
        s3.put_object(Bucket=DST_BUCKET, Key=out_key, Body=mem.read())

    return {
        "tile_id": tile_id,
        "mean_ndvi": float(np.nanmean(ndvi)),
        "min_ndvi": float(np.nanmin(ndvi)),
        "max_ndvi": float(np.nanmax(ndvi)),
        "pixels": int(ndvi.size),
        "output": f"s3://{DST_BUCKET}/{out_key}",
    }
```

### Step 3: Smoke test one tile

Run one tile with the same Docker image and cloud permissions you will use for the full region.

```python
test_result = remote_parallel_map(
    compute_ndvi,
    tile_ids[:1],
    func_cpu=2,
    func_ram=8,
)[0]

print(test_result)
```

### Step 4: Run the tiles

Each tile gets two CPUs and enough RAM for the bands.

```python
results = remote_parallel_map(compute_ndvi, tile_ids, func_cpu=2, func_ram=8, grow=True)

REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
pd.DataFrame(results).to_csv(REPORT_PATH, index=False)
print(REPORT_PATH)
```
