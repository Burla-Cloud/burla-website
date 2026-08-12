---
cover: /docs-assets/more-examples/bioinformatics-alignment-cover.webp
coverY: 0
---

# Align every FASTQ sample without building a scheduler first

In this example we:

* Read a paired-end FASTQ manifest.
* Run BWA-MEM and samtools in a custom worker image.
* Produce one BAM per sample, with one sample per Burla worker.
* Return one report row per sample for failures and runtime outliers.

One aligned sample proves the command works. It does not prove the cohort ran.

### Dataset: paired-end FASTQ manifest

The manifest is a TSV with `sample_id`, `fq1`, and `fq2`. The FASTQ paths can be S3 URLs or any paths your worker image can read.

```python
import os
import subprocess
import time
from pathlib import Path

from burla import remote_parallel_map

IMAGE = "us-docker.pkg.dev/test-burla/burla-demos/burla-bio-worker:latest"
REF_FASTA = "/refs/hg38.fa"
S3_OUT = "s3://my-bam-bucket"
```

### Step 1: Use an image with the native tools

Bioinformatics tools need native binaries, so the worker image matters.

```python
with open("manifest.tsv") as f:
    samples = [line.strip().split("\t") for line in f if line.strip()]

sample_jobs = [{"sample_id": s[0], "fq1": s[1], "fq2": s[2]} for s in samples]

print(f"Loaded {len(sample_jobs):,} samples")
```

The image should contain `bwa`, `samtools`, the AWS CLI if you read/write S3, and the reference genome at `REF_FASTA`.

### Step 2: Align one sample per worker

The worker downloads the FASTQs, runs the command-line tools, indexes the BAM, and writes the output to S3.

```python
def align_sample(job: dict) -> dict:
    sid, fq1, fq2 = job["sample_id"], job["fq1"], job["fq2"]
    work = f"/tmp/{sid}"
    os.makedirs(work, exist_ok=True)

    def run(cmd: str):
        subprocess.run(cmd, shell=True, check=True, executable="/bin/bash")

    t0 = time.time()
    run(f"aws s3 cp {fq1} {work}/R1.fastq.gz")
    run(f"aws s3 cp {fq2} {work}/R2.fastq.gz")
    run(f"bwa mem -t 4 {REF_FASTA} {work}/R1.fastq.gz {work}/R2.fastq.gz | samtools sort -@ 4 -o {work}/{sid}.bam -")
    run(f"samtools index {work}/{sid}.bam")
    run(f"aws s3 cp {work}/{sid}.bam {S3_OUT}/bams/{sid}.bam")
    run(f"aws s3 cp {work}/{sid}.bam.bai {S3_OUT}/bams/{sid}.bam.bai")

    return {
        "sample_id": sid,
        "elapsed_s": round(time.time() - t0, 1),
        "bam": f"{S3_OUT}/bams/{sid}.bam",
    }
```

The command is exactly the command you would run in a terminal. Burla only changes how many samples can run at once.

### Step 3: Run the cohort

Each sample gets 4 CPUs and 16GB of RAM.

```python
reports = remote_parallel_map(
    align_sample,
    sample_jobs,
    func_cpu=4,
    func_ram=16,
    image=IMAGE,
    grow=True,
)
```
