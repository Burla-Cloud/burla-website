---
cover: /docs-assets/more-examples/one-parquet-file-per-worker.webp
coverY: 0
---

# Process thousands of files quickly

In this example we:

* Read a folder of raw log files from Burla shared storage.
* Run one Python function call per file.
* Write one compact JSON report per file.
* Combine the per-file reports into a single error summary.

This is the first pattern I would reach for when the input is already split into files. Do not make the worker aware of the whole dataset. Give it one file, make it produce one small report, then reduce those reports after the parallel work is done.

### Dataset: raw application logs

Assume a daily log export has already been uploaded to:

```text
/workspace/shared/logs/raw/
```

Every worker can read that folder. Anything the workers write back under `/workspace/shared` is visible to the client and to later workers.

```python
import json
from pathlib import Path

from burla import remote_parallel_map

RAW_DIR = Path("/workspace/shared/logs/raw")
REPORT_DIR = Path("/workspace/shared/logs/reports")
FINAL_DIR = Path("/workspace/shared/logs/final")
```

### Step 1: Build the work list

The client does the cheap planning step. Each path in `input_paths` becomes one function call.

```python
input_paths = sorted(str(path) for path in RAW_DIR.glob("*.txt"))

print(f"Found {len(input_paths):,} log files")
print(input_paths[:3])
```

If this list is empty, fix the upload or path before thinking about parallelism.

### Step 2: Process one file

The worker reads one file, counts the lines that matter, writes a small JSON report, and returns the report path.

```python
def scan_log_file(input_path: str) -> dict:
    input_path = Path(input_path)
    report_path = REPORT_DIR / f"{input_path.stem}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)

    line_count = 0
    error_count = 0
    warning_count = 0

    with input_path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line_count += 1
            error_count += "ERROR" in line
            warning_count += "WARN" in line

    report = {
        "input_path": str(input_path),
        "report_path": str(report_path),
        "line_count": line_count,
        "error_count": error_count,
        "warning_count": warning_count,
    }
    report_path.write_text(json.dumps(report) + "\n")
    return report
```

Return dictionaries for small metadata. Write larger outputs to shared storage and return paths.

### Step 3: Process every file

```python
reports = remote_parallel_map(
    scan_log_file,
    input_paths,
    func_cpu=1,
    func_ram=2,
    grow=True,
)
```

### Step 4: Reduce the reports

The reduce step runs locally because the result list is small.

```python
summary = {
    "files": len(reports),
    "lines": sum(row["line_count"] for row in reports),
    "errors": sum(row["error_count"] for row in reports),
    "warnings": sum(row["warning_count"] for row in reports),
}

FINAL_DIR.mkdir(parents=True, exist_ok=True)
summary_path = FINAL_DIR / "log-summary.json"
summary_path.write_text(json.dumps(summary, indent=2) + "\n")

print(summary)
print(summary_path)
```
