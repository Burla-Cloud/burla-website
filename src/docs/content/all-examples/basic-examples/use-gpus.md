---
description: Allocate one A100 or H100 to each remote function call.
---

# Use GPUs

Pass `func_gpu` when each function call needs a GPU. Burla allocates one GPU to every concurrent call.

## Before you run this

1. Complete [Getting Started](/docs/get-started) with AWS or Google Cloud. Burla does not yet support GPU workers on Azure.
2. Install PyTorch locally: `pip install torch`
3. Make sure your cloud project or account has quota for the GPU you request.

## Run a PyTorch operation on a GPU

```python
import torch
from burla import remote_parallel_map

def square_on_gpu(number):
    value = torch.tensor(number, device="cuda")
    return (value * value).item()

results = remote_parallel_map(
    square_on_gpu,
    [12],
    func_gpu="A100",
    grow=True,
)
print(results)
```

`grow=True` lets Burla boot a GPU worker when no compatible worker is running.

```bash
[144]
```

Use `A100` or `A100_40G` for a 40GB A100, `A100_80G` for an 80GB A100, and `H100` or `H100_80G` for an 80GB H100.
