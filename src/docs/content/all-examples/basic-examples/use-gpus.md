---
description: Run PyTorch in a CUDA image on an A100 or H100 worker.
---

# Use GPUs

Burla's GPU virtual machines provide the NVIDIA driver and expose one GPU to each function call. Use a CUDA-capable image for the framework and CUDA libraries your code needs.

## Before you run this

1. Complete [Getting Started](/docs/get-started) with AWS or Google Cloud. Burla does not yet support GPU workers on Azure.
2. Make sure your cloud project or account has quota for the GPU you request.
3. Use the same Python major and minor version locally as the PyTorch image.

## Run a PyTorch operation on a GPU

```python
from burla import remote_parallel_map

PYTORCH_IMAGE = "pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime"

def square_on_gpu(number):
    import torch

    value = torch.tensor(number, device="cuda")
    return (value * value).item()

results = remote_parallel_map(
    square_on_gpu,
    [12],
    func_gpu="A100",
    image=PYTORCH_IMAGE,
)
print(results)
```

```bash
[144]
```

The PyTorch image supplies PyTorch, the CUDA user-space runtime, and cuDNN. Burla supplies the host driver and starts the container with the NVIDIA runtime.

Use `A100` or `A100_40G` for a 40GB A100, `A100_80G` for an 80GB A100, and `H100` or `H100_80G` for an 80GB H100.
