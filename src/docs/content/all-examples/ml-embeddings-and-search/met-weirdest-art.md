---
cover: /docs-assets/more-examples/met-weirdest-art-cover.webp
coverY: 0
---

# Let CLIP compare every Met image

In this example we:

* Fetch every Met Open Access artwork with a usable image.
* Embed about 192,000 images with CLIP.
* Use FAISS to find visual twins across time, culture, and department.

The question is deliberately weird: which artworks look alike even though the metadata says they should not?

### Dataset: Met Open Access images

Discovery joins Met object metadata to CRDImages paths. After that, workers can fetch deterministic CDN URLs instead of hammering the API.

```python
import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
from burla import remote_parallel_map
from sentence_transformers import SentenceTransformer

CRD_IMAGE_BASE = "https://images.metmuseum.org/CRDImages/"
OBJECTS_PATH = Path("/workspace/shared/met-weirdest/objects.parquet")
VEC_DIR = Path("/workspace/shared/met-weirdest/vectors")
FINAL_DIR = Path("/workspace/shared/met-weirdest/final")
HTTP_THREADS = 16
CLIP_BATCH = 64
BATCH_SIZE = 512
MODEL_NAME = "clip-ViT-B-32"
```

### Step 1: Build the image queue

The client loads object metadata, keeps rows with an image path, shuffles them, and builds batches.

```python
df = pd.read_parquet(OBJECTS_PATH)
df = df.dropna(subset=["crd_urlpath"])

ids = df["object_id"].tolist()
random.Random(42).shuffle(ids)
batches = [
    {"batch_id": i // BATCH_SIZE, "object_ids": ids[i:i + BATCH_SIZE]}
    for i in range(0, len(ids), BATCH_SIZE)
]

print(f"Built {len(batches):,} image batches")
```

### Step 2: Fetch and embed

Each worker fetches images with a thread pool, thumbnails them, embeds with CLIP, and writes a vector shard.

```python
import io
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from PIL import Image

def fetch_and_embed(job: dict) -> dict:
    batch_id = job["batch_id"]
    batch = job["object_ids"]
    objs = pd.read_parquet(OBJECTS_PATH).set_index("object_id", drop=False)
    rows = objs.reindex(batch).dropna(subset=["crd_urlpath"]).reset_index(drop=True)

    session = requests.Session()
    work = [(int(oid), CRD_IMAGE_BASE + str(path)) for oid, path in zip(rows["object_id"], rows["crd_urlpath"])]

    def fetch(item):
        object_id, url = item
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
        image.thumbnail((512, 512))
        return object_id, image

    with ThreadPoolExecutor(max_workers=HTTP_THREADS) as ex:
        images = dict(f.result() for f in as_completed([ex.submit(fetch, item) for item in work]))

    if not hasattr(fetch_and_embed, "_model"):
        fetch_and_embed._model = SentenceTransformer(MODEL_NAME)

    ordered_ids = [int(oid) for oid in rows["object_id"] if int(oid) in images]
    vecs = fetch_and_embed._model.encode(
        [images[oid] for oid in ordered_ids],
        batch_size=CLIP_BATCH,
        convert_to_numpy=True,
    ).astype("float32")
    vecs = vecs / np.maximum(np.linalg.norm(vecs, axis=1, keepdims=True), 1e-12)

    VEC_DIR.mkdir(parents=True, exist_ok=True)
    out_path = VEC_DIR / f"batch-{batch_id:05d}.npz"
    np.savez_compressed(out_path, object_ids=np.asarray(ordered_ids, dtype="int64"), vectors=vecs)
    return {"batch_id": batch_id, "objects": len(ordered_ids), "path": str(out_path)}
```

### Step 3: Run the image batches

```python
vec_reports = remote_parallel_map(
    fetch_and_embed,
    batches,
    func_cpu=4,
    func_ram=16,
    grow=True,
)
```

### Step 4: Search the museum

The reducer loads vector shards, builds a FAISS cosine index, and filters out boring matches.

```python
def find_visual_neighbors(vec_reports: list[dict]) -> str:
    import faiss

    object_ids = []
    matrices = []
    for report in vec_reports:
        shard = np.load(report["path"])
        object_ids.extend(shard["object_ids"].tolist())
        matrices.append(shard["vectors"])

    vecs = np.vstack(matrices).astype("float32")
    index = faiss.IndexFlatIP(vecs.shape[1])
    index.add(vecs)
    scores, neighbors = index.search(vecs, 20)

    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FINAL_DIR / "visual-neighbors.json"
    out_path.write_text(json.dumps({
        str(object_ids[i]): [
            {"object_id": int(object_ids[j]), "score": float(score)}
            for j, score in zip(neighbors[i][1:], scores[i][1:])
        ]
        for i in range(len(object_ids))
    }) + "\n")
    return str(out_path)
```

```python
[neighbor_path] = remote_parallel_map(
    find_visual_neighbors,
    [vec_reports],
    func_cpu=16,
    func_ram=128,
    grow=True,
)

print(neighbor_path)
```

The filter matters. Raw nearest neighbors mostly find same-period, same-object-type matches. The fun pairs are the ones that cross boundaries.
