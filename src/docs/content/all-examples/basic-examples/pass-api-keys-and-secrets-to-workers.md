---
cover: /docs-assets/how-to-guides/limit-parallelism-cover.webp
coverY: 0
description: Read secrets on your machine. The value travels inside your function.
---

# Pass API keys & secrets to workers

There is one rule: read the environment variable at module level on your machine, then use the global inside your function.

```python
import os

API_KEY = os.environ["API_KEY"]   # runs on your machine

def call_api(item):
    headers = {"Authorization": f"Bearer {API_KEY}"}   # works on workers
```

`remote_parallel_map` pickles your function with cloudpickle. Module-level globals your function references are captured by value and sent to workers inside the pickled function. Your environment variables are not sent at all.

## Try it with a fake key

This demo needs no third-party account. Set a fake env var, capture it at module level, and have each worker prove the value arrived.

```python
import os
from burla import remote_parallel_map

os.environ["DEMO_API_KEY"] = "sk-demo-key-1234"   # stand-in for a real secret in your shell

DEMO_API_KEY = os.environ["DEMO_API_KEY"]

def check_key(worker_input):
    return f"input {worker_input}: key ends in {DEMO_API_KEY[-4:]}"

results = remote_parallel_map(check_key, [0, 1, 2])
print(results)
```

You should see:

```bash
['input 0: key ends in 1234',
 'input 1: key ends in 1234',
 'input 2: key ends in 1234']
```

## Why this works, and why the naive version fails

This works. The read happens on your machine, and the value is captured into the pickled function:

```python
API_TOKEN = os.environ["API_TOKEN"]

def enrich_user(user_id):
    headers = {"Authorization": f"Bearer {API_TOKEN}"}
```

This fails. The read happens on the worker, where the variable does not exist:

```python
def enrich_user(user_id):
    headers = {"Authorization": f"Bearer {os.environ['API_TOKEN']}"}   # KeyError on the worker
```

Burla does not copy your environment to workers. This is deliberate: your environment holds every secret on your machine, and none of it should silently fan out to every VM in your cluster. Only the values your function actually references make the trip.

## Libraries that read env vars on their own

Many clients read env vars implicitly: `OpenAI()` looks for `OPENAI_API_KEY`, and `boto3.client("s3")` with no arguments looks for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. On a worker those lookups find nothing, and workers have no cloud identity to fall back on. Capture the value on your machine and pass it explicitly.

```python
import os
from openai import OpenAI

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

def summarize(text):
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.responses.create(model="gpt-5-mini", input=f"Summarize: {text}")
    return response.output_text
```

Same pattern for boto3:

```python
import os
import boto3

AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]

def download_object(key):
    s3 = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )
    return s3.get_object(Bucket="my-bucket", Key=key)["Body"].read()
```

## .env files work too

Load the file on your machine before the module-level read, and everything above applies unchanged.

```python
import os
from dotenv import load_dotenv

load_dotenv()   # reads .env on your machine, before the function is defined

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
```

## Keep the value out of worker logs

The captured value travels inside the pickled function to your own nodes and nowhere else. Avoid printing it inside your function, because worker prints become job logs in the dashboard.
