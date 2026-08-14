# Find cross-century matches in 191,922 Met images

In this example we:

* Join two public Met data mirrors into one candidate table.
* Fetch and CLIP-embed the available `web-large` images on eight workers.
* Build a FAISS index over 191,922 normalized image vectors.
* Rank cross-century matches and write two HTML reports.

The published run finished in about 50 minutes on April 19, 2026. You can [browse its 30 highest-ranked pairs](https://burla-cloud.github.io/examples/met-weirdest-art/), [inspect the CLIP model](https://huggingface.co/Qdrant/clip-ViT-B-32-vision), or [read the complete script](https://github.com/Burla-Cloud/examples/blob/main/met-weirdest-art/met_weirdest.py).

## Before you run

Complete [Getting Started](/docs/get-started), then download the example and install its dependencies:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/met-weirdest-art
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla numpy pandas pyarrow fastembed Pillow requests scikit-learn faiss-cpu
burla deploy
```

Deployment is required here. The pipeline passes files between separate remote calls through `/workspace/shared`, and current client-hosted Burla clusters do not mount shared storage by default.

The checked-in [`requirements.txt`](https://github.com/Burla-Cloud/examples/blob/main/met-weirdest-art/requirements.txt) pins the Burla 1.4.5 client used for the published run. The command above installs the current Burla release instead of downgrading the client.

Use Python 3.12 for both the local driver and worker containers. The map stage reserves 1 CPU and 4 GB of RAM per call, with at most 8 calls running at once. The reducer needs one worker with 16 CPUs and 64 GB of RAM.

The script does not grow the cluster automatically. Start enough capacity in the dashboard before running it.

## The pipeline

The work moves through three remote stages:

```text
Met metadata and image-path mirrors
  -> objects.parquet
  -> 428 CLIP vector shards
  -> FAISS neighbors, summary.json, and two HTML reports
```

All artifacts live under `/workspace/shared/met-weirdest`. The local process receives path strings, not the files at those paths.

The snippets below show the stage boundaries. The complete script also contains download validation, HTTP retries, rerun checks, metadata filters, and HTML rendering.

### 1. Build the candidate table

The discovery worker downloads [`BetterMetObjects.csv`](https://github.com/graslowsnail/metmuseum-api-dump-enhanced) and the [`met-openaccess-images.csv`](https://github.com/gregsadetsky/met-openaccess-images) object-to-image mapping. It joins them by object ID, replaces original-image paths with smaller `web-large` paths, and writes the result to shared storage.

```python
import io
import random

import faiss
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from burla import remote_parallel_map
from fastembed import ImageEmbedding


def build_candidate_table():
    meta_df = pd.read_csv(io.BytesIO(_download(MET_META_URL)), low_memory=False)
    meta_df = meta_df[[column for column in KEEP_COLS if column in meta_df.columns]].copy()
    meta_df["object_id"] = pd.to_numeric(meta_df["object_id"], errors="coerce")
    meta_df = meta_df.dropna(subset=["object_id"])
    meta_df["object_id"] = meta_df["object_id"].astype("int64")
    meta_df = meta_df.drop_duplicates(subset=["object_id"])

    crd_df = pd.read_csv(io.BytesIO(_download(MET_CRD_URL)), on_bad_lines="skip")
    crd_df = crd_df.rename(columns={"id": "object_id", "urlpath": "crd_urlpath"})
    crd_df["object_id"] = pd.to_numeric(crd_df["object_id"], errors="coerce")
    crd_df = crd_df.dropna(subset=["object_id", "crd_urlpath"])
    crd_df["object_id"] = crd_df["object_id"].astype("int64")
    crd_df = crd_df.drop_duplicates(subset=["object_id"], keep="first")
    crd_df["crd_urlpath"] = crd_df["crd_urlpath"].str.replace(
        "/original/", "/web-large/", regex=False
    )

    return meta_df.merge(crd_df, on="object_id", how="inner")
```

### 2. Make 500-object batches

Write the joined table to shared storage, then shuffle its IDs reproducibly:

```python
def discover_objects(batch_size):
    objects = build_candidate_table()
    objects.to_parquet(OBJECTS_PATH, index=False)

    ids = objects["object_id"].tolist()
    random.Random(42).shuffle(ids)
    return [ids[start : start + batch_size] for start in range(0, len(ids), batch_size)]
```

### 3. Run discovery remotely

Run discovery on one worker because `/workspace/shared` is not mounted in the local Python process:

```python
[batches] = remote_parallel_map(discover_objects, [500], func_cpu=8, func_ram=32)
```

The join defines the candidate set. The final count is lower because some CDN paths fail, return non-images, or fall outside the script's 1 KB to 16 MB size limits.

### 4. Load CLIP once per worker

The model is loaded once per worker process and reused if that process receives another input:

```python
_CLIP_MODEL = None

def _get_clip():
    global _CLIP_MODEL
    if _CLIP_MODEL is None:
        _CLIP_MODEL = ImageEmbedding(model_name=CLIP_MODEL, threads=1)
    return _CLIP_MODEL
```

### 5. Produce one vector shard

Each map call reads up to 500 object IDs from `objects.parquet`, fetches images with 16 HTTP threads by default, resizes them to fit within 384 by 384 pixels, and embeds them in batches of 16:

```python
def write_vector_shard(images, object_ids, out_path):
    vectors = np.asarray(
        list(_get_clip().embed(images, batch_size=CLIP_BATCH)), dtype="float32"
    )
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors /= np.where(norms < 1e-12, 1.0, norms)

    out_table = pa.table({
        "object_id": object_ids,
        "vector": pa.array(vectors.tolist(), type=pa.list_(pa.float32(), CLIP_DIM)),
    })
    pq.write_table(out_table, out_path)
    return str(out_path)
```

`fetch_and_embed` handles the HTTP loop, then performs this write with the decoded images. The complete source also copies report metadata into each shard.

### 6. Process all image batches

Run the batches with a fixed concurrency cap:

```python
vector_paths = remote_parallel_map(
    fetch_and_embed, batches, func_cpu=1, func_ram=4, max_parallelism=8
)
```

The fetcher retries `403`, `429`, `503`, and `504` responses with exponential backoff. Each successful call writes one Parquet shard and returns its shared path.

### 7. Build the FAISS index

The reducer loads all vector shards into one normalized matrix. For 191,922 vectors, it trains a FAISS IVF inner-product index on a reproducible sample and searches the 11 nearest entries for each image.

```python
nlist = max(32, int(np.sqrt(len(vectors))))
quantizer = faiss.IndexFlatIP(CLIP_DIM)
index = faiss.IndexIVFFlat(quantizer, CLIP_DIM, nlist, faiss.METRIC_INNER_PRODUCT)

train_indices = np.random.RandomState(31).choice(
    len(vectors), size=min(len(vectors), 200_000), replace=False
)
index.train(vectors[train_indices])
index.add(vectors)
index.nprobe = 32
```

### 8. Search each image's neighbors

Search for each image's 10 nearest other images:

```python
similarities, neighbors = index.search(vectors, 11)
```

### 9. Rank cross-century candidates

Because the vectors are normalized, inner product equals cosine similarity. The reducer uses the tenth other-image neighbor to rank visual outliers. It also rejects same-artist pairs, identical titles, and near-exact duplicate images before ranking candidate pairs by century gap and similarity.

### 10. Write the reports

The index, pair ranking, and report generation stay in one remote call so the 191,922-vector matrix is loaded only once. Run that reducer on one larger worker:

```python
[results_dir] = remote_parallel_map(reduce_met, [vector_paths], func_cpu=16, func_ram=64)
print(results_dir)
```

`results_dir` is a path inside the deployed cluster. Open the shared filesystem in the dashboard to download `summary.json`, `twins.html`, or `weirdest.html`.

## Run it

Run the complete pipeline:

```bash
python met_weirdest.py
```

Existing discovery and vector files are reused on reruns. To rebuild only the FAISS index and reports:

```bash
REDUCE_ONLY=1 python met_weirdest.py
```

Keep discovery enabled during ordinary reruns. Its remote function reuses `objects.parquet` without asking the local client to read `/workspace/shared`.

## Result from the published run

| Metric | Value |
|---|---:|
| Images embedded | 191,922 |
| Vector shards | 428 |
| Candidate pairs reported | 30 |
| Map concurrency cap | 8 |
| Full pipeline | about 50 minutes |
| Final reduction | 49.65 seconds |
| Burla client | 1.4.5 |

The highest-ranked pair was [a 19th-century knife and fork case](https://www.metmuseum.org/art/collection/search/186597) and [an Early Bronze Age dagger blade](https://www.metmuseum.org/art/collection/search/244170). Their CLIP cosine similarity was `0.9316`, and the script placed them 49 centuries apart.

## Interpreting the result

- The 191,922 images are the records that survived the two-source join and image fetches. They are not every object or every Open Access image in The Met.
- CLIP measures visual similarity, not artistic influence or historical relationship. The Met's consistent backgrounds and camera angles contribute to the matches.
- The FAISS IVF search is approximate, and the pair filters are heuristics. The script does not query Met relationship records, so “hidden twin” means a candidate surfaced by this pipeline, not a curator-validated discovery.
