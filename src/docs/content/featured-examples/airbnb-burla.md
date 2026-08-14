# Rank 1.7 million Airbnb photos with CLIP

In this example we:

* Start from 1,945,032 public listing-photo URLs in shared storage.
* Split the manifest into 700-photo Parquet files.
* Score each available image against one text prompt with CLIP.
* Rank the shared score shards remotely and return 25 matches.

The recorded source run wrote 1,710,664 photo-score rows across 119 cities. Inside Airbnb supplies the listing IDs; the photo URLs come from the public listing pages referenced by those records. You can [inspect the dataset](https://insideairbnb.com/get-the-data/) or [read the data preparation source](https://github.com/Burla-Cloud/examples/tree/main/airbnb-burla-demo).

## Before you run

Complete [Getting Started](/docs/get-started), then download the example and create a Python 3.12 environment:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/airbnb-burla-demo
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e .
burla deploy
```

Prepare the shared photo manifest:

```bash
make PY="$PWD/.venv/bin/python" stage00 stage01 stage02a
```

Those stages collect public URLs. This walkthrough begins with their output at `/workspace/shared/airbnb/photo_manifest.parquet`.

Preload the 605 MB ViT-B/32 weights once:

```bash
python scripts/preload_clip_weights.py
```

{% hint style="warning" %}
The full run downloads nearly two million public images and uses paid cloud compute. Image URLs can disappear or begin rejecting requests after the recorded run.
{% endhint %}

## Build the script

Create `rank_airbnb_photos.py`. Each section below adds one step.

### 1. Configure the input and output

Keep the manifest, model weights, batch files, and scores in shared storage:

```python
import io
from pathlib import Path

import open_clip
import pandas as pd
import pyarrow.parquet as pq
import requests
import torch
from burla import remote_parallel_map
from PIL import Image

MANIFEST_PATH = Path("/workspace/shared/airbnb/photo_manifest.parquet")
WEIGHTS_PATH = Path("/workspace/shared/airbnb/clip_weights/openai.bin")
BATCH_DIR = Path("/workspace/shared/airbnb/clip_batches")
SCORE_DIR = Path("/workspace/shared/airbnb/clip_scores")

BATCH_SIZE = 700
PROMPT = "an unusual or surprising scene for a rental"
USER_AGENT = "Mozilla/5.0 (compatible; burla-airbnb-example/1.0)"
```

### 2. Split the photo manifest

One worker reads the manifest and writes a small Parquet file for each score call:

```python
def split_manifest(manifest_path):
    table = pq.read_table(manifest_path, columns=["listing_id", "image_idx", "image_url"])
    BATCH_DIR.mkdir(parents=True, exist_ok=True)

    batch_paths = []
    for batch_id, start in enumerate(range(0, table.num_rows, BATCH_SIZE)):
        output_path = BATCH_DIR / f"{batch_id:05d}.parquet"
        pq.write_table(table.slice(start, BATCH_SIZE), output_path)
        batch_paths.append(str(output_path))

    return batch_paths
```

The local process receives path strings, not the 1.9-million-row table.

### 3. Load CLIP once per worker

Cache the model, image transform, and prompt vector in each worker process:

```python
_CLIP = None


def get_clip():
    global _CLIP
    if _CLIP is None:
        torch.set_num_threads(1)
        model, _, preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained=str(WEIGHTS_PATH)
        )
        model.eval()

        tokenizer = open_clip.get_tokenizer("ViT-B-32")
        with torch.inference_mode():
            text_vector = model.encode_text(tokenizer([PROMPT]))
            text_vector /= text_vector.norm(dim=-1, keepdim=True)

        _CLIP = model, preprocess, text_vector

    return _CLIP
```

The weights remain in shared storage. Each worker process reads them once when it initializes CLIP.

### 4. Score one photo

Download one image, embed it, and return its cosine similarity to the prompt:

```python
def score_photo(image_url):
    response = requests.get(image_url, timeout=30, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    image = Image.open(io.BytesIO(response.content)).convert("RGB")

    model, preprocess, text_vector = get_clip()
    with torch.inference_mode():
        image_vector = model.encode_image(preprocess(image).unsqueeze(0))
        image_vector /= image_vector.norm(dim=-1, keepdim=True)
        return (image_vector @ text_vector.T).item()
```

### 5. Score one batch

Each worker reads one 700-row file and writes one aligned score shard:

```python
def score_batch(batch_path):
    batch = pd.read_parquet(batch_path)
    rows = []

    for photo in batch.itertuples(index=False):
        try:
            score = score_photo(photo.image_url)
            error = None
        except Exception as exception:
            score = None
            error = type(exception).__name__

        rows.append({
            "listing_id": photo.listing_id, "image_idx": photo.image_idx,
            "image_url": photo.image_url, "score": score, "error": error,
        })

    SCORE_DIR.mkdir(parents=True, exist_ok=True)
    output_path = SCORE_DIR / Path(batch_path).name
    pd.DataFrame(rows).to_parquet(output_path, compression="zstd", index=False)
    return str(output_path)
```

A failed download becomes one row with a null score. Other photos in the batch continue.

### 6. Rank the shared shards

Keep only the top 25 rows from each shard before combining them:

```python
def top_matches(score_paths):
    candidates = []
    for path in score_paths:
        scores = pd.read_parquet(
            path, columns=["listing_id", "image_url", "score"]
        ).dropna(subset=["score"])
        candidates.append(scores.nlargest(25, "score"))

    return pd.concat(candidates, ignore_index=True).nlargest(25, "score").to_dict("records")
```

The reducer reads the complete result inside Burla and returns only 25 small dictionaries.

### 7. Run the three remote stages

Add the entry point:

```python
def main():
    [batch_paths] = remote_parallel_map(
        split_manifest, [str(MANIFEST_PATH)], func_cpu=4, func_ram=16, grow=True
    )

    score_paths = remote_parallel_map(
        score_batch, batch_paths, func_cpu=1, func_ram=4, max_parallelism=800, grow=True
    )

    [matches] = remote_parallel_map(
        top_matches, [score_paths], func_cpu=8, func_ram=32, grow=True
    )

    for match in matches:
        print(match["listing_id"], match["score"])


if __name__ == "__main__":
    main()
```

## Run it

```bash
python rank_airbnb_photos.py
```

## Result from the recorded source run

| Metric | Value |
|---|---:|
| Cities | 119 |
| Validated city-snapshot pairs | 282 |
| Photo manifest rows | 1,945,032 |
| Photo-score rows | 1,710,664 |

The recorded source scored a fixed set of prompts, while the focused script scores only the prompt above. CLIP similarity is a retrieval score, not a verified label. A high score means the image aligns with the prompt more closely than other available images in this corpus.
