---
cover: /docs-assets/more-examples/gpu-embedding-demo-cover.webp
coverY: 0
description: Embed Wikipedia text on up to eight A100s, store vector shards in shared storage, and search them from the client.
---

# Build Wikipedia semantic search on A100s

This example downloads rows from the `20231101.en` split of [Wikimedia's Wikipedia dataset](https://huggingface.co/datasets/wikimedia/wikipedia), embeds them with `BAAI/bge-large-en-v1.5` on up to eight A100s, and searches the resulting vectors from the local process.

The default run embeds 50,000 rows across 50 jobs. The dataset has 41 source Parquet files, and the downloader wraps back to file zero after job 40. Nine jobs therefore repeat rows from earlier files, so this is not a corpus of 50,000 distinct articles.

Read the [complete script](https://github.com/Burla-Cloud/examples/blob/main/gpu-embedding-demo/demo.py) and its [source README](https://github.com/Burla-Cloud/examples/tree/main/gpu-embedding-demo).

## Before you run

This script is specific to GCP. Its local search stage reads Burla's shared bucket through the Google Cloud Storage API, so you need:

- a deployed GCP Burla cluster
- A100 quota in the cluster's region
- Google Application Default Credentials for the same project
- Python 3.11 on the client

Complete [Getting Started](/docs/get-started) and run `burla deploy` in that GCP project before starting the pipeline.

The custom image uses Python 3.11. Burla compares the client's Python major and minor version with each worker container, so a Python 3.12 client cannot use this image.

Clone the example and install the client dependencies:

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/gpu-embedding-demo
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt pyarrow torch sentence-transformers
```

At the current public commit, `demo.py` references `io` and `np` without importing them. Add these imports before running it:

```python
import io
import numpy as np
```

The full run uses paid A100 compute:

```bash
python demo.py
```

The code below is excerpted from that script.

## The pipeline

```text
Wikipedia Parquet files
  -> 50 shared JSONL text shards
  -> 50 shared vector and title shards
  -> one remote query vector
  -> local cosine-similarity search
```

### 1. Put the model in a CUDA image

The included Dockerfile starts from a CUDA-enabled PyTorch image, installs the embedding libraries, and downloads the model at build time:

```dockerfile
FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

RUN pip install --no-cache-dir \
      sentence-transformers==3.0.1 \
      datasets==2.21.0 \
      huggingface-hub==0.24.6

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-large-en-v1.5')"
```

The source uses the published image `jakezuliani/burla-embedder:latest`. To own the image and its model cache, build the same Dockerfile for the workers' `linux/amd64` platform, push it, and replace `IMAGE` in `demo.py`:

```bash
docker buildx build \
  --platform=linux/amd64 \
  --push \
  -t <registry>/burla-embedder:latest .
```

### 2. Download text on CPU workers

Each job downloads one source Parquet file, keeps its first 1,000 rows, trims each body to 2,000 characters, and writes JSONL under `/workspace/shared/vector_embeddings_demo/texts`:

```python
def download_shard(shard_idx, articles_per_shard, shared_root):
    parquet_url = PARQUET_URL_TEMPLATE.format(
        shard_idx=shard_idx % N_PARQUET_FILES
    )
    request = urllib.request.Request(
        parquet_url,
        headers={"User-Agent": "burla-demo/1.0"},
    )
    with urllib.request.urlopen(request) as response:
        parquet_bytes = response.read()

    table = pq.read_table(io.BytesIO(parquet_bytes))
    table = table.slice(0, min(articles_per_shard, len(table)))

    out_path = Path(shared_root) / "texts" / f"shard-{shard_idx:05d}.jsonl"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        for row in table.to_pylist():
            record = {
                "id": row["id"],
                "title": row["title"],
                "text": (row.get("text") or "")[:2000],
            }
            f.write(json.dumps(record) + "\n")
    return str(out_path)
```

Burla unpacks each input tuple into the function's three arguments:

```python
download_inputs = [
    (i, ARTICLES_PER_SHARD, SHARED_ROOT)
    for i in range(N_SHARDS)
]
text_paths = remote_parallel_map(
    download_shard,
    download_inputs,
    image=IMAGE,
    grow=True,
    func_cpu=2,
    func_ram=8,
    max_parallelism=min(MAX_CPU_PARALLELISM, N_SHARDS),
)
```

This stage uses the custom image for its Python packages but does not request a GPU.

### 3. Embed each shard on an A100

The embedding function reads one shared JSONL file, normalizes its vectors, and writes a float32 NumPy matrix plus matching IDs and titles. A module-level cache avoids loading the model again when one worker process receives another shard.

```python
cache = {}

def embed_shard(shard_path, model_name, shared_root):
    if "model" not in cache:
        cache["model"] = SentenceTransformer(model_name, device="cuda")

    rows = [
        json.loads(line)
        for line in Path(shard_path).read_text().splitlines()
    ]
    texts = [f"{row['title']}\n\n{row['text']}" for row in rows]
    vectors = cache["model"].encode(
        texts,
        batch_size=64,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    ).astype("float32")

    shard_name = Path(shard_path).stem.replace("shard-", "")
    embedding_dir = Path(shared_root) / "embeddings"
    embedding_dir.mkdir(parents=True, exist_ok=True)
    vector_path = embedding_dir / f"emb-{shard_name}.npy"
    ids_path = embedding_dir / f"ids-{shard_name}.json"
    np.save(vector_path, vectors)
    ids_path.write_text(json.dumps({
        "ids": [row["id"] for row in rows],
        "titles": [row["title"] for row in rows],
    }))
    return {"emb_path": str(vector_path), "ids_path": str(ids_path)}
```

Request one A100 per call and cap the job at eight concurrent calls:

```python
embed_results = remote_parallel_map(
    embed_shard,
    [(path, MODEL_NAME, SHARED_ROOT) for path in text_paths],
    image=IMAGE,
    grow=True,
    func_gpu="A100",
    max_parallelism=min(MAX_GPU_PARALLELISM, len(text_paths)),
)
```

On GCP, `func_gpu="A100"` currently selects an A100 40 GB machine. `grow=True` starts matching nodes when the cluster does not already have enough, while `max_parallelism` limits how many A100 calls can run together.

### 4. Cross the shared-storage boundary

The worker paths returned above are not local paths. `/workspace/shared` is mounted inside worker containers, while the client reaches the same objects through GCS.

The script embeds the query on one A100, then converts each worker path into a blob name:

```python
[query_vector] = remote_parallel_map(
    embed_query,
    [(QUERY, MODEL_NAME)],
    image=IMAGE,
    grow=True,
    func_gpu="A100",
    max_parallelism=1,
)

storage_client = storage.Client(project=PROJECT_ID)
bucket = storage_client.bucket(f"{PROJECT_ID}-burla-shared-workspace")

def download(worker_path):
    blob_name = worker_path.replace("/workspace/shared/", "", 1)
    return bucket.blob(blob_name).download_as_bytes()
```

`remote_parallel_map` does not promise result order, so the script sorts the embedding reports by path. It downloads each matrix and its matching title file, concatenates the matrices, and computes normalized inner products:

```python
matrices = []
titles = []
for result in sorted(embed_results, key=lambda item: item["emb_path"]):
    matrices.append(np.load(io.BytesIO(download(result["emb_path"]))))
    titles.extend(json.loads(download(result["ids_path"]))["titles"])

matrix = np.concatenate(matrices, axis=0)
scores = matrix @ np.asarray(query_vector, dtype="float32")
```

## Reported result

The source README records this output:

```text
Top 5 results for: 'Who invented the telephone?'

  1. [0.8161] Alexander Graham Bell
  2. [0.7474] Thomas A. Watson
  3. [0.6338] André-Marie Ampère
  4. [0.6276] Alessandro Volta
  5. [0.5990] Sidney Howe Short
```

It reports about 3 to 4 minutes for the embedding stage after workers are ready and about 10 minutes for a run that includes boot and image pull. No machine-readable run log is included, so those timings are reported measurements rather than a reproducible benchmark.
