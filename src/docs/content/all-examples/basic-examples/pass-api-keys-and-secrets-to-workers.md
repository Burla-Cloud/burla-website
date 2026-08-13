---
description: Use an API key from your local environment inside a remote function.
---

# Pass API keys and secrets to workers

Read the environment variable at module level on your machine, then reference that value inside the function. Burla does not copy your environment to workers.

## Set a fake API key

This example does not call an external service:

```bash
export API_KEY="sk-demo-key-1234"
```

## Read the key on your machine

```python
import os

API_KEY = os.environ["API_KEY"]
```

## Reference the key inside the function

```python
from burla import remote_parallel_map

def check_key(_):
    return API_KEY[-4:]


print(remote_parallel_map(check_key, [None]))
```

Output:

```text
['1234']
```

Because `check_key` references `API_KEY`, Burla sends the value to workers together with the function.

## Do not read the key inside the function

```python
def check_key(_):
    return os.environ["API_KEY"]
```

This lookup runs on the worker, where `API_KEY` is unset, and raises `KeyError`.
