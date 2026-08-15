# Estimate hurricane losses across one million simulated years

In this example we:

* Build a synthetic $335B property portfolio across 12,000 coastal exposure cells.
* Simulate one million hurricane years in 500 parallel calls.
* Apply wind damage and a 2% deductible to every exposure.
* Combine sparse loss histograms into expected and tail losses.

Catastrophe models estimate losses too rare to observe directly. This example asks how much the whole portfolio could lose in a bad year, rather than what one storm costs.

The hazard and damage assumptions are intentionally simple and cover wind only. The compute pattern mirrors a catastrophe-risk rollup, but the results are not suitable for underwriting.

The [complete script](https://github.com/Burla-Cloud/examples/blob/main/monte-carlo-simulation/main.py) is also available in the Burla examples repository.

## Before you run

Complete [Getting Started](/docs/get-started), then install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install burla numpy
```

Create `main.py` and add the following blocks in order.

## 1. Build the portfolio

The portfolio represents Houston, New Orleans, Tampa, Miami, Charleston, and Wilmington. Every market is split into 2,000 nearby exposure cells:

```python
from time import perf_counter

import numpy as np
from burla import remote_parallel_map

N_YEARS = 1_000_000
N_TASKS = 500
YEARS_PER_TASK = N_YEARS // N_TASKS
BASE_SEED = 2026
EXPOSURES_PER_MARKET = 2_000
STORM_BATCH_SIZE = 32

# A synthetic $335B portfolio spread across 12,000 exposure cells.
MARKET_LATITUDES = np.array([29.76, 29.95, 27.95, 25.76, 32.78, 34.21])
MARKET_LONGITUDES = np.array([-95.37, -90.07, -82.46, -80.19, -79.93, -77.89])
MARKET_INSURED_VALUES = (
    np.array([80, 35, 60, 110, 30, 20], dtype=float) * 1_000_000_000
)

portfolio_rng = np.random.default_rng(7)
exposure_market = np.repeat(
    np.arange(len(MARKET_LATITUDES)),
    EXPOSURES_PER_MARKET,
)
EXPOSURE_LATITUDES = MARKET_LATITUDES[exposure_market] + portfolio_rng.normal(
    0,
    0.2,
    len(exposure_market),
)
EXPOSURE_LONGITUDES = MARKET_LONGITUDES[exposure_market] + portfolio_rng.normal(
    0,
    0.2,
    len(exposure_market),
)
EXPOSURE_VALUES = np.repeat(
    MARKET_INSURED_VALUES / EXPOSURES_PER_MARKET,
    EXPOSURES_PER_MARKET,
)
EXPOSURE_DEDUCTIBLES = 0.02 * EXPOSURE_VALUES
```

## 2. Define the hazard assumptions

Each storm picks one of twelve landfall zones from Texas to North Carolina. The model samples storm frequency, landfall, and wind speed independently for every simulated year:

```python
# Independent synthetic landfall zones from Texas to North Carolina.
LANDFALL_LATITUDES = np.array(
    [27.8, 29.3, 29.3, 30.2, 30.0, 27.7, 26.5, 25.5, 30.3, 32.7, 34.2, 35.3]
)
LANDFALL_LONGITUDES = np.array(
    [
        -97.4,
        -94.8,
        -89.4,
        -88.0,
        -85.7,
        -82.7,
        -82.0,
        -80.2,
        -81.4,
        -79.8,
        -77.8,
        -75.5,
    ]
)
MEAN_STORMS_PER_YEAR = 1.2

LOSS_BIN_WIDTH = 50_000_000
LOSS_BINS = np.append(
    np.arange(0, 200_000_000_000 + LOSS_BIN_WIDTH, LOSS_BIN_WIDTH),
    np.inf,
)
```

## 3. Simulate one group of years

For every storm, the worker estimates wind at all 12,000 exposure cells, applies a simple damage curve and deductible, then adds the insured losses to that year's total:

```python
def simulate_years(task_id: int, n_years: int) -> dict:
    rng = np.random.default_rng(np.random.SeedSequence([BASE_SEED, task_id]))

    storm_counts = rng.poisson(MEAN_STORMS_PER_YEAR, n_years)
    year_index = np.repeat(np.arange(n_years), storm_counts)
    n_storms = len(year_index)

    landfall_zone = rng.integers(0, len(LANDFALL_LATITUDES), n_storms)
    storm_latitudes = (
        LANDFALL_LATITUDES[landfall_zone] + rng.normal(0, 0.25, n_storms)
    )
    storm_longitudes = (
        LANDFALL_LONGITUDES[landfall_zone] + rng.normal(0, 0.25, n_storms)
    )
    max_wind = 74 + 116 * rng.beta(1.5, 4.0, n_storms)

    annual_loss = np.zeros(n_years)
    for start in range(0, n_storms, STORM_BATCH_SIZE):
        stop = min(start + STORM_BATCH_SIZE, n_storms)
        storm_latitude = storm_latitudes[start:stop, None]
        storm_longitude = storm_longitudes[start:stop, None]

        north_south_miles = (storm_latitude - EXPOSURE_LATITUDES) * 69.0
        mean_latitude = (storm_latitude + EXPOSURE_LATITUDES) / 2
        east_west_miles = (
            (storm_longitude - EXPOSURE_LONGITUDES)
            * 69.0
            * np.cos(np.radians(mean_latitude))
        )
        distance_miles = np.hypot(north_south_miles, east_west_miles)
        local_wind = max_wind[start:stop, None] * np.exp(
            -distance_miles / 125.0
        )

        damage_ratio = np.clip((local_wind - 50.0) / 110.0, 0.0, 1.0) ** 3
        gross_loss = damage_ratio * EXPOSURE_VALUES
        insured_loss = np.minimum(
            np.maximum(gross_loss - EXPOSURE_DEDUCTIBLES, 0.0),
            EXPOSURE_VALUES - EXPOSURE_DEDUCTIBLES,
        )
        np.add.at(
            annual_loss,
            year_index[start:stop],
            insured_loss.sum(axis=1),
        )

    histogram = np.histogram(annual_loss, bins=LOSS_BINS)[0]
    nonzero_bins = np.flatnonzero(histogram)
    return {
        "total_loss": float(annual_loss.sum()),
        "bin_indices": nonzero_bins,
        "bin_counts": histogram[nonzero_bins],
    }
```

Storms are processed in small batches so memory use stays bounded. Each task returns only its total loss and nonempty histogram bins.

## 4. Run 500 tasks

Every call simulates 2,000 years. Calls beyond the capacity of your cluster wait in the queue:

```python
tasks = [(task_id, YEARS_PER_TASK) for task_id in range(N_TASKS)]
started_at = perf_counter()
results = remote_parallel_map(simulate_years, tasks)
elapsed = perf_counter() - started_at

total_loss = sum(result["total_loss"] for result in results)
histogram = np.zeros(len(LOSS_BINS) - 1, dtype=np.int64)
for result in results:
    np.add.at(histogram, result["bin_indices"], result["bin_counts"])
```

## 5. Read the annual loss curve

Aggregate exceedance probability (AEP) adds every storm loss within a year. A 0.4% AEP loss is exceeded in 0.4% of simulated years:

```python
def loss_at_return_period(return_period: int) -> float:
    rank = int(np.ceil(histogram.sum() * (1 - 1 / return_period)))
    bin_index = int(np.searchsorted(np.cumsum(histogram), rank))
    return (LOSS_BINS[bin_index] + LOSS_BINS[bin_index + 1]) / 2


print(f"simulated years: {N_YEARS:,}")
print(f"expected annual loss: ${total_loss / N_YEARS / 1e9:.1f}B")
print(f"1% AEP loss (1-in-100): about ${loss_at_return_period(100) / 1e9:.1f}B")
print(f"0.4% AEP loss (1-in-250): about ${loss_at_return_period(250) / 1e9:.1f}B")
print(f"elapsed: {elapsed:.1f}s")
```

## Run it

```bash
python main.py
```

The loss estimates are deterministic:

```text
simulated years: 1,000,000
expected annual loss: $1.2B
1% AEP loss (1-in-100): about $19.6B
0.4% AEP loss (1-in-250): about $29.7B
```

The final line reports elapsed time for your cluster.
