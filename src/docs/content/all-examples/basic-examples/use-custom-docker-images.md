---
description: Run worker functions inside an image with the system packages they need.
---

# Use custom Docker images

Pass `image` to run a function inside your own Docker image. This example adds Pandoc, a native command-line tool that is not in Burla's default Python image.

## Before you run this

1. Complete [Getting Started](/docs/get-started).
2. Install Docker, create a public Docker Hub repository named `burla-pandoc`, and sign in with `docker login`.
3. Check `python --version`. The image must use the same Python major and minor version as your local environment.

## Step 1: Build and push the image

Create a `Dockerfile`. This example assumes your local environment uses Python 3.12:

```dockerfile
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends pandoc \
    && rm -rf /var/lib/apt/lists/*
```

Build an image for Burla's worker architecture, then push it to a public Docker Hub repository:

```bash
docker build --platform linux/amd64 -t YOUR_USERNAME/burla-pandoc:latest .
docker push YOUR_USERNAME/burla-pandoc:latest
```

## Step 2: Run a function inside the image

```python
import subprocess
from burla import remote_parallel_map

def render_markdown(markdown):
    return subprocess.check_output(
        ["pandoc", "--from=markdown", "--to=html"],
        input=markdown,
        text=True,
    ).strip()

html = remote_parallel_map(
    render_markdown,
    ["Hello **Burla**"],
    image="YOUR_USERNAME/burla-pandoc:latest",
    grow=True,
)
print(html)
```

`grow=True` lets Burla boot a worker with this image when no matching worker is running.

```bash
['<p>Hello <strong>Burla</strong></p>']
```
