# Cluster 2.7 million arXiv abstracts by topic

In this example we:

* Split a fixed 4.6 GB arXiv metadata snapshot into 10,000-paper shards.
* Embed each title and abstract with `all-MiniLM-L6-v2`.
* Assign 2,710,783 unique papers to 400 topic clusters.
* Write one compact JSON report with each cluster's size and representative papers.

The captured run used 16 embedding workers. Its fixed snapshot contains submissions through May 13, 2025, so this is not a live view of arXiv. You can [inspect the snapshot](https://huggingface.co/datasets/jackkuo/arXiv-metadata-oai-snapshot).

## Before you run

Complete [Getting Started](/docs/get-started), then create a Python 3.12 environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla fastembed huggingface-hub numpy pandas pyarrow scikit-learn
burla deploy
```

The embedding calls need 1 CPU and 4 GB of RAM each. Clustering needs one worker with 16 CPUs and 64 GB of RAM because the complete vector matrix occupies several gigabytes.

{% hint style="warning" %}
The full run downloads 4.6 GB and uses paid cloud compute. Run the 100,000-paper version first, using its separate shared directory, before processing the complete snapshot.
{% endhint %}

## Build the script

Create `arxiv_clustering.py`. Each section below adds one step.

### 1. Configure the shared paths

All large artifacts stay under one shared directory:

```python
import json
import os
from pathlib import Path

for variable in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "ONNXRUNTIME_NUM_THREADS"):
    os.environ.setdefault(variable, "1")

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from burla import remote_parallel_map
from fastembed import TextEmbedding
from huggingface_hub import hf_hub_download
from sklearn.cluster import MiniBatchKMeans

ROOT = Path(os.environ.get("SHARED_DIR", "/workspace/shared/arxiv-clustering"))
RAW_DIR = ROOT / "metadata"
VECTOR_DIR = ROOT / "vectors"
REPORT_PATH = ROOT / "topics.json"

HF_REPO = "jackkuo/arXiv-metadata-oai-snapshot"
HF_FILENAME = "arxiv-metadata-oai-snapshot.json"
MAX_PAPERS = int(os.environ.get("ARXIV_MAX_PAPERS", "0"))

SHARD_SIZE = 10_000
EMBEDDING_DIM = 384
N_CLUSTERS = 400
```

Setting `SHARED_DIR` lets a small run and a full run keep independent artifacts.

### 2. Prepare the metadata shards

One worker downloads the JSONL snapshot, keeps the fields needed for clustering, and writes one Parquet file per 10,000 papers:

```python
def stage_metadata(_):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = RAW_DIR / "manifest.json"
    if manifest_path.exists():
        return json.loads(manifest_path.read_text())

    snapshot_path = hf_hub_download(
        repo_id=HF_REPO, filename=HF_FILENAME, repo_type="dataset",
        local_dir=str(ROOT / "download"),
    )

    def write_shard(records, shard_id):
        path = RAW_DIR / f"shard_{shard_id:05d}.parquet"
        table = pa.table({
            "id": [record["id"] for record in records],
            "title": [" ".join(record["title"].split()) for record in records],
            "abstract": [" ".join(record["abstract"].split()) for record in records],
            "categories": [record.get("categories", "") for record in records],
        })
        pq.write_table(table, path)
        return str(path)

    records = []
    shard_paths = []
    with open(snapshot_path, encoding="utf-8") as snapshot:
        for line in snapshot:
            record = json.loads(line)
            if not all(record.get(key) for key in ("id", "title", "abstract")):
                continue

            records.append(record)
            if len(records) == SHARD_SIZE:
                shard_paths.append(write_shard(records, len(shard_paths)))
                records = []

            if MAX_PAPERS and len(shard_paths) * SHARD_SIZE + len(records) >= MAX_PAPERS:
                break

    if records:
        shard_paths.append(write_shard(records, len(shard_paths)))

    manifest_path.write_text(json.dumps(shard_paths))
    return shard_paths
```

The function returns path strings, not the 4.6 GB dataset.

### 3. Load MiniLM once per worker

Cache the embedding model in the worker process:

```python
_MODEL = None

def get_model():
    global _MODEL
    if _MODEL is None:
        _MODEL = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2", threads=1)
    return _MODEL
```

### 4. Embed one metadata shard

Each call reads one shared metadata shard and writes one aligned vector shard:

```python
def embed_shard(metadata_path):
    VECTOR_DIR.mkdir(parents=True, exist_ok=True)
    output_path = VECTOR_DIR / Path(metadata_path).name
    if output_path.exists():
        try:
            cached_rows = pq.read_metadata(output_path).num_rows
            source_rows = pq.read_metadata(metadata_path).num_rows
            if cached_rows == source_rows and "vector" in pq.read_schema(output_path).names:
                return str(output_path)
        except Exception:
            pass

    table = pq.read_table(metadata_path)
    titles = table.column("title").to_pylist()
    abstracts = table.column("abstract").to_pylist()
    texts = [f"{title}\n{abstract}" for title, abstract in zip(titles, abstracts)]

    vectors = np.asarray(list(get_model().embed(texts, batch_size=256)), dtype="float32")
    vectors /= np.maximum(np.linalg.norm(vectors, axis=1, keepdims=True), 1e-12)

    output_table = table.append_column(
        "vector", pa.array(vectors.tolist(), type=pa.list_(pa.float32(), EMBEDDING_DIM))
    )
    pq.write_table(output_table, output_path)
    return str(output_path)
```

The function returns only the new shared path. On a rerun, it reuses the file only after checking the row count and vector column, so an incomplete write is recomputed.

### 5. Load the vector shards

The clustering worker combines the metadata and vectors, then removes duplicate paper IDs:

```python
def load_vector_shards(vector_paths):
    frames = []
    vector_chunks = []

    for path in sorted(vector_paths):
        table = pq.read_table(path)
        frames.append(table.drop(["vector"]).to_pandas())

        vector_column = table.column("vector").combine_chunks()
        flat_values = vector_column.values.to_numpy(zero_copy_only=False)
        vector_chunks.append(
            np.asarray(flat_values, dtype="float32").reshape(-1, EMBEDDING_DIM)
        )

    papers = pd.concat(frames, ignore_index=True)
    vectors = np.concatenate(vector_chunks)

    keep = ~papers["id"].duplicated(keep="first").to_numpy()
    return papers.loc[keep].reset_index(drop=True), vectors[keep]
```

### 6. Assign the topic clusters

Fit MiniBatchKMeans on a fixed 300,000-vector sample, then predict a cluster for every paper:

```python
def assign_topics(vectors):
    sample_size = min(300_000, len(vectors))
    sample_indices = np.random.RandomState(42).choice(
        len(vectors), size=sample_size, replace=False
    )

    model = MiniBatchKMeans(
        n_clusters=N_CLUSTERS, random_state=42, batch_size=16_384, max_iter=80, n_init=1
    )
    model.fit(vectors[sample_indices])
    return model.predict(vectors), model.cluster_centers_
```

Sampling makes the fit practical while the final prediction still covers the full corpus.

### 7. Summarize each cluster

Use arXiv categories as readable context and select the three papers nearest each centroid:

```python
def summarize_topics(papers, vectors, cluster_ids, centers):
    topics = []

    for cluster_id in range(N_CLUSTERS):
        member_indices = np.flatnonzero(cluster_ids == cluster_id)
        members = papers.iloc[member_indices]

        distances = np.square(vectors[member_indices] - centers[cluster_id]).sum(axis=1)
        representative_indices = member_indices[np.argsort(distances)[:3]]

        category_counts = members["categories"].str.split().explode().value_counts().head(5)
        categories = {str(name): int(count) for name, count in category_counts.items()}

        topics.append({
            "cluster_id": cluster_id,
            "paper_count": len(member_indices),
            "top_categories": categories,
            "representative_papers": papers.iloc[representative_indices][
                ["id", "title"]
            ].to_dict("records"),
        })

    return sorted(topics, key=lambda topic: topic["paper_count"], reverse=True)
```

### 8. Write the report

Wrap loading, clustering, and reporting in one remote reducer so the vector matrix never enters the local process:

```python
def cluster_corpus(vector_paths):
    papers, vectors = load_vector_shards(vector_paths)
    cluster_ids, centers = assign_topics(vectors)
    topics = summarize_topics(papers, vectors, cluster_ids, centers)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps({
        "paper_count": len(papers),
        "cluster_count": len(topics),
        "topics": topics,
    }, indent=2))

    return {
        "paper_count": len(papers),
        "cluster_count": len(topics),
        "report_path": str(REPORT_PATH),
    }
```

The return value is three small fields. The complete JSON report remains in shared storage.

### 9. Run the three remote stages

Add the entry point:

```python
def main():
    [metadata_paths] = remote_parallel_map(
        stage_metadata, [None], func_cpu=8, func_ram=32, grow=True
    )

    vector_paths = remote_parallel_map(
        embed_shard, metadata_paths,
        func_cpu=1, func_ram=4, max_parallelism=16, grow=True,
    )

    [report] = remote_parallel_map(
        cluster_corpus, [vector_paths], func_cpu=16, func_ram=64, grow=True
    )
    print(report)


if __name__ == "__main__":
    main()
```

## Run it

Start with 100,000 papers. A separate shared root prevents the full run from reusing partial shards:

```bash
SHARED_DIR=/workspace/shared/arxiv-clustering-sample \
ARXIV_MAX_PAPERS=100000 \
python arxiv_clustering.py
```

Then process the complete snapshot:

```bash
python arxiv_clustering.py
```

## Result from the captured run

| Metric | Value |
|---|---:|
| Unique papers analyzed | 2,710,783 |
| Metadata shards | 272 |
| Vector shards | 272 |
| Topic clusters | 400 |
| Concurrent embedding calls | 16 |

The source contains 2,710,806 records. The pipeline retained 2,710,783 after dropping incomplete records and duplicate paper IDs.

The clusters are semantic groupings, not official arXiv categories. Category counts make each cluster easier to inspect, but the clustering itself uses only title and abstract embeddings.
