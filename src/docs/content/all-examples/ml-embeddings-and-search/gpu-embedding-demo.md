# Build Wikipedia semantic search on A100s

In this example we:

* Stage 50,000 rows from 40 distinct Wikipedia Parquet files.
* Embed each text shard on up to eight A100 workers.
* Store aligned titles and vectors under `/workspace/shared`.
* Search every shared shard remotely and return five matches.

The dataset's `20231101.en` split has 41 source Parquet files. This example uses 1,250 rows from each of the first 40 files, for 50,000 rows without wrapping back to an earlier file.

[Read more about the Wikimedia dataset](https://huggingface.co/datasets/wikimedia/wikipedia).

## Before you run

Complete [Getting Started](/docs/get-started), make sure your GCP or AWS cluster has A100 quota, then create a Python 3.11 environment:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install burla numpy pyarrow sentence-transformers
burla deploy
```

The [worker image](https://github.com/Burla-Cloud/examples/blob/main/gpu-embedding-demo/Dockerfile) uses Python 3.11, so the client must use the same major and minor version. It includes PyTorch, Sentence Transformers, PyArrow, NumPy, and the `BAAI/bge-large-en-v1.5` model.

## The pipeline

```text
Wikipedia Parquet files
  -> 40 shared JSONL text shards
  -> 40 shared vector shards
  -> one remote query vector
  -> one remote similarity search
  -> five matches returned locally
```

Create `wikipedia_search.py` and add the following blocks in order. Start with the image, model, and shared directory:

```python
import io
import json
import urllib.request
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq
from burla import remote_parallel_map
from sentence_transformers import SentenceTransformer

IMAGE = (
    "jakezuliani/burla-embedder@"
    "sha256:cdda4e319391016f69a6485ef27ff302bf738b0c87d0b6871f06a134e484ba95"
)
MODEL = "BAAI/bge-large-en-v1.5"
SHARED = "/workspace/shared/wikipedia-search"
```

### 1. Stage one text shard

The dataset has 41 source Parquet files. Use the first 40 once, keeping 1,250 rows from each:

```python
PARQUET_URL = (
    "https://huggingface.co/datasets/wikimedia/wikipedia/resolve/main/"
    "20231101.en/train-{index:05d}-of-00041.parquet"
)

def stage_articles(index):
    request = urllib.request.Request(
        PARQUET_URL.format(index=index),
        headers={"User-Agent": "burla-example/1.0"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        table = pq.read_table(
            io.BytesIO(response.read()),
            columns=["title", "text"],
        ).slice(0, 1_250)

    out_path = Path(SHARED) / "texts" / f"shard-{index:05d}.jsonl"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        for row in table.to_pylist():
            row["text"] = (row["text"] or "")[:2_000]
            f.write(json.dumps(row) + "\n")
    return str(out_path)
```

### 2. Stage all 40 shards

Run one CPU call per source file:

```python
text_paths = remote_parallel_map(
    stage_articles, range(40), image=IMAGE, func_cpu=2, func_ram=8, grow=True
)
```

### 3. Embed one shard

Each A100 call reads one staged file and writes one `.npz` containing aligned titles and vectors:

```python
model_cache = {}

def embed_shard(shard_path):
    if "model" not in model_cache:
        model_cache["model"] = SentenceTransformer(MODEL, device="cuda")

    rows = [json.loads(line) for line in Path(shard_path).read_text().splitlines()]
    texts = [f"{row['title']}\n\n{row['text']}" for row in rows]
    vectors = model_cache["model"].encode(
        texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False
    ).astype("float32")

    output_path = Path(SHARED) / "embeddings" / f"{Path(shard_path).stem}.npz"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(output_path, vectors=vectors, titles=[row["title"] for row in rows])
    return str(output_path)
```

### 4. Embed all shards on up to eight A100s

Request one A100 per call and cap the job at eight concurrent calls:

```python
embedding_paths = remote_parallel_map(
    embed_shard, text_paths, image=IMAGE, func_gpu="A100", max_parallelism=8, grow=True
)
```

`grow=True` starts matching nodes when the cluster needs more capacity. `max_parallelism=8` prevents the job from using more than eight A100s at once.

### 5. Embed the query

Return the one query vector because it is small:

```python
def embed_query(query):
    if "model" not in model_cache:
        model_cache["model"] = SentenceTransformer(MODEL, device="cuda")

    vector = model_cache["model"].encode(
        [query], normalize_embeddings=True, show_progress_bar=False
    )[0]
    return vector.astype("float32").tolist()

query = "Who invented the telephone?"
[query_vector] = remote_parallel_map(
    embed_query, [query], image=IMAGE, func_gpu="A100", grow=True
)
```

### 6. Search the shared vectors on Burla

`/workspace/shared` is mounted on every worker, not on the local client. Submit the search so the large vector shards stay in the cluster:

```python
def search_shards(query_vector, shard_paths, top_k):
    vectors = []
    titles = []
    for path in sorted(shard_paths):
        with np.load(path) as shard:
            vectors.append(shard["vectors"])
            titles.extend(shard["titles"].tolist())

    scores = np.concatenate(vectors) @ np.asarray(query_vector, dtype="float32")
    best = np.argpartition(scores, -top_k)[-top_k:]
    best = best[np.argsort(scores[best])[::-1]]
    return [{"title": str(titles[index]), "score": float(scores[index])} for index in best]

[matches] = remote_parallel_map(
    search_shards, [(query_vector, embedding_paths, 5)],
    image=IMAGE, func_cpu=8, func_ram=16, grow=True,
)

for match in matches:
    print(f"{match['score']:.4f}  {match['title']}")
```

The local process receives five titles and scores. The 50,000 vectors remain in shared storage.

## Run it

```bash
python wikipedia_search.py
```
