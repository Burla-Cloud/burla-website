---
cover: /docs-assets/how-to-guides/read-write-gcs-cover.webp
coverY: 0
description: Write and read files in GCS through /workspace/shared.
---

# Read/Write Files to Cloud Storage

In Burla, `/workspace/shared` is a shared folder connected to your Google Cloud Storage bucket:

* Save a file to `/workspace/shared/...` and it shows up in your bucket.
* Read a file from `/workspace/shared/...` and it is read from your bucket.

## Before you run this

1. Install Burla: `pip install burla`
2. Log in: `burla login`
3. Start a machine in the Burla dashboard.

## Step 1: Write files (saves to GCS)

```python
from pathlib import Path
from burla import remote_parallel_map

def write_text_file(file_path, text):
    Path(file_path).write_text(text)
    return file_path

files_to_write = [
    ("/workspace/shared/hello.txt", "hello\n"),
    ("/workspace/shared/goodbye.txt", "goodbye\n"),
]

remote_parallel_map(write_text_file, files_to_write)
```

In the Burla dashboard → **Filesystem**, you should see:

* `/workspace/shared/hello.txt`
* `/workspace/shared/goodbye.txt`

<figure><img src="/docs-assets/image-1-1-1.png" alt=""><figcaption></figcaption></figure>

## Step 2: Read files back (comes from GCS)

```python
from pathlib import Path
from burla import remote_parallel_map

def read_text_file(file_path):
    return {"path": file_path, "text": Path(file_path).read_text()}

files_to_read = [
    "/workspace/shared/hello.txt",
    "/workspace/shared/goodbye.txt",
]

results = remote_parallel_map(read_text_file, files_to_read)
print(results)
```

You should see a list with the file paths and their text (the words `hello` and `goodbye`):

```bash
[{'path': '/workspace/shared/hello.txt', 'text': 'hello'},
 {'path': '/workspace/shared/goodbye.txt', 'text': 'goodbye'}]
```

Congrats! You just wrote to, and read from, a Google Cloud Storage bucket, in parallel, using Burla.

Reach out to **jake@burla.dev** if you have any questions!
