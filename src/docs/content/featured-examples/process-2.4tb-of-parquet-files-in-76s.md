---
cover: /docs-assets/more-examples/query-2-4tb-parquet-cover.webp
coverY: 0
description: With <30 lines of Python.
---

# Query 2.4TBs of Parquet files in 76s

In this example we:

* Generate 1,000 billion-row Parquet files (2.4TB) and store them in Google Cloud Storage.
* Run a DuckDB query on each file in parallel using a cluster with 10,000 CPUs.
* Combine resulting dataframes to produce the final result!

### Dataset: The trillion row challenge

An extension of the [billion row challenge](https://github.com/gunnarmorling/1brc), the goal of the trillion row challenge is to compute the min, max, and mean temperature per weather station, for 413 unique stations, from data stored as a collection of parquet files in blob storage. Data looks like this (but with 1,000,000,000,000 rows):

<figure><img src="/docs-assets/cleanshot-2025-11-25-at-12-59-38.png" alt=""><figcaption></figcaption></figure>

### Step 1: Boot some VMs

For this challenge we use used a 125 node cluster with 80 cpus and 320G ram per node.\
Underneath these are N4-standard-80 machines. The cluster settings look like this:

<figure><img src="/docs-assets/cleanshot-2025-12-01-at-13-30-56.png" alt=""><figcaption></figcaption></figure>

Once the settings look good we just hit "**⏻ Start**" on the front page.\
This cluster took 1min 47s to boot.

### Step 2: Generate the dataset

We chose to split the 1T row dataset into 1,000 parquet files.\
With 10k cpus, this means we only need to download one file per 10-cpu worker.

Once generated, parquet files are written to the `./shared` folder. Anything placed in this folder is synchronized with a Google Cloud Storage bucket using GCSFuse. The dashboard has a built in file manager where you can monitor, upload, and download files from the cluster (screenshot below).

Below, each call to `generate_parquet` is done in a `python:3.12` docker container (see settings ↑), this can be any docker container as long as your VM's service account is authorized to pull it.\
Python packages your code uses that aren't in the container are detected and installed quickly at runtime. The code below took 3s to install pandas, numpy, and pyarrow in every container.

```python
import pyarrow
import numpy as np
import pandas as pd
from burla import remote_parallel_map

TOTAL_ROWS = 1_000_000_000_000
ROWS_PER_FILE = 1_000_000_000

lookup_df = pd.read_csv("avg_temp_per_station.csv")
file_nums = range(TOTAL_ROWS // ROWS_PER_FILE)

def generate_parquet(file_num: int):
    rng = np.random.default_rng(seed=file_num)

    # array of station names
    station_indices = rng.integers(0, len(lookup_df) - 1, ROWS_PER_FILE)
    station_names = lookup_df.station.to_numpy()[station_indices]

    # array of station temps, aligned by index with `station_names`
    station_temps = rng.normal(0, 10, ROWS_PER_FILE)
    station_temps += lookup_df.mean_temp.to_numpy()[station_indices]
    station_temps = station_temps.round(1)

    # save to parquet in cluster filesystem
    df = pd.DataFrame({"station": station_names, "temp": station_temps})
    df.to_parquet(f"shared/1TRC/{file_num}.parquet", engine="pyarrow")

remote_parallel_map(generate_parquet, file_nums, func_ram=64)
```

This code completed in 5m 48s! The final dataset is 2.4TB.\
After running, files appear under the "Filesystem" tab (underneath this is a GCS Bucket).

<figure><img src="/docs-assets/cleanshot-2025-12-01-at-13-38-21.png" alt=""><figcaption></figcaption></figure>

### Step 3: Run the challenge!

This code runs a simple DuckDB query on all 1,000 Parquet files at the same time.\
Each query returns a pandas dataframe with the min/mean/max per station within that file.\
DataFrames are concatenated, and aggregated locally to produce a final min/mean/max temperature per weather station.

Like the data generation code above, every call to `station_stats` runs in a `python:3.12` docker container, and any missing python packages are quickly installed at runtime. Parquet files pulled from the `./shared` folder are actually being downloaded from Google Cloud Storage using GCSFuse.

To avoid using any cached files/data the cluster was rebooted before running the code below.

```python
import duckdb
import pandas as pd
from time import time
from burla import remote_parallel_map

TOTAL_ROWS = 1_000_000_000_000
ROWS_PER_FILE = 1_000_000_000
file_nums = range(TOTAL_ROWS // ROWS_PER_FILE)

def station_stats(file_num: int):
    query = """
    SELECT
        station,
        MIN(temp) AS min_temp,
        AVG(temp) AS mean_temp,
        MAX(temp) AS max_temp
    FROM read_parquet(?)
    GROUP BY station
    ORDER BY station
    """
    con = duckdb.connect(database=":memory:")
    con.execute("PRAGMA threads=8")
    return con.execute(query, (f"shared/1TRC/{file_num}.parquet",)).df()

start = time()

# RPM call here 
dataframes = remote_parallel_map(station_stats, file_nums, func_cpu=10)

df = pd.concat(dataframes).groupby("station").agg(
    min_value=("min_temp", "min"),
    mean_value=("mean_temp", "mean"),
    max_value=("max_temp", "max"),
)
print(df)
print(f"Done after {start-time()}s!")
```

This only took 76s to finish, which I believe is technically a new record! (on the full 2.4TB dataset).\
However, as I talk more about below, I don't actually think pure runtime is what really matters most.\
I also think, with the right optimization, this could be done in <5s!

Output:

```bash
✔ Done! Ran 1000 inputs through `station_stats` (1000/1000 completed)            
               min_value  mean_value  max_value
station                                        
Abha               -41.5   17.999545       80.0
Abidjan            -38.8   26.000086       87.2
Abéché             -33.9   29.400108       95.1
Accra              -34.8   26.399952       88.1
Addis Ababa        -46.4   15.999768       76.7
...                  ...         ...        ...
Yinchuan           -52.4    9.000244       76.1
Zagreb             -51.6   10.699851       73.4
Zanzibar City      -37.2   26.000230       86.7
Ürümqi             -56.8    7.400382       69.0
İzmir              -41.2   17.899965       79.7

[412 rows x 3 columns]
Done after 76.51459288597107s
```

### Live Demo:

{% embed url="https://www.youtube.com/watch?v=YKz8mzt9iK4" %}

### How expensive was this?

For this demo we used spot instances. These are extra machines rented at a discount that might be deleted ("preempted") at any time when Google needs them. This isn't an issue for us because Burla jobs continue working even if some nodes are preempted while in the middle of a job.

Our cluster used 125 N4-standard-80 machines, took 1m47s to boot, and was shut down 1.5min later.\
To be safe let's assume the billable runtime per node was 3.5min, with 125 nodes this is 7.3 hours.

At spot pricing N4-standard-80 machines cost $1.22/hour meaning this job cost about $8.91.
