---
cover: /docs-assets/how-to-guides/split-work-cover.webp
coverY: 0
description: Pick the input unit for a Burla job.
---

# Decide how to split your work

The main decision in a Burla job is not the cluster size. It is the shape of the input list. One item in the list you pass to `remote_parallel_map` is the unit of work: each function call gets one item. Use this guide when you know what code should run but not what to pass as the input list.

An input can be the data itself (numbers, rows, a small array) or a reference to it (a file path, an ID range, a URL). Inputs are pickled and shipped to workers, so pass small data directly and pass references to anything big. References must point somewhere workers can reach. Workers run in your cloud, so a path that only exists on your laptop won't work.

## The rule

Pick an input unit that is:

1. independent of the other inputs
2. big enough that per-call setup, like opening connections or loading models, doesn't dominate
3. small enough to fit in worker memory
4. cheap to rerun when one call fails
5. aligned with the output you need

If the input unit is wrong, more machines make the wrong thing happen faster.

## Use boundaries the data already has

When the data is already split into files, tiles, scenes, or shards, use one per input. [Process thousands of files quickly](/docs/all-examples/basic-examples/process-thousands-of-files-quickly) is the worked example.

```python
from pathlib import Path
from burla import remote_parallel_map

def list_raw_files(folder):
    return [str(path) for path in Path(folder).glob("*.parquet")]

[file_paths] = remote_parallel_map(list_raw_files, ["/workspace/shared/raw"])
```

`/workspace/shared` exists in the cluster, not on your laptop, so listing it is itself a one-input Burla call. If the files live in your own bucket, build the same list with your cloud SDK instead.

## Batch units that are too small

When one unit is tiny, like one image, one URL, or one prompt, make each input a batch so each call does enough work to pay for its setup. [Resize the whole image corpus before training on it](/docs/all-examples/production-data-jobs/image-dataset-resize) feeds 1,000 images per input.

```python
batches = [image_keys[i:i + 1_000] for i in range(0, len(image_keys), 1_000)]
```

## Split by ranges when there are no boundaries

When the data is one continuous thing, invent boundaries: ID ranges for a database table ([Process database rows without building a queue](/docs/all-examples/basic-examples/process-data-in-your-database-quickly)), byte ranges for one giant file ([Distill 571 million reviews with byte ranges](/docs/featured-examples/amazon-review-distiller)).

```python
max_id = 10_000_000
row_ranges = [(start, start + 50_000) for start in range(0, max_id, 50_000)]
```

Tuple inputs are unpacked into separate arguments, so the function for this list is `def process_range(start, end)`.

## Match the unit to the bottleneck

* If per-call setup is expensive, make each input bigger.
* If failures are likely, make each input smaller. One raised exception stops the job, so a small unit makes the rerun cheap.
* If workers run out of memory, make each input smaller or reserve more with `func_ram`.
* If an API, database, or website is the limit, unit size matters less than concurrency. Cap it with `max_parallelism`: see [Limit parallelism for APIs or databases](/docs/all-examples/basic-examples/limit-parallelism-for-apis-databases-and-websites).

## Keep outputs small

Return numbers, short strings, or small dicts. Results are shipped back to your machine, so for anything big, write a file from inside the worker and return its path. On a deployed cluster `/workspace/shared` is backed by your cloud storage: see [Read/Write Files to Cloud Storage](/docs/all-examples/basic-examples/read-and-write-gcs-files).

When the final answer needs every result at once, combine them after `remote_parallel_map` returns. Do that on your machine when the results are small, or in a second one-input Burla call over the paths when they are not, as in [Process thousands of files quickly](/docs/all-examples/basic-examples/process-thousands-of-files-quickly).
