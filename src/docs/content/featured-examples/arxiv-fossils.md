---
cover: /docs-assets/more-examples/arxiv-fossils-cover.webp
coverY: 0
---

# Cluster all arXiv abstracts before naming extinct topics

In this example we:

* Embed 2,710,783 arXiv abstracts.
* Cluster the whole corpus with MiniBatchKMeans.
* Use FAISS to find lonely papers and topic clusters that faded over time.

If the question is historical, a recent-paper sample is almost useless. It starts after half the history already happened.

### Dataset: arXiv metadata JSONL

The arXiv snapshot is one large JSONL file. We first turn it into Parquet shards so the embedding stage has clean inputs.

```python
import json
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
from burla import remote_parallel_map
from sentence_transformers import SentenceTransformer

RAW_JSONL = Path("/workspace/shared/arxiv/arxiv-metadata-oai-snapshot.json")
RAW_DIR = Path("/workspace/shared/arxiv/raw")
VEC_DIR = Path("/workspace/shared/arxiv/vectors")
FINAL_DIR = Path("/workspace/shared/arxiv/final")
PAPERS_PER_SHARD = 10_000
EMBED_BATCH = 128
MODEL_NAME = "BAAI/bge-small-en-v1.5"
```

### Step 1: Shard the metadata

The client streams the JSONL once and writes 10,000-paper Parquet shards into shared storage.

```python
def flush(records, idx):
    out = RAW_DIR / f"shard_{idx:05d}.parquet"
    tbl = pa.table({
        "id": [r.get("id", "") for r in records],
        "title": [" ".join((r.get("title") or "").split()) for r in records],
        "abstract": [" ".join((r.get("abstract") or "").split()) for r in records],
        "categories": [r.get("categories", "") or "" for r in records],
        "created": [_extract_created(r) for r in records],
    })
    pq.write_table(tbl, str(out))
    return str(out)

RAW_DIR.mkdir(parents=True, exist_ok=True)
raw_paths = []
records = []

with RAW_JSONL.open() as f:
    for line in f:
        records.append(json.loads(line))
        if len(records) == PAPERS_PER_SHARD:
            raw_paths.append(flush(records, len(raw_paths)))
            records = []

if records:
    raw_paths.append(flush(records, len(raw_paths)))

print(f"Wrote {len(raw_paths):,} raw shards")
```

### Step 2: Embed each shard

Each worker reads one raw shard, embeds title plus abstract, normalizes the vectors, and writes another Parquet shard.

```python
def embed_shard(raw_path: str) -> str:
    tbl = pq.read_table(raw_path)
    texts = [f"{t}\n{a}" for t, a in zip(tbl.column("title").to_pylist(), tbl.column("abstract").to_pylist())]
    if not hasattr(embed_shard, "_model"):
        embed_shard._model = SentenceTransformer(MODEL_NAME)
    vecs = embed_shard._model.encode(texts, batch_size=EMBED_BATCH, normalize_embeddings=True).astype("float32")
    vecs = vecs / np.maximum(np.linalg.norm(vecs, axis=1, keepdims=True), 1e-12)
    out_path = VEC_DIR / f"{Path(raw_path).stem}.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(tbl.append_column("vector", pa.array(vecs.tolist(), type=pa.list_(pa.float32(), 384))), str(out_path))
    return str(out_path)
```

Run one shard first, then launch the full embedding pass.

```python
test_vec_path = remote_parallel_map(
    embed_shard,
    raw_paths[:1],
    func_cpu=4,
    func_ram=16,
)[0]

print(test_vec_path)
```

```python
vec_paths = remote_parallel_map(
    embed_shard,
    raw_paths,
    func_cpu=4,
    func_ram=16,
    grow=True,
)
```

### Step 3: Reduce the whole corpus

The reduce worker loads the vector shards, clusters a sample, predicts labels for all papers, and builds a nearest-neighbor index.

```python
def reduce_corpus(vec_paths: list[str]) -> str:
    from sklearn.cluster import MiniBatchKMeans
    import faiss

    tables = [pq.read_table(path) for path in vec_paths]
    ids = sum([tbl.column("id").to_pylist() for tbl in tables], [])
    titles = sum([tbl.column("title").to_pylist() for tbl in tables], [])
    vecs = np.vstack([
        np.asarray(tbl.column("vector").to_pylist(), dtype="float32")
        for tbl in tables
    ])

    fit_vecs = vecs[np.linspace(0, len(vecs) - 1, min(200_000, len(vecs))).astype(int)]
    km = MiniBatchKMeans(n_clusters=400, random_state=42, batch_size=16384, max_iter=80, n_init=1)
    km.fit(fit_vecs)
    labels = km.predict(vecs)

    index = faiss.IndexFlatIP(vecs.shape[1])
    index.add(vecs.astype("float32"))

    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FINAL_DIR / "paper-clusters.parquet"
    pq.write_table(pa.table({"id": ids, "title": titles, "cluster": labels.tolist()}), out_path)
    return str(out_path)
```

```python
[cluster_path] = remote_parallel_map(
    reduce_corpus,
    [vec_paths],
    func_cpu=16,
    func_ram=128,
    grow=True,
)

print(cluster_path)
```
