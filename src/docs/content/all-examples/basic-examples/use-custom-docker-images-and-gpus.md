---
cover: /docs-assets/how-to-guides/custom-docker-gpus-cover.webp
coverY: 0
description: Run Burla workers with custom images, native tools, and GPUs.
---

# Use custom Docker images & GPUs

Use this when your worker needs CUDA, native binaries, pinned system packages, large model weights, or a private runtime. Do not build an image for a small pure-Python job unless package install time is already the problem. The unit of work stays the same: one file, batch, tile, sample, or shard per input. Each worker runs your function inside the image you pass to `remote_parallel_map`. The output should be small metadata or a path to files written by the worker.

An image changes the worker environment. It should not change the shape of the job.

## When to use an image

Use a custom image when the worker needs:

1. native tools such as `bwa`, `samtools`, `gdal`, `ffmpeg`, or OCR libraries
2. CUDA libraries for PyTorch, TensorFlow, CLIP, YOLO, or embedding models
3. large model weights that should not download on every worker startup
4. system packages that `pip install` cannot provide
5. a pinned Python environment that must match production

For ordinary Python packages, start without a custom image. Burla can install many Python dependencies at runtime.

## Build the smallest image that contains the slow parts

For native command-line tools, start from an image that already has the system packages you need.

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    bwa \
    samtools \
    && rm -rf /var/lib/apt/lists/*

RUN pip install boto3 awscli
```

Build and push it to a registry your Burla workers can pull from.

```bash
docker build -t us-docker.pkg.dev/my-project/burla/bio-worker:latest .
docker push us-docker.pkg.dev/my-project/burla/bio-worker:latest
```

## Run native tools from a worker

Plan one sample per input.

```python
with open("manifest.tsv") as f:
    samples = [line.strip().split("\t") for line in f if line.strip()]

sample_jobs = [
    {"sample_id": sample_id, "fq1": fq1, "fq2": fq2}
    for sample_id, fq1, fq2 in samples
]
```

The worker can call the tools directly.

```python
import os
import subprocess
import time
def align_sample(job):

    sample_id = job["sample_id"]
    work_dir = f"/tmp/{sample_id}"
    os.makedirs(work_dir, exist_ok=True)

    start = time.time()
    subprocess.run(f"aws s3 cp {job['fq1']} {work_dir}/R1.fastq.gz", shell=True, check=True)
    subprocess.run(f"aws s3 cp {job['fq2']} {work_dir}/R2.fastq.gz", shell=True, check=True)
    subprocess.run(
        f"bwa mem -t 4 /refs/hg38.fa {work_dir}/R1.fastq.gz {work_dir}/R2.fastq.gz "
        f"| samtools sort -@ 4 -o {work_dir}/{sample_id}.bam -",
        shell=True,
        check=True,
        executable="/bin/bash",
    )
    subprocess.run(f"aws s3 cp {work_dir}/{sample_id}.bam s3://my-bam-bucket/bams/{sample_id}.bam", shell=True, check=True)
    return {"sample_id": sample_id, "elapsed_s": round(time.time() - start, 1)}
```

Run the job with the image and the resources one sample needs.

```python
from burla import remote_parallel_map

IMAGE = "us-docker.pkg.dev/my-project/burla/bio-worker:latest"

reports = remote_parallel_map(
    align_sample,
    sample_jobs,
    image=IMAGE,
    func_cpu=4,
    func_ram=16,
    grow=True,
)
```

The output is a report. The BAM files are written to object storage by the worker.

## Use a CUDA image for GPU work

For GPU jobs, start from a CUDA runtime image or a framework image with CUDA already installed.

```dockerfile
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN pip install sentence-transformers pyarrow numpy

RUN python - <<'PY'
from sentence_transformers import SentenceTransformer
SentenceTransformer("BAAI/bge-large-en-v1.5")
PY
```

Baking model weights into the image makes startup slower at build time and faster at job time. That is usually the right trade when many GPU workers load the same model.

## Cache heavy models on the worker

Plan text shards or document batches on the client.

```python
from pathlib import Path

shard_paths = [str(path) for path in Path("/workspace/shared/texts").glob("*.jsonl")]
```

Cache the model on the worker process so later inputs on the same worker do not reload it.

```python
import json
from pathlib import Path
import numpy as np
from sentence_transformers import SentenceTransformer
def embed_shard(shard_path):


    if not hasattr(embed_shard, "_model"):
        embed_shard._model = SentenceTransformer("BAAI/bge-large-en-v1.5", device="cuda")

    rows = [json.loads(line) for line in Path(shard_path).read_text().splitlines()]
    texts = [row["text"] for row in rows]
    vectors = embed_shard._model.encode(texts, batch_size=64, normalize_embeddings=True).astype("float32")

    output_path = Path("/workspace/shared/embeddings") / f"{Path(shard_path).stem}.npy"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    np.save(output_path, vectors)
    return {"shard": shard_path, "rows": len(rows), "output_path": str(output_path)}
```

Ask for a GPU and cap parallelism to your GPU quota.

```python
GPU_IMAGE = "us-docker.pkg.dev/my-project/burla/embedder:latest"

embedding_reports = remote_parallel_map(
    embed_shard,
    shard_paths,
    image=GPU_IMAGE,
    func_gpu="A100",
    func_cpu=4,
    func_ram=32,
    max_parallelism=8,
    grow=True,
)
```

Then reduce paths, not arrays.

```python
embedding_paths = [row["output_path"] for row in embedding_reports]
```

## Match Python versions

The Python version in your client and the image should match.

If your image runs Python 3.12, run your local script with Python 3.12. Version drift can look like a Burla or Docker problem when it is really a serialization problem.

## Keep credentials out of the image

Do not bake API keys, database passwords, or cloud credentials into an image.

Read secrets at module level on your machine instead. The value is captured into the pickled function and travels to workers with your code. Pass it explicitly to library constructors, for example `OpenAI(api_key=OPENAI_API_KEY)` or `boto3.client("s3", aws_access_key_id=..., aws_secret_access_key=...)`.

Burla does not forward your client environment variables to workers, and workers have no cloud identity by default. See [Pass API keys & secrets to workers](/docs/all-examples/basic-examples/pass-api-keys-and-secrets-to-workers).

The image should contain code dependencies, not secrets.

## Choose resources from the worker

Set resources from what one worker does:

1. `func_cpu`: threads used by one task
2. `func_ram`: peak memory for one task
3. `func_gpu`: GPU type needed by one task
4. `max_parallelism`: quota or external bottleneck
5. `image`: environment needed by one task

Do not ask for a GPU because the whole pipeline has a GPU step. Ask for a GPU only on the call whose worker uses CUDA.

## Examples that use this pattern

* [Embed Wikipedia on A100s, then ask the search question](/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo)
* [Align every FASTQ sample without building a scheduler first](/docs/all-examples/scientific-and-geospatial-work/bioinformatics-alignment)
* [Process every raster tile, not a pretty subset](/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing)
* [Genomic Pipeline on 1,000 CPUs](/docs/featured-examples/multi-stage-genomic-pipeline)
* [Test Airbnb hypotheses at public-data scale](/docs/featured-examples/airbnb-burla)
* [The Question You Asked Is Not the Experiment You Ran](/broken/pages/if4VVPAhR8Yy7e7rPhSv)
