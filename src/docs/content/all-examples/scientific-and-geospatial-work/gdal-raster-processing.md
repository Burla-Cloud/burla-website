# Compute NDVI for Sentinel-2 tiles in parallel

In this example we:

* Query 2,000 real Sentinel-2 Level-2A tiles from a public STAC API.
* Read each tile's red and near-infrared COGs on a remote worker.
* Apply each band's scale and offset, then compute NDVI for every valid pixel.
* Save one compressed GeoTIFF per tile in `/workspace/shared`.

The example queries 2,000 tiles over California in 2025 from the public [Sentinel-2 C1 L2A collection](https://registry.opendata.aws/sentinel-2-l2a-cogs/) through the [Earth Search STAC API](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a).

## Before you run

Complete [Getting Started](/docs/get-started), then install the dependencies:

```bash
mkdir sentinel-ndvi
cd sentinel-ndvi
python -m venv .venv
source .venv/bin/activate
pip install burla numpy pystac-client rasterio
burla deploy
```

A deployed cluster is required for `/workspace/shared`, where the GeoTIFFs persist after their workers stop. The public source COGs are read over HTTPS and need no AWS credentials.

{% hint style="warning" %}
The full 2,000-tile run uses paid cloud resources and writes a large shared dataset. Lower `N_TILES` while learning.
{% endhint %}

## 1. Query the tiles

The query requests 2,000 California tiles from 2025 with less than 20 percent scene-level cloud cover. The STAC client handles pagination, and each item supplies exact URLs for its 10-meter B04 red and B08 near-infrared assets.

Create `sentinel_ndvi.py` and add the next three blocks in order:

```python
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from burla import remote_parallel_map
from pystac_client import Client

STAC_API_URL = "https://earth-search.aws.element84.com/v1"
OUTPUT_DIR = Path("/workspace/shared/sentinel-ndvi")
N_TILES = 2_000


def find_tiles():
    items = Client.open(STAC_API_URL).search(
        collections=["sentinel-2-c1-l2a"],
        bbox=[-124.5, 32.5, -114.0, 42.0],
        datetime="2025-01-01T00:00:00Z/2025-12-31T23:59:59Z",
        query={"eo:cloud_cover": {"lt": 20}},
        max_items=N_TILES,
    ).item_collection()

    if len(items) < N_TILES:
        raise RuntimeError(f"Expected {N_TILES:,} tiles, but the query returned {len(items)}.")

    return [
        {
            "scene_id": item.id,
            "cloud_cover": item.properties["eo:cloud_cover"],
            "red_url": item.assets["red"].href,
            "red_scale": item.assets["red"].extra_fields["raster:bands"][0]["scale"],
            "red_offset": item.assets["red"].extra_fields["raster:bands"][0]["offset"],
            "nir_url": item.assets["nir"].href,
            "nir_scale": item.assets["nir"].extra_fields["raster:bands"][0]["scale"],
            "nir_offset": item.assets["nir"].extra_fields["raster:bands"][0]["offset"],
        }
        for item in items
    ]


tiles = find_tiles()
```

## 2. Process one tile

The remote function reads both COGs, computes one NDVI array, and writes one GeoTIFF:

```python
def compute_ndvi(tile):
    with rasterio.open(tile["red_url"]) as red_source:
        red = red_source.read(1).astype("float32") * tile["red_scale"] + tile["red_offset"]
        red_valid = red_source.read_masks(1) > 0
        profile = red_source.profile.copy()
        red_grid = (red_source.shape, red_source.transform, red_source.crs)

    with rasterio.open(tile["nir_url"]) as nir_source:
        nir = nir_source.read(1).astype("float32") * tile["nir_scale"] + tile["nir_offset"]
        nir_valid = nir_source.read_masks(1) > 0
        nir_grid = (nir_source.shape, nir_source.transform, nir_source.crs)

    if red_grid != nir_grid:
        raise ValueError(f"Band grids differ for {tile['scene_id']}")

    denominator = nir + red
    valid = red_valid & nir_valid & (denominator != 0)
    if not valid.any():
        raise ValueError(f"No valid pixels for {tile['scene_id']}")

    ndvi = np.full(red.shape, np.nan, dtype="float32")
    np.divide(nir - red, denominator, out=ndvi, where=valid)

    profile.update(
        driver="GTiff", dtype="float32", count=1, nodata=np.nan,
        compress="DEFLATE", predictor=3, tiled=True,
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
```

## 3. Run the tiles in parallel

Submit one call per tile and keep only the compact reports locally:

```python
reports = remote_parallel_map(
    compute_ndvi, tiles, func_cpu=2, func_ram=8, max_parallelism=100, grow=True
)

Path("ndvi-report.json").write_text(json.dumps(reports, indent=2) + "\n")
print(f"Wrote {len(reports)} rasters to {OUTPUT_DIR}")
```

Run it:

```bash
python sentinel_ndvi.py
```

Each worker writes its GeoTIFF to local temporary storage first, then copies the closed file to shared storage. The raster outputs appear under `/workspace/shared/sentinel-ndvi`; `ndvi-report.json` is written on your local machine.

Reports follow completion order, not tile query order.

Change the bounding box, date range, cloud threshold, or limit to build a different input list. The processing function does not depend on how those STAC items were selected.
