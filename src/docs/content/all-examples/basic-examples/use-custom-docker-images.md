---
description: Choose a public or private container image from Settings or Python.
---

# Use custom Docker images

Burla runs ordinary Docker images. No Burla-specific build is required.

A compatible image needs a Linux amd64 variant, `sh`, and the same Python major and minor version as your local environment. This example uses the public `python:3.12-slim` image.

## Before you run this

1. Complete [Getting Started](/docs/get-started).
2. Use Python 3.12 locally, or replace the image tag below with your Python version.

## Option 1: Choose an image in Settings

Run `burla dashboard`, open **Settings**, and set **Container Image → Image URI** to:

```text
python:3.12-slim
```

Start the virtual machines from the dashboard. Since those workers are already running, use `grow=False`:

```python
import platform
from burla import remote_parallel_map

def python_version(_):
    return ".".join(platform.python_version_tuple()[:2])

print(remote_parallel_map(python_version, [None], grow=False))
```

```bash
['3.12']
```

## Option 2: Choose an image in Python

Pass the image URI directly to `remote_parallel_map`:

```python
print(remote_parallel_map(
    python_version,
    [None],
    image="python:3.12-slim",
))
```

Burla uses a matching ready worker or boots one with that image.

## Private images

Public images need no registry credentials.

On GCP clusters with cloud storage enabled, Burla attaches the default Compute Engine service account and retries private `docker.pkg.dev` pulls with its credentials. Grant that service account Artifact Registry Reader access.

Burla does not currently authenticate to private Amazon ECR or Azure Container Registry repositories automatically.
