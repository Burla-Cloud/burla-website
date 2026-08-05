---
cover: /docs-assets/more-examples/image-dataset-resize-cover.webp
coverY: 0
---

# Resize the whole image corpus before training on it

In this example we:

* List a large source image corpus from S3.
* Resize each image into 256, 512, and 1024 pixel variants.
* Write resized images back to S3.
* Stream a manifest with successes, dimensions, and failures.

A preview folder always looks fine. The full corpus is where the EXIF rotations, corrupt PNGs, CMYK JPEGs, and odd aspect ratios live.

### Dataset: source images in S3

Assume raw images live under `s3://my-photos/originals/` and outputs should be written to `s3://my-photos-resized/`.

```python
import io
import json
import os
from pathlib import Path

import boto3
from PIL import Image, ImageOps
from burla import remote_parallel_map

SRC_BUCKET = "my-photos"
DST_BUCKET = "my-photos-resized"
SRC_PREFIX = "originals/"
OUT_PREFIX = "resized/"
MANIFEST_PATH = Path("/workspace/shared/image-resize/manifest.jsonl")
CHUNK_SIZE = 1_000
SIZES = [256, 512, 1024]
```

### Step 1: Chunk the image keys

The client lists source keys and batches them into 1,000-image chunks.

```python
keys = []
paginator = boto3.client("s3").get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket=SRC_BUCKET, Prefix=SRC_PREFIX):
    keys += [
        obj["Key"]
        for obj in page.get("Contents", [])
        if obj["Key"].lower().endswith((".jpg", ".jpeg", ".png"))
    ]

chunks = [keys[i:i + CHUNK_SIZE] for i in range(0, len(keys), CHUNK_SIZE)]

print(f"Built {len(chunks):,} image chunks from {len(keys):,} keys")
```

### Step 2: Resize inside the worker

The worker opens each image, fixes EXIF orientation, writes every target size, and returns a report row. Bad images become manifest rows instead of crashing the whole job.

```python
def resize_chunk(image_keys: list[str]) -> list[dict]:
    s3 = boto3.client("s3")
    rows = []

    for key in image_keys:
        try:
            body = s3.get_object(Bucket=SRC_BUCKET, Key=key)["Body"].read()
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(body))).convert("RGB")
            stem = os.path.splitext(os.path.basename(key))[0]

            output_keys = []
            for size in SIZES:
                resized = img.copy()
                resized.thumbnail((size, size), Image.Resampling.LANCZOS)
                buf = io.BytesIO()
                resized.save(buf, format="JPEG", quality=85, optimize=True, progressive=True)
                out_key = f"{OUT_PREFIX}{size}/{stem}.jpg"
                s3.put_object(Bucket=DST_BUCKET, Key=out_key, Body=buf.getvalue())
                output_keys.append(out_key)

            rows.append({
                "key": key,
                "orig_w": img.size[0],
                "orig_h": img.size[1],
                "output_keys": output_keys,
                "ok": True,
            })
        except Exception as exc:
            rows.append({"key": key, "ok": False, "error": repr(exc)})

    return rows
```

### Step 3: Smoke test one chunk

The first chunk usually reveals missing dependencies, bad credentials, or PIL edge cases.

```python
test_rows = remote_parallel_map(
    resize_chunk,
    chunks[:1],
    func_cpu=1,
    func_ram=4,
)[0]

print(test_rows[:3])
```

### Step 4: Stream the manifest

Workers write images directly to S3. The client writes the report as chunks finish.

```python
MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
with MANIFEST_PATH.open("w") as f:
    for chunk_result in remote_parallel_map(
        resize_chunk,
        chunks,
        func_cpu=1,
        func_ram=4,
        generator=True,
        grow=True,
    ):
        for row in chunk_result:
            f.write(json.dumps(row) + "\n")

print(MANIFEST_PATH)
```
