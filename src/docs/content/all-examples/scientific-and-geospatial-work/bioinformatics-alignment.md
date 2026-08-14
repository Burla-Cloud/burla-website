# Align paired-end FASTQ samples in parallel

In this example we:

* Upload paired-end FASTQs and an indexed reference to `/workspace/shared`.
* Run one BWA-MEM alignment per sample.
* Pipe each alignment through samtools without writing an intermediate SAM file.
* Save the indexed BAMs back to shared storage.

The code uses a public Python 3.12 [worker image](https://github.com/Burla-Cloud/examples/tree/main/bioinformatics-alignment/worker-image) containing `bwa` and `samtools`.

## Before you run

Complete [Getting Started](/docs/get-started), then create a Python 3.12 environment:

```bash
mkdir burla-bwa-alignment
cd burla-bwa-alignment
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla
burla deploy
```

A deployed cluster is required because the inputs and BAMs use `/workspace/shared`. This path is mounted inside every worker, but not in the local process running the script.

{% hint style="warning" %}
The deployed cluster and alignment workers use paid cloud resources.
{% endhint %}

Open `burla dashboard`, then upload these files in **Filesystem**:

```text
/workspace/shared/bwa/
  reference/
    reference.fa
    reference.fa.amb
    reference.fa.ann
    reference.fa.bwt
    reference.fa.pac
    reference.fa.sa
  fastq/
    sample-01_R1.fastq.gz
    sample-01_R2.fastq.gz
```

The five sidecar files are produced by `bwa index reference.fa`. Keep `manifest.tsv` on your local machine:

```tsv
sample_id	fq1	fq2
sample-01	/workspace/shared/bwa/fastq/sample-01_R1.fastq.gz	/workspace/shared/bwa/fastq/sample-01_R2.fastq.gz
```

## 1. Configure the worker

Create `align.py` and add the next eight blocks in order. Start with the worker image and shared paths:

```python
import csv
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from burla import remote_parallel_map

IMAGE = (
    "us-docker.pkg.dev/test-burla/burla-demos/burla-bio-worker@"
    "sha256:835bb80a2bc678a97dfc26692737db79b5f31575477222b6450f759123044a57"
)
REFERENCE = Path("/workspace/shared/bwa/reference/reference.fa")
REFERENCE_SUFFIXES = (".amb", ".ann", ".bwt", ".pac", ".sa")
OUTPUT_DIR = Path("/workspace/shared/bwa/bams")
```

## 2. Stage one sample

Copy the reference, its index, and both FASTQs to the worker's local disk:

```python
def stage_sample(job, work):
    local_reference = work / REFERENCE.name
    reference_files = [
        REFERENCE, *(Path(f"{REFERENCE}{suffix}") for suffix in REFERENCE_SUFFIXES)
    ]
    for source in reference_files:
        shutil.copyfile(source, work / source.name)

    read_1 = work / "R1.fastq.gz"
    read_2 = work / "R2.fastq.gz"
    shutil.copyfile(job["fq1"], read_1)
    shutil.copyfile(job["fq2"], read_2)
    return local_reference, read_1, read_2
```

## 3. Align and index one sample

Pipe BWA-MEM directly into samtools, then build the BAM index:

```python
def run_alignment(sample_id, local_reference, read_1, read_2, work):
    local_bam = work / f"{sample_id}.bam"
    read_group = f"@RG\tID:{sample_id}\tSM:{sample_id}\tLB:{sample_id}\tPL:ILLUMINA"

    bwa_command = [
        "bwa", "mem", "-t", "4", "-R", read_group,
        str(local_reference), str(read_1), str(read_2),
    ]
    bwa = subprocess.Popen(bwa_command, stdout=subprocess.PIPE)
    samtools = subprocess.Popen(
        ["samtools", "sort", "-o", str(local_bam), "-"], stdin=bwa.stdout
    )
    bwa.stdout.close()

    samtools.wait()
    bwa.wait()
    bwa.check_returncode()
    samtools.check_returncode()

    subprocess.run(["samtools", "index", str(local_bam)], check=True)
    return local_bam
```

The BWA-MEM and samtools processes overlap and share the four CPUs reserved for each remote call.

## 4. Save the alignment

Copy the closed BAM and BAI back to shared storage:

```python
def save_alignment(local_bam):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    shared_bam = OUTPUT_DIR / local_bam.name
    shared_bai = Path(f"{shared_bam}.bai")
    shutil.copyfile(local_bam, shared_bam)
    shutil.copyfile(Path(f"{local_bam}.bai"), shared_bai)
    return shared_bam, shared_bai
```

## 5. Run one sample

One remote call joins those three file operations and returns compact metadata:

```python
def align_sample(job):
    sample_id = job["sample_id"]
    if not re.fullmatch(r"[A-Za-z0-9._-]+", sample_id):
        raise ValueError(f"Unsafe sample_id: {sample_id!r}")

    started = time.time()
    with tempfile.TemporaryDirectory(prefix=f"{sample_id}-") as temp_dir:
        work = Path(temp_dir)
        local_reference, read_1, read_2 = stage_sample(job, work)
        local_bam = run_alignment(sample_id, local_reference, read_1, read_2, work)
        shared_bam, shared_bai = save_alignment(local_bam)
        return {
            "sample_id": sample_id,
            "elapsed_s": round(time.time() - started, 1),
            "bam_bytes": local_bam.stat().st_size,
            "bam": str(shared_bam),
            "bai": str(shared_bai),
        }
```

## 6. Load the manifest

Read and validate the small sample manifest locally:

```python
with open("manifest.tsv", newline="") as manifest_file:
    jobs = list(csv.DictReader(manifest_file, delimiter="\t"))

if not jobs:
    raise ValueError("manifest.tsv contains no samples")
if len(jobs) != len({job["sample_id"] for job in jobs}):
    raise ValueError("sample_id values must be unique")
```

## 7. Run samples in parallel

Submit one call per manifest row:

```python
reports = remote_parallel_map(
    align_sample, jobs, image=IMAGE, func_cpu=4, func_ram=16, grow=True
)
```

## 8. Write the report

Write the compact per-sample dictionaries on the local machine:

```python
with open("alignment-report.csv", "w", newline="") as report_file:
    writer = csv.DictWriter(report_file, fieldnames=reports[0])
    writer.writeheader()
    writer.writerows(reports)
```

Run it from the directory containing `manifest.tsv`:

```bash
python align.py
```

The large files stay inside the cluster. Only one small report dictionary per sample returns to your machine. Burla may return those dictionaries in a different order than the manifest.
