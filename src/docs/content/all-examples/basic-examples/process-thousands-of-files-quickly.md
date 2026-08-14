---
cover: /docs-assets/more-examples/one-parquet-file-per-worker.webp
coverY: 0
description: Run one remote function call per shared file, then combine the results locally.
---

# Process thousands of files quickly

Give each remote function call one file path. This example counts lines containing `ERROR` across a folder of log files in shared storage.

## Before you run this

1. Complete [Getting Started](/docs/get-started).
2. In the dashboard's **Filesystem** tab, create a `logs` folder and upload your `.log` files.

## Step 1: List the files

`/workspace/shared` exists inside the cluster, so list the folder in a remote function:

```python
from pathlib import Path

from burla import remote_parallel_map

LOG_DIR = Path("/workspace/shared/logs")

def list_log_files(_):
    return [str(path) for path in LOG_DIR.glob("*.log")]

log_paths = remote_parallel_map(list_log_files, [None])[0]
print(f"Found {len(log_paths):,} files")
```

## Step 2: Process one file per call

```python
def count_errors(path):
    with Path(path).open(encoding="utf-8", errors="replace") as lines:
        return sum("ERROR" in line for line in lines)

error_counts = remote_parallel_map(count_errors, log_paths, grow=True)
print(f"Found {sum(error_counts):,} errors across {len(error_counts):,} files")
```

Burla can add workers for the file calls because `grow=True`. Only the integer counts return to your machine; the file contents stay in shared storage.
