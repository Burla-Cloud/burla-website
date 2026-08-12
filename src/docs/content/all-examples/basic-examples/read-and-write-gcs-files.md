---
cover: /docs-assets/how-to-guides/read-write-gcs-cover.webp
coverY: 0
description: Read and write shared files through /workspace/shared.
---

# Read/Write Files to Cloud Storage

In a deployed Burla cluster:

* Every worker can read and write `/workspace/shared`.
* Files there remain in your cloud storage after workers shut down.

Burla backs the folder with Amazon S3, Google Cloud Storage, or Azure Blob Storage.

## Before you run this

1. Install Burla: `pip install burla`
2. Use a deployed cluster: run `burla deploy`, or `burla login` if a teammate already deployed one.

## Step 1: Write a file

```python
from pathlib import Path
from burla import remote_parallel_map

file_path = "/workspace/shared/hello.txt"

def write_file(path):
    Path(path).write_text("hello")

remote_parallel_map(write_file, [file_path])
```

Run `burla dashboard`, then open or refresh **Filesystem** to see the file:

<figure><img src="/docs-assets/image-1-1-1.png" alt="Burla Filesystem showing hello.txt in /workspace/shared"><figcaption></figcaption></figure>

## Step 2: Read the file

```python
def read_file(path):
    return Path(path).read_text()

print(remote_parallel_map(read_file, [file_path]))
```

```bash
['hello']
```

The two calls may run on different machines; `/workspace/shared` lets the second call read what the first wrote.
