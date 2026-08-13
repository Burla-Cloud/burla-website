---
description: Distribute independent option-price paths and reduce compact statistics into one estimate.
---

# Price a European call with parallel Monte Carlo

This example divides an exact path count into remote NumPy calls. Each call returns only its count, payoff sum, and squared-payoff sum. The local process combines those statistics into a price estimate, standard error, and approximate 95% confidence interval.

The [repository example](https://github.com/Burla-Cloud/examples/blob/main/monte-carlo-simulation/main.py) contains the same option model, but no recorded output or measured run. This page therefore makes no path-count or runtime claim.

## Before you run

Complete [Getting Started](/docs/get-started), then install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install burla numpy
```

The model uses these fixed inputs:

- `S0 = 100`: initial asset price
- `K = 95`: strike price
- `T = 1`: years to expiration
- `r = 0.01`: continuously compounded risk-free rate
- `sigma = 0.3`: annualized volatility

You choose the total paths and task count when running the script. More paths consume more compute. More tasks reduce the number of NumPy values held by each call, but actual concurrency still depends on the workers available in your cluster.

## The simulation

Save the following as `main.py`:

```python
import argparse
import math

import numpy as np
from burla import remote_parallel_map

PARAMS = {
    "S0": 100.0,
    "K": 95.0,
    "T": 1.0,
    "r": 0.01,
    "sigma": 0.3,
}
BASE_SEED = 42


def run_chunk(task: dict) -> dict:
    chunk_id = task["chunk_id"]
    n_paths = task["n_paths"]
    seed = np.random.SeedSequence([BASE_SEED, chunk_id])
    rng = np.random.default_rng(seed)

    z = rng.standard_normal(n_paths)
    terminal_price = PARAMS["S0"] * np.exp(
        (
            PARAMS["r"]
            - 0.5 * PARAMS["sigma"] ** 2
        )
        * PARAMS["T"]
        + PARAMS["sigma"]
        * np.sqrt(PARAMS["T"])
        * z
    )
    payoff = np.maximum(
        terminal_price - PARAMS["K"],
        0.0,
    ) * np.exp(-PARAMS["r"] * PARAMS["T"])

    return {
        "chunk_id": chunk_id,
        "n": n_paths,
        "sum": float(payoff.sum()),
        "sum_sq": float(np.square(payoff).sum()),
    }


parser = argparse.ArgumentParser()
parser.add_argument("--paths", type=int, required=True)
parser.add_argument("--chunks", type=int, required=True)
args = parser.parse_args()

if args.paths < 2:
    raise ValueError("--paths must be at least 2")
if args.chunks < 1 or args.chunks > args.paths:
    raise ValueError("--chunks must be between 1 and --paths")

paths_per_chunk, remainder = divmod(
    args.paths,
    args.chunks,
)
tasks = [
    {
        "chunk_id": chunk_id,
        "n_paths": (
            paths_per_chunk
            + (1 if chunk_id < remainder else 0)
        ),
    }
    for chunk_id in range(args.chunks)
]

results = remote_parallel_map(run_chunk, tasks)
results.sort(key=lambda result: result["chunk_id"])

total_n = sum(result["n"] for result in results)
total_sum = sum(result["sum"] for result in results)
total_sum_sq = sum(
    result["sum_sq"]
    for result in results
)

mean = total_sum / total_n
sample_variance = max(
    0.0,
    (
        total_sum_sq
        - total_sum ** 2 / total_n
    )
    / (total_n - 1),
)
standard_error = math.sqrt(
    sample_variance / total_n
)
margin = 1.96 * standard_error

print(f"paths: {total_n:,}")
print(f"price: {mean:.6f}")
print(f"standard error: {standard_error:.6f}")
print(
    "approximate 95% confidence interval: "
    f"[{mean - margin:.6f}, {mean + margin:.6f}]"
)
```

`SeedSequence` gives each chunk a distinct deterministic random stream. Burla may return results in any order, so sorting by `chunk_id` also fixes the floating-point reduction order. The same arguments then produce the same output.

The division with `divmod` assigns every requested path even when the total is not divisible by the number of chunks. No simulated price path leaves a worker.

The task plan and final reduction stay in the local process. Only small task and result dictionaries cross the network, and the script does not use shared storage.

## Run it

```bash
python main.py --paths <total-path-count> --chunks <task-count>
```

The estimate is the discounted expected payoff under this geometric Brownian motion model. The reported standard error covers Monte Carlo sampling error under that model, not uncertainty in the model or its parameters. The confidence interval uses a normal approximation.
