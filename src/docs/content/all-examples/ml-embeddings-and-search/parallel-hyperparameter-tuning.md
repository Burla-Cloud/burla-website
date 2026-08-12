---
cover: /docs-assets/more-examples/parallel-hyperparameter-tuning-cover.webp
coverY: 0
---

# Tune XGBoost with 1,000 CPUs

In this example we:

* Download a 1.4GB Kaggle flight-delay dataset.
* Boot 13 machines with 80 CPUs each.
* Train 36 XGBoost models in parallel and pick the best one.

### Dataset: 2022 flight delays

The dataset is [Combined\_Flights\_2022.csv](https://www.kaggle.com/datasets/robikscube/flight-delay-dataset-20182022/data?select=Combined_Flights_2022.csv), a commercial flight-delay CSV from Kaggle.

The question is simple: given the route, airline, schedule, airport ids, and date fields, can we predict whether a flight arrives at least 15 minutes late?

This is the kind of job where I don't want to build a training platform. I want to try a bunch of XGBoost settings, look at the AUCs, and move on.

### Step 1: Upload the CSV

Download the CSV here:

{% embed url="https://www.kaggle.com/datasets/robikscube/flight-delay-dataset-20182022?resource=download&select=Combined_Flights_2022.csv" %}

Then upload it to the Burla filesystem.

<figure><video src="/docs-assets/upload-demo.mp4" autoplay loop muted playsinline></video><figcaption><p>(upload section is fast-forwarded)</p></figcaption></figure>

Files uploaded here appear at `./shared` inside every worker container. Files your code writes there show up back in the dashboard, so you can download results later.

### Step 2: Boot some VMs

For this run we boot 13 VMs, each with 80 CPUs.

<figure><video src="/docs-assets/cluster-boot-demo.mp4" autoplay loop muted playsinline></video><figcaption><p>(Booting is fast-forwarded, this cluster actually took 1.5 min. to boot up)</p></figcaption></figure>

The workers use the `python:3.12` image. That image does not already have XGBoost, pandas, or sklearn installed, which is fine. Burla detects the local packages the function needs and installs them inside the worker containers when the job starts.

### Step 3: Write the model function

Each function call trains one model with one set of hyperparameters. It loads the CSV from `./shared`, cleans a few columns, trains XGBoost with all 80 CPUs, and returns the AUC.

```python
import pandas as pd
import xgboost as xgb
from burla import remote_parallel_map
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

columns_to_train_on = [
    "Airline", "Operating_Airline", "Marketing_Airline_Network",
    "IATA_Code_Marketing_Airline", "IATA_Code_Operating_Airline",
    "Origin", "Dest", "OriginState", "DestState", "OriginWac", "DestWac",
    "OriginAirportID", "DestAirportID", "OriginCityMarketID", "DestCityMarketID",
    "Distance", "DistanceGroup", "CRSElapsedTime",
    "DayOfWeek", "Month", "Quarter", "DayofMonth", "Year",
    "DepTimeBlk", "ArrTimeBlk", "CRSDepTime", "CRSArrTime",
]

def train_model(params):
    print("Loading dataset ...")
    df = pd.read_csv("./shared/Combined_Flights_2022.csv")
    df = df.dropna(subset=["ArrDel15"])

    y = df["ArrDel15"].astype(int)
    X = pd.get_dummies(df[columns_to_train_on], dummy_na=False)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    data_size_gb = (X_train.memory_usage(deep=True).sum() + y_train.memory_usage(deep=True)) / (1024 ** 3)

    print(f"Training on {format(len(df), ',')} rows ({data_size_gb:.1f}GB) using 80 CPUs ...")
    model = xgb.XGBClassifier(tree_method="hist", n_jobs=80, eval_metric="auc", **params)
    model.fit(X_train, y_train)

    auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
    print(f"Done training, [AUC={auc:.4f}] Hyperparameters: {params}")
    return {"auc": auc, "params": params}
```

### Step 4: Run the grid

Now we send 36 parameter sets to the cluster.

```python
parameter_grid = [
    {"n_estimators": n, "max_depth": d, "eta": e}
    for n in [300, 600, 900]
    for d in [4, 6, 8, 10]
    for e in [0.05, 0.1, 0.15]
]

results = remote_parallel_map(train_model, parameter_grid, func_cpu=80)

best = max(results, key=lambda r: r["auc"])
print("Best:", best)
```

Because we have 13 machines, the first 13 models start immediately and the rest wait in the queue. Burla can queue millions of inputs, so 36 models is nothing.

You can watch logs from the Jobs tab while the models train.

<figure><video src="/docs-assets/demo.mp4" autoplay loop muted playsinline></video><figcaption></figcaption></figure>
