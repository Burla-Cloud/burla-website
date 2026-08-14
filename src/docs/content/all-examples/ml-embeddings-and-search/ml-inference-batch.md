# Classify 45,615 tweets as a batch job

In this example we:

* Download all 45,615 TweetEval sentiment training posts locally.
* Split them into 64-post batches.
* Classify each batch with Twitter-RoBERTa.
* Stream the compact predictions into one local JSONL file.

This is an offline batch job, so it does not create an inference endpoint or use shared storage. The data comes from [TweetEval](https://huggingface.co/datasets/cardiffnlp/tweet_eval/viewer/sentiment/train), and the model is [Twitter-RoBERTa](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest).

## Before you run

Complete [Getting Started](/docs/get-started), then create a Python 3.12 environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla pyarrow requests torch transformers
```

Keep the local and worker Python minor versions the same. Burla's default worker image is `python:3.12`.

In the dashboard, start at least one worker with enough capacity for a call using 4 CPUs and 16 GB of RAM. The script uses the workers already running in the cluster and does not add more.

## 1. Download TweetEval

Create `batch_sentiment.py` and add the next four blocks in order. Start by downloading the one Parquet file:

```python
import io
import json

import pyarrow.parquet as pq
import requests
import torch
from burla import remote_parallel_map
from transformers import AutoModelForSequenceClassification, AutoTokenizer

DATA_URL = (
    "https://huggingface.co/datasets/cardiffnlp/tweet_eval/resolve/main/"
    "sentiment/train-00000-of-00001.parquet"
)
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
BATCH_SIZE = 64
OUTPUT_PATH = "tweet-sentiment.jsonl"

response = requests.get(DATA_URL, timeout=60)
response.raise_for_status()
table = pq.read_table(io.BytesIO(response.content), columns=["text"])
```

## 2. Make 64-post batches

Preserve each source position as `row_id`, then divide the posts:

```python
texts = table.column("text").to_pylist()
rows = [{"row_id": row_id, "text": text} for row_id, text in enumerate(texts)]
batches = [rows[start : start + BATCH_SIZE] for start in range(0, len(rows), BATCH_SIZE)]

print(f"Loaded {len(rows):,} posts in {len(batches):,} batches")
```

## 3. Classify one batch

The remote function normalizes TweetEval's placeholders, loads the model once per worker process, and returns only labels and confidence scores:

```python
def normalize_tweet(text):
    normalized = []
    for token in text.split(" "):
        if token.startswith("@") and len(token) > 1:
            token = "@user"
        elif token.startswith("http"):
            token = "http"
        normalized.append(token)
    return " ".join(normalized)

_TOKENIZER = _MODEL = None

def predict_batch(batch):
    global _TOKENIZER, _MODEL

    if _MODEL is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)
        _MODEL = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).eval()

    encoded = _TOKENIZER(
        [normalize_tweet(row["text"]) for row in batch],
        padding=True, truncation=True, max_length=128, return_tensors="pt",
    )
    with torch.inference_mode():
        probabilities = torch.softmax(_MODEL(**encoded).logits, dim=-1)

    label_ids = probabilities.argmax(dim=-1).tolist()
    confidences = probabilities.max(dim=-1).values.tolist()
    return [
        {"row_id": row["row_id"], "label": _MODEL.config.id2label[label_id].lower(),
         "confidence": confidence}
        for row, label_id, confidence in zip(batch, label_ids, confidences)
    ]
```

## 4. Stream predictions to disk

Submit every batch and write results as they finish:

```python
written = 0
with open(OUTPUT_PATH, "w") as output:
    for predictions in remote_parallel_map(
        predict_batch, batches, func_cpu=4, func_ram=16, generator=True
    ):
        output.writelines(json.dumps(prediction) + "\n" for prediction in predictions)
        written += len(predictions)

print(f"Saved {written:,} predictions to {OUTPUT_PATH}")
```

## Run it

Run the completed script from the activated environment:

```bash
python batch_sentiment.py
```

On a successful run, the final line is:

```text
Saved 45,615 predictions to tweet-sentiment.jsonl
```

Each worker process loads the model when it receives its first batch, then reuses that model for later batches assigned to the same process. The batch size is a configuration value, not a measured optimum.

`generator=True` yields batches in completion order. The JSONL file is therefore not sorted by the source dataset, but `row_id` preserves the original position.

The Parquet download and JSONL output exist only on the local machine. Because remote calls exchange the rows and predictions directly, this example does not require `burla deploy` or `/workspace/shared`.
