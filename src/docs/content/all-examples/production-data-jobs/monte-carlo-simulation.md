# Price a European call with parallel Monte Carlo

In this example we:

* Divide one billion simulation paths among remote NumPy calls.
* Simulate an independent random stream in each call.
* Return three compact payoff statistics per call.
* Reduce the statistics into a price and confidence interval.

The [repository example](https://github.com/Burla-Cloud/examples/blob/main/monte-carlo-simulation/main.py) contains the same option model, but no recorded output or measured run. This page therefore makes no runtime claim.

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

## 1. Simulate one chunk

Create `main.py` and add the next four blocks in order. The remote function simulates one deterministic random stream and returns only three payoff statistics:

```python
import argparse
import math

import numpy as np
from burla import remote_parallel_map

S0 = 100.0
K = 95.0
T = 1.0
R = 0.01
SIGMA = 0.3
BASE_SEED = 42


def run_chunk(chunk_id, n_paths):
    rng = np.random.default_rng(np.random.SeedSequence([BASE_SEED, chunk_id]))

    z = rng.standard_normal(n_paths)
    terminal_price = S0 * np.exp((R - 0.5 * SIGMA ** 2) * T + SIGMA * np.sqrt(T) * z)
    payoff = np.maximum(terminal_price - K, 0.0) * np.exp(-R * T)

    return {
        "chunk_id": chunk_id,
        "n": n_paths,
        "sum": float(payoff.sum()),
        "sum_sq": float(np.square(payoff).sum()),
    }
```

## 2. Divide the work exactly

Split the requested path count across tasks without dropping a remainder:

```python
parser = argparse.ArgumentParser()
parser.add_argument("--paths", type=int, required=True)
parser.add_argument("--chunks", type=int, required=True)
args = parser.parse_args()

if args.paths < 2:
    raise ValueError("--paths must be at least 2")
if args.chunks < 1 or args.chunks > args.paths:
    raise ValueError("--chunks must be between 1 and --paths")

paths_per_chunk, remainder = divmod(args.paths, args.chunks)
tasks = [
    (chunk_id, paths_per_chunk + (1 if chunk_id < remainder else 0))
    for chunk_id in range(args.chunks)
]
```

## 3. Run the chunks in parallel

Submit the independent tasks, then fix their reduction order:

```python
results = sorted(remote_parallel_map(run_chunk, tasks), key=lambda result: result["chunk_id"])
```

## 4. Reduce the statistics

Combine the three returned values per chunk into the estimate and its sampling error:

```python
total_n = sum(result["n"] for result in results)
total_sum = sum(result["sum"] for result in results)
total_sum_sq = sum(result["sum_sq"] for result in results)

mean = total_sum / total_n
sample_variance = max(0.0, (total_sum_sq - total_sum ** 2 / total_n) / (total_n - 1))
standard_error = math.sqrt(sample_variance / total_n)
margin = 1.96 * standard_error

print(f"paths: {total_n:,}")
print(f"price: {mean:.6f}")
print(f"standard error: {standard_error:.6f}")
print(f"approximate 95% confidence interval: [{mean - margin:.6f}, {mean + margin:.6f}]")
```

`SeedSequence` gives each chunk a distinct deterministic random stream. Burla may return results in any order, so sorting by `chunk_id` fixes the local floating-point reduction order.

The division with `divmod` assigns every requested path even when the total is not divisible by the number of chunks. No simulated price path leaves a worker.

The task plan and final reduction stay in the local process. Only small task and result dictionaries cross the network, and the script does not use shared storage.

## Run it

To simulate one billion paths across 1,000 calls:

```bash
python main.py --paths 1000000000 --chunks 1000
```

The estimate is the discounted expected payoff under this geometric Brownian motion model. The reported standard error covers Monte Carlo sampling error under that model, not uncertainty in the model or its parameters. The confidence interval uses a normal approximation.
