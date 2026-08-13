---
description: Resize S3 images in parallel and stream a local manifest of every result.
---

# Resize an image dataset in S3

This example runs one remote call per source image. Each call fixes EXIF orientation, creates JPEG variants whose longest edge is at most 256, 512, or 1024 pixels, and writes them to a destination bucket.

The image corpus belongs to you. The [repository example](https://github.com/Burla-Cloud/examples/blob/main/image-dataset-resize/main.py) does not include images or a measured run, so this page does not claim a corpus size or runtime.

## Before you run

1. Complete [Getting Started](/docs/get-started) with AWS.
2. Use a deployed cluster. Run `burla deploy`, then grant its `burla-node` IAM role `s3:GetObject` on the source prefix and `s3:PutObject` on the destination prefix.
3. Install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install burla boto3 Pillow
```

Set the two buckets, their prefixes, and the most image calls that may run at once:

```bash
export SRC_BUCKET="<source-bucket>"
export DST_BUCKET="<destination-bucket>"
export SRC_PREFIX="<source-prefix>"
export DST_PREFIX="<destination-prefix>"
export MAX_PARALLELISM="<maximum-live-calls>"
```

The local AWS identity must be able to list the source prefix. The worker role handles object reads and writes.

## The resize script

Save the following as `main.py`:

```python
import io
import json
import os
from pathlib import Path

import boto3
from burla import remote_parallel_map
from PIL import Image, ImageOps

SRC_BUCKET = os.environ["SRC_BUCKET"]
DST_BUCKET = os.environ["DST_BUCKET"]
SRC_PREFIX = os.environ["SRC_PREFIX"].strip("/")
DST_PREFIX = os.environ["DST_PREFIX"].strip("/")
MAX_PARALLELISM = int(os.environ["MAX_PARALLELISM"])
SIZES = (256, 512, 1024)
MANIFEST_PATH = Path("resize-manifest.jsonl")

if MAX_PARALLELISM < 1:
    raise ValueError("MAX_PARALLELISM must be at least 1")

if SRC_PREFIX:
    SRC_PREFIX += "/"
if DST_PREFIX:
    DST_PREFIX += "/"

s3 = boto3.client("s3")
keys = []
pages = s3.get_paginator("list_objects_v2").paginate(
    Bucket=SRC_BUCKET,
    Prefix=SRC_PREFIX,
)
for page in pages:
    keys.extend(
        obj["Key"]
        for obj in page.get("Contents", [])
        if obj["Key"].lower().endswith((".jpg", ".jpeg", ".png"))
    )

print(f"Found {len(keys):,} images")


def resize_one(key: str) -> dict:
    worker_s3 = boto3.client("s3")
    output_keys = []

    try:
        body = worker_s3.get_object(
            Bucket=SRC_BUCKET,
            Key=key,
        )["Body"].read()
        with Image.open(io.BytesIO(body)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")

        relative_key = key[len(SRC_PREFIX):]
        for size in SIZES:
            resized = image.copy()
            resized.thumbnail(
                (size, size),
                Image.Resampling.LANCZOS,
            )
            buffer = io.BytesIO()
            resized.save(
                buffer,
                format="JPEG",
                quality=85,
                optimize=True,
                progressive=True,
            )

            output_key = f"{DST_PREFIX}{size}/{relative_key}.jpg"
            worker_s3.put_object(
                Bucket=DST_BUCKET,
                Key=output_key,
                Body=buffer.getvalue(),
                ContentType="image/jpeg",
            )
            output_keys.append(output_key)

        return {
            "source_key": key,
            "width": image.width,
            "height": image.height,
            "output_keys": output_keys,
            "ok": True,
        }
    except Exception as error:
        return {
            "source_key": key,
            "output_keys": output_keys,
            "ok": False,
            "error": repr(error),
        }


with MANIFEST_PATH.open("w") as manifest:
    for row in remote_parallel_map(
        resize_one,
        keys,
        max_parallelism=MAX_PARALLELISM,
        generator=True,
    ):
        manifest.write(json.dumps(row) + "\n")

print(MANIFEST_PATH)
```

Appending `.jpg` to the full relative source key preserves subdirectories and prevents two same-named images in different folders from overwriting each other. Rerunning the script overwrites the same deterministic destination keys.

`thumbnail` preserves aspect ratio and never enlarges a smaller image. It does not crop every result to a square.

Workers read and write S3 directly. `resize-manifest.jsonl` is written by the local process as calls finish, so it remains on your machine. A failed row includes any destination keys written before the failure.

## Run it

```bash
python main.py
```

Manifest rows follow completion order. `max_parallelism` caps live resize calls, not the total number of source images.
