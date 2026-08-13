---
description: Classify 45,615 TweetEval posts across remote CPU workers and stream the predictions into one local JSONL file.
---

# Classify 45,615 tweets as a batch job

The [TweetEval sentiment training split](https://huggingface.co/datasets/cardiffnlp/tweet_eval/viewer/sentiment/train) contains 45,615 English posts. This example classifies every post with [Twitter-RoBERTa](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest), then writes one JSON object per prediction.

The local process downloads the Parquet file, sends 64-row batches to remote workers, and writes results as those batches finish. It does not create an inference endpoint or use shared storage.

## Before you run

Complete [Getting Started](/docs/get-started), then create a Python 3.12 environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install burla pyarrow requests torch transformers
```

Keep the local and worker Python minor versions the same. Burla's default worker image is `python:3.12`.

In the dashboard, start at least one worker with enough capacity for a call using 4 CPUs and 16 GB of RAM. The script uses the workers already running in the cluster and does not add more.

## Run the inference job

Save this complete script as `batch_sentiment.py`:

```python
import io
import json
from pathlib import Path

import pyarrow.parquet as pq
import requests
from burla import remote_parallel_map

DATA_URL = (
    "https://huggingface.co/datasets/cardiffnlp/tweet_eval/resolve/main/"
    "sentiment/train-00000-of-00001.parquet"
)
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
BATCH_SIZE = 64
OUTPUT_PATH = Path("tweet-sentiment.jsonl")


response = requests.get(DATA_URL, timeout=60)
response.raise_for_status()
table = pq.read_table(io.BytesIO(response.content), columns=["text"])

rows = [
    {"row_id": row_id, "text": text}
    for row_id, text in enumerate(table.column("text").to_pylist())
]
batches = [
    rows[start : start + BATCH_SIZE]
    for start in range(0, len(rows), BATCH_SIZE)
]

print(f"Loaded {len(rows):,} posts in {len(batches):,} batches")


def normalize_tweet(text: str) -> str:
    normalized = []
    for token in text.split(" "):
        if token.startswith("@") and len(token) > 1:
            token = "@user"
        elif token.startswith("http"):
            token = "http"
        normalized.append(token)
    return " ".join(normalized)


_TOKENIZER = None
_MODEL = None


def predict_batch(batch: list[dict]) -> list[dict]:
    global _TOKENIZER, _MODEL

    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    if _MODEL is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)
        _MODEL = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME
        ).eval()

    encoded = _TOKENIZER(
        [normalize_tweet(row["text"]) for row in batch],
        padding=True,
        truncation=True,
        max_length=128,
        return_tensors="pt",
    )
    with torch.inference_mode():
        probabilities = torch.softmax(_MODEL(**encoded).logits, dim=-1)

    label_ids = probabilities.argmax(dim=-1).tolist()
    confidences = probabilities.max(dim=-1).values.tolist()
    return [
        {
            "row_id": row["row_id"],
            "label": _MODEL.config.id2label[label_id].lower(),
            "confidence": confidence,
        }
        for row, label_id, confidence in zip(batch, label_ids, confidences)
    ]


written = 0
with OUTPUT_PATH.open("w") as output:
    for predictions in remote_parallel_map(
        predict_batch,
        batches,
        func_cpu=4,
        func_ram=16,
        generator=True,
    ):
        for prediction in predictions:
            output.write(json.dumps(prediction) + "\n")
            written += 1

print(f"Saved {written:,} predictions to {OUTPUT_PATH}")
```

Run it from the activated environment:

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
