---
cover: /docs-assets/more-examples/monte-carlo-simulation-cover.webp
coverY: 0
---

# Run the Monte Carlo you actually meant to run

In this example we:

* Simulate 1,000,000,000 option price paths.
* Split the run into 2,000 independent chunks.
* Return sums and squared sums, then compute the final price and error bar locally.

A smaller run is not the same experiment if the whole point is the error bar.

### Experiment: European call option

Each path is independent, so the job does not need shared state or a distributed framework.

```python
import math
from dataclasses import dataclass

import numpy as np
from burla import remote_parallel_map

TOTAL = 1_000_000_000
N_CHUNKS = 2_000
PER_CHUNK = TOTAL // N_CHUNKS
```

### Step 1: Plan independent chunks

The chunk id becomes part of the random seed, so reruns are reproducible without shared state.

```python
@dataclass(frozen=True)
class SimulationTask:
    chunk_id: int
    n_paths: int
    params: dict

params = {"S0": 100.0, "K": 95.0, "T": 1.0, "r": 0.01, "sigma": 0.3}
tasks = [SimulationTask(i, PER_CHUNK, params) for i in range(N_CHUNKS)]

print(f"Built {len(tasks):,} chunks of {PER_CHUNK:,} paths")
```

### Step 2: Simulate on the worker

The worker is normal NumPy. It returns enough statistics to combine results exactly.

```python
def run_chunk(task: SimulationTask) -> dict:
    p = task.params
    rng = np.random.default_rng(seed=42 + task.chunk_id)
    z = rng.standard_normal(task.n_paths)
    st = p["S0"] * np.exp((p["r"] - 0.5 * p["sigma"] ** 2) * p["T"] + p["sigma"] * np.sqrt(p["T"]) * z)
    payoff = np.maximum(st - p["K"], 0.0) * np.exp(-p["r"] * p["T"])
    return {
        "chunk_id": task.chunk_id,
        "n": task.n_paths,
        "sum": float(payoff.sum()),
        "sum_sq": float((payoff ** 2).sum()),
    }
```

No simulated path comes back to the client. Only sufficient statistics do.

### Step 3: Run and reduce locally

The result list is tiny because the workers do not return raw paths.

```python
results = remote_parallel_map(run_chunk, tasks, func_cpu=1, func_ram=2, grow=True)

total_n = sum(r["n"] for r in results)
mean = sum(r["sum"] for r in results) / total_n
var = (sum(r["sum_sq"] for r in results) / total_n) - mean ** 2
se = math.sqrt(var / total_n)

print({"price": mean, "standard_error": se, "paths": total_n})
```
