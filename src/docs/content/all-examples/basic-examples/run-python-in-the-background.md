---
cover: /docs-assets/how-to-guides/run-background-cover.webp
coverY: 0
description: Detached job example.
---

# Run Python in the background.

In this example we:

* Run a simple Python function on remote machines with `remote_parallel_map`.
* Set `detach=True` so the job keeps running if your laptop sleeps, loses internet, or you close your terminal.
* Check progress in the Burla dashboard while the job runs in the background.

## Before you start

Make sure you have already:

1. installed Burla: `pip install burla`
2. connected your machine: `burla login`
3. started your cluster in the Burla dashboard

## Step 1: Define a simple function

This function pretends to do long work by sleeping for 2 minutes, then prints a message.

```python
from time import sleep
from burla import remote_parallel_map

def process_number(number):
    sleep(120)
    print(f"Finished {number}")
```

## Step 2: Start the job in detached mode

Pass `detach=True` when you call `remote_parallel_map`:

```python
inputs = list(range(50))

remote_parallel_map(process_number, inputs, detach=True)
```

`inputs = list(range(50))` means Burla will run `process_number` 50 times (once for each number from 0 to 49).

After inputs finish uploading, Burla prints:

`Done uploading inputs! Job will now continue running if canceled locally.`

At this point, the job can continue on the cluster even if you stop the local process.

## Step 3: Let it run in the background

Once you see the upload-complete message, you can close your terminal or stop the script.\
Your functions keep running remotely.

Open the Burla dashboard and go to the **Jobs** tab to watch logs and progress.

## Step 4: Save results during a detached job

Because you are stopping the local script, save each result to the cluster filesystem (`./shared`) from inside your function.

```python
from pathlib import Path
from time import sleep
from burla import remote_parallel_map

def process_number(number):
    sleep(120)
    result_text = f"Finished {number}"
    output_path = Path(f"./shared/detach-example-results/result-{number}.txt")
    output_path.write_text(result_text)

inputs = list(range(50))
remote_parallel_map(process_number, inputs, detach=True)
```

After the job finishes, open the Burla dashboard and download files from `detach-example-results/` in the **Filesystem** tab.

## Why this is useful

Detached jobs are helpful when work may run for hours or days, such as:

* processing many files
* retraining many models
* running long simulations

You can submit the job once, let it run remotely, and check results later.
