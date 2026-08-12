---
cover: /docs-assets/more-examples/gpu-embedding-demo-cover.webp
coverY: 0
---

# Embed 50K Wikipedia articles on A100s

In this example we:

* Download 50,000 English Wikipedia articles from the Hugging Face `wikimedia/wikipedia` dataset.
* Prepare small JSONL text shards on CPU workers.
* Embed every shard with `BAAI/bge-large-en-v1.5` on A100 workers.
* Write vector shards to shared storage, then search across the combined matrix.

The goal is not to make a toy embedding script. The goal is to keep the real production shape visible: cheap CPU workers prepare text, expensive GPU workers run the model, and the only thing the client combines at the end is compact vector artifacts.

### Dataset: English Wikipedia

We use the `20231101.en` split of `wikimedia/wikipedia`. Each row has an article id, URL, title, and text body.

For this demo we only use the first 50,000 articles. That is small enough to inspect and rerun, but large enough that the pipeline has the same shape as a real backfill.

```python
import json
import math
import os
from itertools import islice
from pathlib import Path

import numpy as np
from burla import remote_parallel_map
from datasets import load_dataset

MODEL_NAME = "BAAI/bge-large-en-v1.5"
GPU_IMAGE = "jakezuliani/burla-embedder:latest"
SHARED_ROOT = Path("/workspace/shared/vector_embeddings_demo")

ARTICLE_COUNT = 50_000
TEXT_SHARDS = 50
ARTICLES_PER_SHARD = math.ceil(ARTICLE_COUNT / TEXT_SHARDS)
MAX_GPU_PARALLELISM = int(os.environ.get("DEMO_MAX_GPU_PARALLELISM", 8))
```

`/workspace/shared` is backed by Burla shared storage. Anything written there by one worker can be read later by the client or by another worker.

The client environment needs `burla`, `datasets`, `numpy`, and `sentence-transformers`. The GPU worker environment comes from the image in the next step.

### Step 1: Use a CUDA image

For the GPU stage we use a custom image with PyTorch, `sentence-transformers`, `numpy`, and the model weights already installed.

```dockerfile
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN pip install sentence-transformers numpy

RUN python - <<'PY'
from sentence_transformers import SentenceTransformer
SentenceTransformer("BAAI/bge-large-en-v1.5")
PY
```

Build and push that image to a registry your Burla workers can pull from. In this example, the pushed image is:

```python
GPU_IMAGE = "jakezuliani/burla-embedder:latest"
```

Baking the model into the image is deliberate. Without it, every A100 worker starts by downloading the same model weights, and the demo turns into a network and cache test instead of an embedding job.

### Step 2: Prepare text shards on CPU workers

The CPU stage downloads article text and writes 50 JSONL shards. Each shard contains 1,000 articles, trimmed to the first 2,000 characters so the GPU stage does predictable work.

```python
def prepare_text_shard(shard_idx: int) -> dict:
    start = shard_idx * ARTICLES_PER_SHARD
    stop = min(start + ARTICLES_PER_SHARD, ARTICLE_COUNT)

    dataset = load_dataset(
        "wikimedia/wikipedia",
        "20231101.en",
        split="train",
        streaming=True,
    )

    rows = []
    for row in islice(dataset, start, stop):
        rows.append({
            "id": row["id"],
            "url": row["url"],
            "title": " ".join(row["title"].split()),
            "text": " ".join(row["text"].split())[:2_000],
        })

    out_path = SHARED_ROOT / "texts" / f"shard-{shard_idx:05d}.jsonl"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(json.dumps(row) for row in rows))

    return {"shard_idx": shard_idx, "rows": len(rows), "path": str(out_path)}
```

Prepare all 50 shards.

```python
text_reports = remote_parallel_map(
    prepare_text_shard,
    range(TEXT_SHARDS),
    func_cpu=2,
    func_ram=8,
    grow=True,
)

total_rows = sum(report["rows"] for report in text_reports)
print(f"Prepared {total_rows:,} Wikipedia articles")
```

This stage does not ask for GPUs. It is just I/O and light string cleanup, so giving it A100s would make the example more expensive without making it clearer or faster in the way that matters.

For 50,000 articles, simple streaming offsets keep the code easy to read. For a million-article run, I would shard by source Parquet file first so workers do not rescan earlier rows.

### Step 3: Embed each shard on A100s

Now each GPU worker reads one JSONL shard, loads the embedding model once, and writes two files:

* a `.npy` matrix containing normalized float32 vectors
* a metadata JSONL file containing ids, URLs, and titles in the same order

The worker returns paths to those files. It does not return the vectors through Python.

```python
def embed_text_shard(report: dict) -> dict:
    import json
    from pathlib import Path

    import numpy as np
    from sentence_transformers import SentenceTransformer

    if not hasattr(embed_text_shard, "_model"):
        embed_text_shard._model = SentenceTransformer(MODEL_NAME, device="cuda")

    shard_idx = report["shard_idx"]
    rows = [
        json.loads(line)
        for line in Path(report["path"]).read_text().splitlines()
        if line.strip()
    ]

    texts = [f"{row['title']}\n\n{row['text']}" for row in rows]
    vectors = embed_text_shard._model.encode(
        texts,
        batch_size=64,
        normalize_embeddings=True,
    ).astype("float32")

    vector_path = SHARED_ROOT / "vectors" / f"shard-{shard_idx:05d}.npy"
    meta_path = SHARED_ROOT / "metadata" / f"shard-{shard_idx:05d}.jsonl"
    vector_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.parent.mkdir(parents=True, exist_ok=True)

    np.save(vector_path, vectors)
    meta_path.write_text("\n".join(json.dumps({
        "id": row["id"],
        "url": row["url"],
        "title": row["title"],
    }) for row in rows))

    return {
        "shard_idx": shard_idx,
        "rows": len(rows),
        "shape": list(vectors.shape),
        "vector_path": str(vector_path),
        "meta_path": str(meta_path),
    }
```

Run the embedding stage.

```python
embedding_reports = remote_parallel_map(
    embed_text_shard,
    text_reports,
    image=GPU_IMAGE,
    func_gpu="A100",
    func_cpu=4,
    func_ram=32,
    max_parallelism=MAX_GPU_PARALLELISM,
    grow=True,
)

embedding_reports = sorted(embedding_reports, key=lambda r: r["shard_idx"])
print(f"Embedded {sum(r['rows'] for r in embedding_reports):,} articles")
print(f"Vector shape for first shard: {embedding_reports[0]['shape']}")
```

`max_parallelism` is the GPU budget knob. If your account can run 8 A100 workers, use 8. If it can run 2, use 2. The code does not change.

### Step 4: Search the vectors

The expensive part is finished. Search only needs the vector shards, the metadata shards, and one query vector.

For one query, running the model locally on CPU is fine. If you do not want the model on your client at all, write a tiny query-embedding function and run it with the same GPU image.

```python
import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

query = "How do astronomers measure the distance to galaxies?"

query_model = SentenceTransformer(MODEL_NAME)
query_vector = query_model.encode(
    [query],
    normalize_embeddings=True,
).astype("float32")[0]

matrices = []
metadata = []

for report in embedding_reports:
    matrices.append(np.load(report["vector_path"]))
    metadata.extend(
        json.loads(line)
        for line in Path(report["meta_path"]).read_text().splitlines()
        if line.strip()
    )

matrix = np.vstack(matrices)
scores = matrix @ query_vector
top_indices = np.argsort(-scores)[:10]

for rank, idx in enumerate(top_indices, start=1):
    row = metadata[int(idx)]
    print(f"{rank:>2}. {scores[int(idx)]:.3f}  {row['title']}  {row['url']}")
```

This is the moment the example is trying to make boring: vectors are just files, metadata is just JSONL, and search is just a matrix multiply. Burla helped with the part that should be parallel, then got out of the way.
