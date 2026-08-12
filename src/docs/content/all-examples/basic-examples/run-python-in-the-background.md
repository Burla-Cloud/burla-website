---
cover: /docs-assets/how-to-guides/run-background-cover.webp
coverY: 0
description: Keep a Burla job running after you close your laptop.
---

# Run Python in the background

Set `detach=True` to let a job continue after your script stops, once all inputs have uploaded. This requires a deployed Burla cluster.

## Before you run this

* To deploy your own cluster, complete [Getting Started](/docs/get-started), then run `burla deploy`.
* To use a cluster your teammate deployed, install Burla and run `burla login`.
* Run `burla dashboard` and start at least one virtual machine.

## Start a background job

```python
from time import sleep

from burla import remote_parallel_map

def slow_task(_):
    print("Started")
    sleep(300)
    print("Finished")

remote_parallel_map(slow_task, [None], detach=True)
```

The call stays attached while the job runs. Wait until Burla prints:

```text
------------------------------
Done uploading inputs!
Job will now continue running if canceled locally.
------------------------------
```

You can now press Ctrl-C, close the terminal, or let your laptop go offline. The worker keeps running. If you press Ctrl-C, Burla prints a direct link to the job; you can also open **Jobs** in the dashboard to see its progress and logs.

Returned values are not delivered to your laptop after it disconnects. If you need durable results, write them to [cloud storage](/docs/all-examples/basic-examples/read-and-write-gcs-files) or another external store from inside the function.

After you press Ctrl-C, the dashboard still shows the job as **Running** and includes the worker's `Started` log:

<figure><img src="/docs-assets/how-to-guides/run-background-job.png" alt="Burla job details showing slow_task still running after the local client detached"><figcaption></figcaption></figure>
