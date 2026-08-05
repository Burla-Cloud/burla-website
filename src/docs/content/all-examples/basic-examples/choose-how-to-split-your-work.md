---
cover: /docs-assets/how-to-guides/split-work-cover.webp
coverY: 0
description: Pick the input unit for a Burla job.
---

# Decide how to split your work.

Use this when you know what code should run, but not what to pass as the input list. Do not use this to tune a job whose input unit is already obvious. The unit of work is one item from the list you pass to `remote_parallel_map`. Each worker should own enough work to be worth starting, but not so much that one failure wastes an hour. The output should be small, or a path to a file written by the worker.

The main decision in a Burla job is not the cluster size. It is the shape of the input list.

## The rule

Pick an input unit that is:

1. independent from the other inputs
2. large enough to amortize startup and setup
3. small enough to fit in worker memory
4. cheap enough to retry
5. aligned with the output you need

If the input unit is wrong, more machines usually make the wrong thing happen faster.

## Common split patterns

Use one file per input when files are already the natural boundary.

```python
from pathlib import Path

file_paths = [str(path) for path in Path("/workspace/shared/raw").glob("*.parquet")]
```

Use several files per input when each file is tiny and startup would dominate.

```python
def chunks(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]


file_groups = chunks(file_paths, 100)
```

Use row ranges when a database table has an indexed numeric column.

```python
def build_id_ranges(start_id, end_id, rows_per_range):
    return [
        (range_start, min(range_start + rows_per_range - 1, end_id))
        for range_start in range(start_id, end_id + 1, rows_per_range)
    ]


id_ranges = build_id_ranges(1, 10_000_000, 50_000)
```

Use byte ranges when one line-oriented file is too large to read on one machine.

```python
def build_byte_ranges(total_bytes, bytes_per_range):
    return [
        (start, min(start + bytes_per_range, total_bytes))
        for start in range(0, total_bytes, bytes_per_range)
    ]


ranges = build_byte_ranges(total_bytes=275_000_000_000, bytes_per_range=500_000_000)
```

Use chunks of URLs, IDs, or prompts when the bottleneck is an API, website, database, or model provider.

```python
with open("user_ids.txt") as f:
    user_ids = [line.strip() for line in f if line.strip()]

id_chunks = chunks(user_ids, 1000)
```

Use one tile, scene, sample, or shard when the source system already has useful boundaries.

```python
with open("sentinel_tiles.txt") as f:
    tile_ids = [line.strip() for line in f if line.strip()]
```

## Write the worker around one input

The worker should make one input useful. Keep source reads, local work, and output writes together.

```python
import pyarrow.parquet as pq
def scan_one_parquet_file(path):

    table = pq.read_table(path)
    return {
        "path": path,
        "rows": table.num_rows,
        "columns": len(table.column_names),
    }
```

Then run that worker over the input list.

```python
from burla import remote_parallel_map

reports = remote_parallel_map(
    scan_one_parquet_file,
    file_paths,
    func_cpu=1,
    func_ram=4,
    grow=True,
)
```

## Return small outputs

Returning small dicts, numbers, or short strings is fine.

```python
import pandas as pd

report = pd.DataFrame(reports)
report.to_csv("scan-report.csv", index=False)
```

For large outputs, write a file from inside the worker and return the path.

```python
from pathlib import Path
import pyarrow.parquet as pq

def transform_one_file(path):
    table = pq.read_table(path)
    output_path = Path("/workspace/shared/processed") / Path(path).name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(table, output_path)
    return str(output_path)
```

This avoids sending large dataframes or arrays back through the client.

## Pick chunk size from the bottleneck

If startup or model load time is expensive, make each input bigger.

If failures are common, make each input smaller.

If memory is tight, make each input smaller or ask for more `func_ram`.

If the output is large, write files to `/workspace/shared` and reduce paths later.

If the bottleneck is outside Burla, start with the external limit. API quotas, website politeness, database connections, object storage bandwidth, and GPU memory matter more than CPU count.

## When to reduce

Reduce when the final answer needs a global view.

Examples:

1. many file reports into one CSV
2. many JSONL shards into one table
3. many heaps into one top-K list
4. many image manifests into one training manifest

For small outputs, reduce locally after `remote_parallel_map` returns.

For large outputs, run a second Burla call over output paths.

```python
import pandas as pd

def combine_reports(paths):
    frames = [pd.read_parquet(path) for path in paths]
    out_path = "/workspace/shared/final/report.parquet"
    pd.concat(frames, ignore_index=True).to_parquet(out_path)
    return out_path

[final_report_path] = remote_parallel_map(
    combine_reports,
    [processed_paths],
    func_cpu=8,
    func_ram=32,
)
```

## Start with this checklist

Before you run the full job, write down:

1. What is one input?
2. What does one worker read?
3. What does one worker write or return?
4. What is the external bottleneck?
5. What resource does one worker need?
6. What happens if one input fails?
7. Does the final answer need a reduce step?

That checklist catches most bad Burla job shapes before you spend money on them.

## Examples that use this pattern

* [Process thousands of files quickly](/docs/all-examples/basic-examples/process-thousands-of-files-quickly)
* [Process one giant file quickly](/docs/all-examples/basic-examples/process-one-giant-file-quickly)
* [Scan every Parquet shard instead of trusting a sample](/docs/all-examples/data-processing-examples/parquet-parallel)
* [Distill 571 million reviews with byte ranges](/docs/featured-examples/amazon-review-distiller)
* [Resize the whole image corpus before training on it](/docs/all-examples/production-data-jobs/image-dataset-resize)
