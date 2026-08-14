# Summarize 1.2 million GitHub READMEs without an LLM

In this example we:

* Export 1.2 million public GitHub READMEs from BigQuery.
* Classify them with deterministic regex and word-count rules.
* Reduce the shard outputs into category summaries.
* Publish the summaries as a searchable static report.

The recorded run used 600 map calls and 16 reduce calls. The example repository reports 47.9 seconds for the map stage and 23.4 seconds for the reduce stage, with more than 500 workers active at peak. You can [browse the report](https://burla-cloud.github.io/examples/github-repo-summarizer/) or [read the complete source](https://github.com/Burla-Cloud/examples/tree/main/github-repo-summarizer).

The source dataset is the 2016-era `bigquery-public-data.github_repos` snapshot. The published report describes that snapshot, not GitHub today.

## Before you run

Complete [Getting Started](/docs/get-started), then use a deployed Burla cluster because this pipeline exchanges files through `/workspace/shared`:

```bash
burla deploy
```

If a teammate already deployed the cluster, run `burla login` instead.

### Download the example

```bash
git clone https://github.com/Burla-Cloud/examples.git
cd examples/github-repo-summarizer
```

### Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install \
  burla \
  pyarrow \
  db-dtypes \
  "google-cloud-bigquery[bqstorage,pandas]" \
  -r requirements.txt
```

### Authenticate to BigQuery

```bash
gcloud auth application-default login
```

You also need a Google Cloud project with BigQuery enabled and billing configured. The export query scans the full public `files` and `contents` tables, so it can incur BigQuery charges. `prepare.py` performs a dry run, prints the estimated bytes, and stops if the estimate exceeds 4 TB by default.

{% hint style="warning" %}
The full pipeline can add hundreds of cloud CPUs. It also holds the 1.3 GB Parquet file and a compressed copy in local memory while uploading it.
{% endhint %}

## The pipeline

```text
BigQuery GitHub snapshot
  -> local README Parquet
  -> shared README Parquet
  -> 600 summary files
  -> 16 reduce results
  -> static report data
```

The snippets below show the parallel boundaries. The complete source also contains the BigQuery query, all classification rules, the shared-storage upload, rerun checks, and report generation.

### 1. Export one README per repository

`prepare.py` chooses one root README per repository, attaches the repository's primary language, and keeps text between 120 and 32,000 characters. It writes `repo_name`, `lang`, `path`, `size`, and `content` to a local Parquet file:

```bash
python prepare.py \
  --project YOUR_GCP_PROJECT \
  --out samples/readmes.parquet
```

The query has a limit of 1,200,000 rows but no final `ORDER BY`, so separate exports are not guaranteed to select the same records. The resulting file does not contain stars or a precomputed shard ID.

### 2. Upload the Parquet file

`scale.py` copies `samples/readmes.parquet` to `/workspace/shared/grs/readmes.parquet` before submitting remote calls. The local export is the only large file uploaded by the client.

### 3. Summarize one stripe

Each map call streams the same Parquet file in 4,000-row batches and keeps the row positions assigned to its stripe:

```python
def summarize_stripe(shard_idx, n_shards):
    pf = pq.ParquetFile("/workspace/shared/grs/readmes.parquet")
    rows = []
    n_err = 0
    global_idx = 0
    column_names = ["repo_name", "lang", "path", "size", "content"]

    for batch in pf.iter_batches(batch_size=4000, columns=column_names):
        columns = {name: batch.column(name).to_pylist() for name in column_names}
        for row_idx in range(batch.num_rows):
            if (global_idx + row_idx) % n_shards != shard_idx:
                continue
            try:
                rows.append(summarize_row(
                    columns["repo_name"][row_idx] or "",
                    columns["lang"][row_idx] or "",
                    columns["path"][row_idx] or "",
                    int(columns["size"][row_idx] or 0),
                    columns["content"][row_idx] or "",
                ))
            except Exception:
                n_err += 1

        global_idx += batch.num_rows
    return rows, n_err
```

This bounds memory on each worker, but every worker still scans the source file. The stripe is derived from row position at read time.

### 4. Write one summary shard

Build bounded counters, write the stripe to shared storage, and return compact status:

```python
def summarize_shard(shard_idx, n_shards):
    started = time.time()
    rows, n_err = summarize_stripe(shard_idx, n_shards)
    doc_freq = Counter()
    for row in rows:
        doc_freq.update(row["tokens"])

    payload = {
        "shard_idx": shard_idx,
        "n_shards": n_shards,
        "n_ok": len(rows),
        "n_err": n_err,
        "elapsed_s": round(time.time() - started, 2),
        "by_cat": dict(Counter(row["category"] for row in rows)),
        "by_lang": dict(Counter(row["lang"] or "_unknown" for row in rows)),
        "by_install": dict(Counter(row["install"] for row in rows)),
        "doc_freq": dict(doc_freq),
        "rows": rows,
    }
    with open(f"/workspace/shared/grs/shards/{shard_idx:04d}.json", "w") as file:
        json.dump(payload, file)
    return {
        "shard_idx": shard_idx,
        "n_ok": payload["n_ok"],
        "n_err": payload["n_err"],
        "elapsed_s": payload["elapsed_s"],
    }
```

Each payload contains about one six-hundredth of the input rows plus its category, language, install-method, and token counters.

### 5. Map 600 stripes

Submit all stripes after the upload:

```python
jobs = [(shard_idx, 600) for shard_idx in range(600)]
results = remote_parallel_map(
    summarize_shard, jobs, func_cpu=1, func_ram=4, grow=True, max_parallelism=600
)
```

Burla unpacks each tuple in `jobs` into the function's two arguments. Each call writes one JSON file under `/workspace/shared/grs/shards` and returns only its row count, error count, and elapsed time.

The worker skips a shard when its output file already exists and is larger than 500 bytes. Move or remove the previous `shards` directory before processing a different Parquet export.

Run the upload and map stage:

```bash
python scale.py
```

### 6. Reduce shared summaries remotely

Sixteen reducer calls each read a different subset of the 600 shared JSON files. They merge category, language, install-method, and token counts while retaining bounded lists of representative repositories:

```python
jobs = [(bucket_idx, 16, 400, 200, 6000) for bucket_idx in range(16)]
bucket_results = remote_parallel_map(
    reduce_bucket, jobs, func_cpu=2, func_ram=8, max_parallelism=16
)
```

### 7. Merge compact reducer results locally

The local process merges those 16 compact results into `samples/grs_reduced.json`. The current `reduce.py` command performs both the remote reduction and this local merge:

```bash
python reduce.py
```

### 8. Build the report

The final stage runs locally. It converts the reduced data into the JSON files used by the static explorer:

```bash
python analysis.py \
  --reduced samples/grs_reduced.json \
  --out data
```

### 9. Serve the report

```bash
python -m http.server 8767
```

Open `http://localhost:8767` to inspect the generated report.

## Result from the recorded run

| Metric | Value |
|---|---:|
| READMEs processed | 1,200,000 |
| Compressed source Parquet | 1.3 GB |
| Map calls | 600 |
| Reduce calls | 16 |
| Peak concurrent workers | more than 500 |
| Map stage | 47.9 seconds |
| Reduce stage | 23.4 seconds |

The committed artifacts classify 425,681 READMEs as web-related and find no recognized install command in 894,822. Those values cover the full exported corpus.

The labels are heuristic. “Web” means its weighted keywords won, and “no recognized install command” means none of the configured regexes matched. Some secondary report sections, including language dominance and distinctive words, are computed from the retained top-scoring repositories in each category rather than all 1.2 million rows.
