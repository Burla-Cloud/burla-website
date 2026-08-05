---
cover: /docs-assets/how-to-guides/map-reduce-cover.webp
coverY: 0
description: >-
---

# Combine many results/files into one. (Map-Reduce)

Map-reduce means:

* **map**: run many function calls in parallel
* **reduce**: combine their outputs into one result

## Why you might need this

Use this when you want to do lots of work in parallel, but end with one final output.

* **Many files → one report**
* **Many small results → one total** (this example)

Map writes outputs to `/workspace/shared`. Reduce reads them back and combines them.

## Before you start

Make sure you have already:

1. installed Burla: `pip install burla`
2. connected your machine: `burla login`
3. started your cluster in the Burla dashboard

If you’re new to `/workspace/shared`, start with [Read and Write GCS Files](/docs/all-examples/basic-examples/read-and-write-gcs-files). If you’re new to `func_cpu` and `func_ram`, see the [`remote_parallel_map` API reference](/docs/api-reference).

## Step 1 (Map): Write one file per input

```python
from pathlib import Path
from burla import remote_parallel_map


def write_part_file(number):
    part_file_path = f"/workspace/shared/map-reduce-demo/parts/number-{number}.txt"
    Path(part_file_path).parent.mkdir(parents=True, exist_ok=True)
    Path(part_file_path).write_text(f"{number}\n")
    return part_file_path


inputs = list(range(5))
part_file_paths = remote_parallel_map(write_part_file, inputs)
print(part_file_paths)
```

This creates 5 files in `/workspace/shared/map-reduce-demo/parts/`.

## Step 2 (Reduce): Combine all files into one file

The reduce step runs once, so it is a common place to use a bigger machine (more CPU / RAM).

```python
from pathlib import Path
from burla import remote_parallel_map


def combine_part_files(part_paths):
    total = 0
    for path in part_paths:
        total += int(Path(path).read_text().strip())

    output_file_path = "/workspace/shared/map-reduce-demo/final/total.txt"
    Path(output_file_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_file_path).write_text(f"{total}\n")
    return output_file_path


output_file_paths = remote_parallel_map(
    combine_part_files,
    [part_file_paths],
    func_cpu=8,
    func_ram=32,
)
print(output_file_paths[0])
```

The final combined file path is:

* `/workspace/shared/map-reduce-demo/final/total.txt`
