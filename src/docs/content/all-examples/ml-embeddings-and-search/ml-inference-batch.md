---
cover: /docs-assets/more-examples/ml-inference-batch-cover.webp
coverY: 0
---

# Run batch inference as a job, not an endpoint

In this example we:

* Read review text from Parquet.
* Load a HuggingFace sentiment model once per worker.
* Score the whole corpus in batches.
* Stream JSONL results as batches finish.

I would not build an endpoint for this. There is no traffic to serve. There is just a pile of rows that need model scores.

### Dataset: product reviews in Parquet

Assume the source dataset has `review_id` and `text` columns.

```python
import json
from pathlib import Path

import pyarrow.dataset as ds
from burla import remote_parallel_map

DATASET = "s3://my-bucket/reviews/"
OUT_PATH = Path("/workspace/shared/batch-inference/review-sentiment.jsonl")
BATCH_SIZE = 10_000
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
```

### Step 1: Build batches

The client reads ids and text, then builds 10,000-row batches. Each batch is one worker input.

```python
dataset = ds.dataset(DATASET, format="parquet")
texts = dataset.to_table(columns=["review_id", "text"]).to_pandas()

batches = [
    texts.iloc[i:i + BATCH_SIZE].to_dict("records")
    for i in range(0, len(texts), BATCH_SIZE)
]

print(f"Built {len(batches):,} inference batches")
```

### Step 2: Write the worker function

Each worker loads the model the first time it runs, then reuses it for later batches on the same process.

```python
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

def predict_batch(rows: list[dict]) -> list[dict]:
    if not hasattr(predict_batch, "_model"):
        predict_batch._tok = AutoTokenizer.from_pretrained(MODEL_NAME)
        predict_batch._model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).eval()

    enc = predict_batch._tok(
        [row["text"] or "" for row in rows],
        padding=True,
        truncation=True,
        max_length=256,
        return_tensors="pt",
    )
    with torch.no_grad():
        probs = torch.softmax(predict_batch._model(**enc).logits, dim=-1).numpy()

    labels = ["negative", "neutral", "positive"]
    return [
        {
            "review_id": row["review_id"],
            "label": labels[int(prob.argmax())],
            "confidence": float(prob.max()),
        }
        for row, prob in zip(rows, probs)
    ]
```

The model stays cached on the worker process. Later batches assigned to that process do not reload it.

### Step 3: Run the scoring job

The output streams back as each batch finishes, so we can write JSONL without holding everything in memory.

```python
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with OUT_PATH.open("w") as f:
    for batch_out in remote_parallel_map(
        predict_batch,
        batches,
        func_cpu=4,
        func_ram=16,
        generator=True,
        grow=True,
    ):
        for row in batch_out:
            f.write(json.dumps(row) + "\n")

print(OUT_PATH)
```
