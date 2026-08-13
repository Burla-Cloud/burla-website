---
description: Query real Sentinel-2 COGs, compute NDVI for each tile in parallel, and keep the GeoTIFFs in shared storage.
---

# Compute NDVI for Sentinel-2 tiles in parallel

This example queries four real Sentinel-2 Level-2A tiles, then gives each tile to a separate remote call. Every call reads the red and near-infrared Cloud-Optimized GeoTIFFs, computes NDVI, and writes one compressed GeoTIFF.

The input comes from the public [Sentinel-2 C1 L2A collection](https://registry.opendata.aws/sentinel-2-l2a-cogs/) through the [Earth Search STAC API](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a).

## Before you run

Complete [Getting Started](/docs/get-started), then install the dependencies:

```bash
mkdir sentinel-ndvi
cd sentinel-ndvi
python -m venv .venv
source .venv/bin/activate
pip install burla numpy rasterio requests
burla deploy
```

A deployed cluster is required for `/workspace/shared`, where the GeoTIFFs persist after their workers stop. The public source COGs are read over HTTPS and need no AWS credentials.

{% hint style="warning" %}
The deployed cluster and raster workers use paid cloud resources.
{% endhint %}

## Query the tiles

The fixed query covers New York City during June 2025 and requests up to four tiles with less than 20 percent scene-level cloud cover. Each STAC item supplies exact URLs for its 10-meter B04 red and B08 near-infrared assets.

## Process one tile per call

Save this complete script as `sentinel_ndvi.py`:

```python
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np
import rasterio
import requests
from burla import remote_parallel_map

STAC_SEARCH_URL = "https://earth-search.aws.element84.com/v1/search"
OUTPUT_DIR = Path("/workspace/shared/sentinel-ndvi")


def find_tiles() -> list[dict]:
    response = requests.post(
        STAC_SEARCH_URL,
        json={
            "collections": ["sentinel-2-c1-l2a"],
            "bbox": [-74.1, 40.6, -73.8, 40.9],
            "datetime": (
                "2025-06-01T00:00:00Z/"
                "2025-06-30T23:59:59Z"
            ),
            "limit": 4,
            "query": {"eo:cloud_cover": {"lt": 20}},
        },
        timeout=60,
    )
    response.raise_for_status()

    tiles = [
        {
            "scene_id": feature["id"],
            "cloud_cover": feature["properties"]["eo:cloud_cover"],
            "red_url": feature["assets"]["red"]["href"],
            "nir_url": feature["assets"]["nir"]["href"],
        }
        for feature in response.json()["features"]
    ]
    if not tiles:
        raise RuntimeError("The STAC query returned no tiles.")
    return tiles


def compute_ndvi(tile: dict) -> dict:
    with rasterio.open(tile["red_url"]) as red_source:
        red = red_source.read(1).astype("float32")
        red_valid = red_source.read_masks(1) > 0
        profile = red_source.profile.copy()
        red_grid = (
            red_source.shape,
            red_source.transform,
            red_source.crs,
        )

    with rasterio.open(tile["nir_url"]) as nir_source:
        nir = nir_source.read(1).astype("float32")
        nir_valid = nir_source.read_masks(1) > 0
        nir_grid = (
            nir_source.shape,
            nir_source.transform,
            nir_source.crs,
        )

    if red_grid != nir_grid:
        raise ValueError(f"Band grids differ for {tile['scene_id']}")

    denominator = nir + red
    valid = red_valid & nir_valid & (denominator != 0)
    if not np.any(valid):
        raise ValueError(f"No valid pixels for {tile['scene_id']}")

    ndvi = np.full(red.shape, np.nan, dtype="float32")
    np.divide(nir - red, denominator, out=ndvi, where=valid)

    profile.update(
        driver="GTiff",
        dtype="float32",
        count=1,
        nodata=np.nan,
        compress="DEFLATE",
        predictor=3,
        tiled=True,
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    shared_path = OUTPUT_DIR / f"{tile['scene_id']}-ndvi.tif"

    with tempfile.TemporaryDirectory() as temp_dir:
        local_path = Path(temp_dir) / shared_path.name
        with rasterio.open(local_path, "w", **profile) as output:
            output.write(ndvi, 1)
        shutil.copyfile(local_path, shared_path)

    return {
        "scene_id": tile["scene_id"],
        "cloud_cover": tile["cloud_cover"],
        "valid_pixels": int(np.count_nonzero(valid)),
        "mean_ndvi": float(np.nanmean(ndvi)),
        "min_ndvi": float(np.nanmin(ndvi)),
        "max_ndvi": float(np.nanmax(ndvi)),
        "output": str(shared_path),
    }


tiles = find_tiles()
reports = remote_parallel_map(
    compute_ndvi,
    tiles,
    func_cpu=2,
    func_ram=8,
    grow=True,
)

Path("ndvi-report.json").write_text(json.dumps(reports, indent=2) + "\n")
print(f"Wrote {len(reports)} rasters to {OUTPUT_DIR}")
```

Run it:

```bash
python sentinel_ndvi.py
```

Each worker writes its GeoTIFF to local temporary storage first, then copies the closed file to shared storage. The raster outputs appear under `/workspace/shared/sentinel-ndvi`; `ndvi-report.json` is written on your local machine.

Change the bounding box, date range, cloud threshold, or limit to build a different input list. The processing function does not depend on how those STAC items were selected.
