---
cover: /docs-assets/more-examples/process-one-giant-file-cover.webp
coverY: 0
description: Read non-overlapping byte ranges of one JSONL file in parallel.
---

# Process one giant file quickly

Divide an uncompressed JSONL file into byte ranges. Each remote function call reads full lines from one range, so the file never needs to be copied into smaller files first.

## Before you run this

1. Complete [Getting Started](/docs/get-started).
2. Upload `events.jsonl` to the dashboard's **Filesystem** tab. Each line must be one JSON object.

## Step 1: Build byte ranges

The path is available inside workers, so read its size remotely and build 64 MiB ranges on your machine:

```python
import json
from pathlib import Path

from burla import remote_parallel_map

FILE_PATH = Path("/workspace/shared/events.jsonl")
BYTES_PER_CALL = 64 * 1024**2

def get_file_size(_):
    return FILE_PATH.stat().st_size

file_size = remote_parallel_map(get_file_size, [None])[0]
byte_ranges = [
    (start, min(start + BYTES_PER_CALL, file_size))
    for start in range(0, file_size, BYTES_PER_CALL)
]
print(f"Built {len(byte_ranges):,} byte ranges")
```

## Step 2: Process one range

The first range starts at byte zero. Every later range skips the partial line at its leading edge, unless the range already starts immediately after a newline:

```python
def summarize_range(start, end):
    row_count = 0
    purchase_count = 0
    purchase_revenue = 0.0

    with FILE_PATH.open("rb") as file:
        file.seek(start)
        if start > 0:
            file.seek(start - 1)
            if file.read(1) != b"\n":
                file.readline()

        while file.tell() < end:
            line = file.readline()
            if not line:
                break

            event = json.loads(line)
            row_count += 1
            if event.get("event_type") == "purchase":
                purchase_count += 1
                purchase_revenue += float(event.get("amount") or 0)

    return row_count, purchase_count, purchase_revenue
```

## Step 3: Process every range

Each `(start, end)` tuple is unpacked into the two function arguments:

```python
partial_results = remote_parallel_map(summarize_range, byte_ranges, grow=True)

total_rows = sum(rows for rows, _, _ in partial_results)
total_purchases = sum(purchases for _, purchases, _ in partial_results)
total_revenue = sum(revenue for _, _, revenue in partial_results)

print(f"{total_rows:,} events")
print(f"{total_purchases:,} purchases")
print(f"${total_revenue:,.2f} in purchase revenue")
```
