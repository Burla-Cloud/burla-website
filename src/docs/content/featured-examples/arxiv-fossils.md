---
description: Embed a snapshot containing 2.7 million papers in parallel, cluster it by topic, and inspect the corpus's semantic outlier.
---

# Cluster 2.7 million arXiv abstracts by topic

This example processes a fixed 4.6 GB [arXiv metadata snapshot](https://huggingface.co/datasets/jackkuo/arXiv-metadata-oai-snapshot). It splits the source JSONL into 272 Parquet files, embeds each shard in a separate remote call, then combines the vectors on one larger worker for clustering and nearest-neighbor search.

A full run completed in about 25 minutes with 16 embedding workers. You can [browse the generated report](https://burla-cloud.github.io/examples/arxiv-fossils/) or [read the complete script](https://github.com/Burla-Cloud/examples/blob/main/arxiv-fossils/arxiv_fossils.py).

The run was completed on April 19, 2026. Its fixed source snapshot contains submissions through May 13, 2025, so this page is not a live view of arXiv.

## Before you run

Complete [Getting Started](/docs/get-started), then download the example and install its dependencies:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/arxiv-fossils
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Use Python 3.12 on the workers. The embedding stage needs 1 CPU and 4 GB of RAM per call. The final analysis needs one worker with 16 CPUs and 64 GB of RAM.

The full run downloads 4.6 GB and writes the raw shards, embeddings, and reports under `/workspace/shared/arxiv-fossils`.

{% hint style="warning" %}
The full run uses paid cloud compute. Start with the 100,000-paper command below before processing the complete snapshot.
{% endhint %}

## The pipeline

The work moves through three stages:

```text
arXiv JSONL
  -> 272 metadata shards
  -> 272 embedding shards
  -> topic and nearest-neighbor reports
```

The snippets below highlight the core logic and parallel boundaries. The complete script also contains date parsing, rerun checks, artifact loading, and HTML report rendering.

### 1. Download and shard the snapshot

`stage_raw` downloads the snapshot once, discards records without a title or abstract, and writes one Parquet file per 10,000 papers.

Run this step on a worker because `/workspace/shared` exists inside the Burla cluster, not in the local Python process:

```python
from burla import remote_parallel_map

[raw_paths] = remote_parallel_map(
    stage_raw,
    [None],
    func_cpu=8,
    func_ram=32,
)

print(f"Prepared {len(raw_paths)} metadata shards")
```

The function returns paths instead of returning the 4.6 GB dataset. Later workers can read those paths from the same shared storage.

### 2. Embed the shards in parallel

Each call reads one metadata shard and embeds its 10,000 title-and-abstract pairs with `all-MiniLM-L6-v2`. An embedding represents each paper as 384 numbers, placing papers with similar language near each other. The model is loaded once per worker process and reused when that process receives another shard.

```python
_MODEL = None

def get_model():
    global _MODEL
    if _MODEL is None:
        from fastembed import TextEmbedding

        _MODEL = TextEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            threads=1,
        )
    return _MODEL

def embed_shard(raw_path: str) -> str:
    table = pq.read_table(raw_path)
    titles = table.column("title").to_pylist()
    abstracts = table.column("abstract").to_pylist()
    texts = [f"{title}\n{abstract}" for title, abstract in zip(titles, abstracts)]

    vectors = np.asarray(
        list(get_model().embed(texts, batch_size=256)),
        dtype="float32",
    )
    vectors /= np.maximum(
        np.linalg.norm(vectors, axis=1, keepdims=True),
        1e-12,
    )

    out_path = VEC_DIR / f"{Path(raw_path).stem}.parquet"
    out_table = table.append_column(
        "vector",
        pa.array(vectors.tolist(), type=pa.list_(pa.float32(), 384)),
    )
    pq.write_table(out_table, out_path)
    return str(out_path)
```

Map that function over every shard:

```python
vector_paths = remote_parallel_map(
    embed_shard,
    raw_paths,
    func_cpu=1,
    func_ram=4,
)
```

The measured cluster had 16 available CPU slots, so 16 shards ran at once and the rest waited in the queue. Each call writes its vectors to shared storage and returns one small path string.

Normalizing each vector makes its inner product equal to cosine similarity. The clustering and nearest-neighbor stages can therefore use the same matrix.

### 3. Cluster the corpus and find its outlier

The final worker loads the vector shards into one matrix. It fits MiniBatchKMeans on a reproducible 300,000-vector sample, then assigns all 2.7 million papers to 400 clusters.

```python
rng = np.random.RandomState(42)
fit_indices = rng.choice(
    len(vectors),
    size=min(300_000, len(vectors)),
    replace=False,
)

kmeans = MiniBatchKMeans(
    n_clusters=400,
    random_state=42,
    batch_size=16_384,
    max_iter=80,
    n_init=1,
)
kmeans.fit(vectors[fit_indices])
cluster_ids = kmeans.predict(vectors)
```

The same normalized vectors go into a FAISS HNSW index for approximate cosine-similarity search:

```python
index = faiss.IndexHNSWFlat(384, 32, faiss.METRIC_INNER_PRODUCT)
index.hnsw.efConstruction = 80
index.hnsw.efSearch = 64
index.add(np.ascontiguousarray(vectors, dtype="float32"))

similarities, _ = index.search(vectors, 6)
fifth_neighbor_similarity = similarities[:, 5]
outlier_index = int(np.argmin(fifth_neighbor_similarity))
```

Each paper is its own closest match, so the sixth result is its fifth other-paper neighbor. The paper with the lowest value has the least similar local neighborhood.

The complete reducer also groups cluster assignments by submission year, ranks the largest relative declines and recent increases, and writes the reports to shared storage. Run it on one larger worker:

```python
[results_dir] = remote_parallel_map(
    reduce_fossils,
    [vector_paths],
    func_cpu=16,
    func_ram=64,
)

print(results_dir)
```

## Run it

Start with 100,000 papers. Give the sample a separate shared root so a later full run does not reuse partial shards:

```bash
SHARED_DIR=/workspace/shared/arxiv-fossils-sample \
ARXIV_MAX_PAPERS=100000 \
python arxiv_fossils.py
```

Run the full snapshot by omitting the cap:

```bash
python arxiv_fossils.py
```

If the vectors already exist, rerun only the final analysis:

```bash
REDUCE_ONLY=1 python arxiv_fossils.py
```

## Result from the full run

| Metric | Value |
|---|---:|
| Abstracts embedded | 2,710,783 |
| Parquet shards | 272 |
| Topic clusters | 400 |
| Peak embedding calls | 16 |
| Full pipeline | about 25 minutes |
| Final analysis | 142.4 seconds |

The source contains 2,710,806 records. The pipeline retained 2,710,783 after dropping incomplete records and duplicate paper IDs.

The run wrote this summary:

```json
{
  "total_papers": 2710783,
  "n_shards": 272,
  "n_clusters": 400,
  "extinct_count": 10,
  "emergent_count": 10,
  "loneliest_id": "2203.12842",
  "reduce_elapsed_s": 142.41
}
```

The nearest-neighbor pass selected [“Financial statements of companies in Norway”](https://arxiv.org/abs/2203.12842) as the corpus's candidate semantic outlier. Its fifth other-paper neighbor had cosine similarity `0.138`.

## Interpreting the result

- The 400 clusters are a coarse semantic grouping, not an official arXiv taxonomy.
- The nearest-neighbor result is approximate because the FAISS index trades a small amount of recall for a much faster full-corpus search.
- The “faded topic” ranking compares each cluster's recent posting rate with its own peak. It does not adjust for arXiv's overall growth, so “faded” is more precise than “extinct.”
