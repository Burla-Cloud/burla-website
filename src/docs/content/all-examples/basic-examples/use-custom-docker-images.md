# Use custom Docker images

Burla is compatible with almost any Linux-based Docker image.

Your image needs:

* an amd64 variant
* `sh`
* Python with the same major and minor version as your local environment

This example uses the public `python:3.12-slim` image.

## Before you run this

1. Complete [Getting Started](/docs/get-started).
2. Use Python 3.12 locally, or replace the image tag below with your Python version.

## Option 1: Define an image in the dashboard's cluster settings

Run `burla dashboard`, open **Settings**, and set **Container Image → Image URI** to:

```text
python:3.12-slim
```

Start the virtual machines from the dashboard by clicking **Start**.

```python
import sys
from burla import remote_parallel_map

def print_python_version(_):
    print(f"{sys.version_info.major}.{sys.version_info.minor}")

remote_parallel_map(print_python_version, [None])
```

```bash
3.12
```

## Option 2: Define an image in the Python API

Pass the image URI directly to `remote_parallel_map`:

```python
remote_parallel_map(
    print_python_version,
    [None],
    image="python:3.12-slim",
)
```

Burla uses a matching ready worker. If `grow=True` and no matching worker exists, Burla boots one with that image.

## Private images

Public images need no registry credentials.

On GCP clusters with cloud storage enabled, Burla attaches the default Compute Engine service account and retries private `docker.pkg.dev` pulls with its credentials. Grant that service account Artifact Registry Reader access.

Burla does not currently authenticate to private Amazon ECR or Azure Container Registry repositories automatically.
