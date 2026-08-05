---
cover: /docs-assets/more-examples/process-one-giant-file-cover.webp
coverY: 0
---

# Process one giant file quickly

In this example we:

* Split one giant newline-delimited text file into chunk files.
* Run one worker per chunk.
* Write one compact JSON report per chunk.
* Combine chunk reports into a final result.

One giant file is usually not a distributed-systems problem. It is a splitting problem. Once the file is chunked, the rest of the job looks like the many-files example.

### Dataset: one large JSONL export

Assume the input has already been uploaded to Burla shared storage:

```text
/workspace/shared/giant/events.jsonl
```

The file is newline-delimited JSON. Each line is one event row.

```python
import json
from pathlib import Path

from burla import remote_parallel_map

INPUT_PATH = Path("/workspace/shared/giant/events.jsonl")
CHUNK_DIR = Path("/workspace/shared/giant/chunks")
REPORT_DIR = Path("/workspace/shared/giant/reports")
FINAL_DIR = Path("/workspace/shared/giant/final")
LINES_PER_CHUNK = 50_000
```

### Step 1: Split without loading the file into memory

The client streams the input file once and writes chunk files. This is intentionally boring code, because the split step should be easy to inspect.

```python
def create_chunk_files() -> list[str]:
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)
    chunk_paths = []

    out_f = None
    try:
        with INPUT_PATH.open("r", encoding="utf-8", errors="replace") as in_f:
            for line_idx, line in enumerate(in_f):
                if line_idx % LINES_PER_CHUNK == 0:
                    if out_f:
                        out_f.close()
                    chunk_path = CHUNK_DIR / f"chunk-{line_idx // LINES_PER_CHUNK:05d}.jsonl"
                    chunk_paths.append(str(chunk_path))
                    out_f = chunk_path.open("w", encoding="utf-8")
                out_f.write(line)
    finally:
        if out_f:
            out_f.close()

    return chunk_paths

chunk_paths = create_chunk_files()
print(f"Wrote {len(chunk_paths):,} chunk files")
```

If this step is slow, that is fine. It runs once. The expensive part is processing every chunk.

### Step 2: Process one chunk

Each worker reads one chunk and returns only a small report.

```python
def summarize_event_chunk(chunk_path: str) -> dict:
    chunk_path = Path(chunk_path)
    report_path = REPORT_DIR / f"{chunk_path.stem}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)

    rows = 0
    purchases = 0
    revenue = 0.0

    with chunk_path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            rows += 1
            if row.get("event_type") == "purchase":
                purchases += 1
                revenue += float(row.get("amount") or 0)

    report = {
        "chunk_path": str(chunk_path),
        "report_path": str(report_path),
        "rows": rows,
        "purchases": purchases,
        "revenue": revenue,
    }
    report_path.write_text(json.dumps(report) + "\n")
    return report
```

### Step 3: Test one chunk, then run all chunks

Run the first chunk before launching the whole file.

```python
test_report = remote_parallel_map(
    summarize_event_chunk,
    chunk_paths[:1],
    func_cpu=1,
    func_ram=2,
)[0]

print(test_report)
```

Then send the full chunk list.

```python
reports = remote_parallel_map(
    summarize_event_chunk,
    chunk_paths,
    func_cpu=1,
    func_ram=2,
    grow=True,
)
```

### Step 4: Reduce the chunk reports

The workers do the row-level scan. The client only combines counts and sums.

```python
summary = {
    "chunks": len(reports),
    "rows": sum(row["rows"] for row in reports),
    "purchases": sum(row["purchases"] for row in reports),
    "revenue": sum(row["revenue"] for row in reports),
}

FINAL_DIR.mkdir(parents=True, exist_ok=True)
summary_path = FINAL_DIR / "event-summary.json"
summary_path.write_text(json.dumps(summary, indent=2) + "\n")

print(summary)
print(summary_path)
```
