---
description: Align paired-end FASTQ samples in parallel with BWA-MEM and samtools, then keep the indexed BAMs in shared storage.
---

# Align paired-end FASTQ samples in parallel

This example runs one BWA-MEM alignment per paired-end sample. Each remote call stages its FASTQs and indexed reference on local disk, pipes BWA-MEM into samtools, then copies the BAM and BAI back to shared storage.

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

## The alignment script

Save this as `align.py`:

```python
import csv
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from burla import remote_parallel_map

IMAGE = "us-docker.pkg.dev/test-burla/burla-demos/burla-bio-worker:latest"
REFERENCE = Path("/workspace/shared/bwa/reference/reference.fa")
REFERENCE_SUFFIXES = (".amb", ".ann", ".bwt", ".pac", ".sa")
OUTPUT_DIR = Path("/workspace/shared/bwa/bams")


def align_sample(job: dict) -> dict:
    sample_id = job["sample_id"]
    if re.fullmatch(r"[A-Za-z0-9._-]+", sample_id) is None:
        raise ValueError(f"Unsafe sample_id: {sample_id!r}")

    started = time.time()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=f"{sample_id}-") as temp_dir:
        work = Path(temp_dir)
        local_reference = work / REFERENCE.name

        reference_files = [
            REFERENCE,
            *(Path(f"{REFERENCE}{suffix}") for suffix in REFERENCE_SUFFIXES),
        ]
        for source in reference_files:
            shutil.copy2(source, work / source.name)

        read_1 = work / "R1.fastq.gz"
        read_2 = work / "R2.fastq.gz"
        shutil.copy2(job["fq1"], read_1)
        shutil.copy2(job["fq2"], read_2)

        local_bam = work / f"{sample_id}.bam"
        read_group = (
            f"@RG\tID:{sample_id}\tSM:{sample_id}"
            f"\tLB:{sample_id}\tPL:ILLUMINA"
        )

        bwa = subprocess.Popen(
            [
                "bwa",
                "mem",
                "-t",
                "4",
                "-R",
                read_group,
                str(local_reference),
                str(read_1),
                str(read_2),
            ],
            stdout=subprocess.PIPE,
        )
        samtools = subprocess.Popen(
            ["samtools", "sort", "-o", str(local_bam), "-"],
            stdin=bwa.stdout,
        )
        assert bwa.stdout is not None
        bwa.stdout.close()

        samtools_code = samtools.wait()
        bwa_code = bwa.wait()
        if bwa_code:
            raise subprocess.CalledProcessError(bwa_code, bwa.args)
        if samtools_code:
            raise subprocess.CalledProcessError(samtools_code, samtools.args)

        subprocess.run(["samtools", "index", str(local_bam)], check=True)

        shared_bam = OUTPUT_DIR / local_bam.name
        shared_bai = Path(f"{shared_bam}.bai")
        shutil.copy2(local_bam, shared_bam)
        shutil.copy2(Path(f"{local_bam}.bai"), shared_bai)

        return {
            "sample_id": sample_id,
            "elapsed_s": round(time.time() - started, 1),
            "bam_bytes": local_bam.stat().st_size,
            "bam": str(shared_bam),
            "bai": str(shared_bai),
        }


with open("manifest.tsv", newline="") as manifest_file:
    jobs = list(csv.DictReader(manifest_file, delimiter="\t"))

if not jobs:
    raise ValueError("manifest.tsv contains no samples")
sample_ids = [job["sample_id"] for job in jobs]
if len(sample_ids) != len(set(sample_ids)):
    raise ValueError("sample_id values must be unique")

reports = remote_parallel_map(
    align_sample,
    jobs,
    func_cpu=4,
    func_ram=16,
    image=IMAGE,
    grow=True,
)

with open("alignment-report.csv", "w", newline="") as report_file:
    writer = csv.DictWriter(report_file, fieldnames=reports[0])
    writer.writeheader()
    writer.writerows(reports)
```

The BWA-MEM and samtools processes overlap and share the four CPUs reserved for each remote call.

Run it from the directory containing `manifest.tsv`:

```bash
python align.py
```

The large files stay inside the cluster. Only one small report dictionary per sample returns to your machine. Burla may return those dictionaries in a different order than the manifest.
