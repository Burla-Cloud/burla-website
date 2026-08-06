---
description: Run your first job in 60 seconds.
---

# Getting Started

#### 1. Select your cloud provider

{% picker %}

{% cloud aws %}
#### 2. Log in to the AWS CLI

Burla boots VMs in the account and region your [`aws`](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) CLI is pointed at:

```bash
aws sso login    # or: aws configure
```
{% endcloud %}

{% cloud gcp %}
#### 2. Log in to the Google Cloud CLI

Burla boots VMs in the project your [`gcloud`](https://cloud.google.com/sdk/docs/install) CLI is pointed at:

```bash
gcloud auth login
gcloud config set project <project-id>
burla config set cloud gcp
```
{% endcloud %}

{% cloud azure %}
#### 2. Log in to the Azure CLI

Burla boots VMs in the subscription your [`az`](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) CLI is pointed at:

```bash
az login
az account set --subscription <subscription-id>
burla config set cloud azure
```
{% endcloud %}

#### 3. Install Burla

```bash
pip install burla
```

#### 4. Boot some machines

```bash
burla dashboard
```

{% cloud aws %}
This opens the dashboard. Hit **⏻ Start** to boot an EC2 instance. Instance type, node count, and Docker image are editable in settings.
{% endcloud %}

{% cloud gcp %}
This opens the dashboard. Hit **⏻ Start** to boot a Compute Engine VM. Machine type, node count, and Docker image are editable in settings.
{% endcloud %}

{% cloud azure %}
This opens the dashboard. Hit **⏻ Start** to boot an Azure VM. VM size, node count, and Docker image are editable in settings.
{% endcloud %}

{% hint style="info" %}
Nodes shut themselves down after 10 idle minutes, so nothing keeps billing you after you walk away.
{% endhint %}

#### 5. Run some code

```python
from burla import remote_parallel_map

def my_function(x):
    print(f"processing input {x} on a machine in the cloud")
    return x * 2

results = remote_parallel_map(my_function, list(range(100)))
```

Prints stream back to your terminal, and exceptions are re-raised locally with full tracebacks.

Hardware is an argument, not configuration:

```python
results = remote_parallel_map(
    my_function,
    my_inputs,
    func_cpu=4,           # CPUs reserved per function call
    func_ram=16,          # GB of RAM per call ("dynamic" by default)
    func_gpu="A100",      # one GPU per call
    image="python:3.12",  # any Docker image
)
```

See the [API reference](/docs/api-reference) for every argument.

#### 6. Deploy it for your team (optional)

To share one cluster, dashboard, and job history with teammates, move the coordinator off your laptop onto a small always-on VM in your account:

```bash
burla deploy
```

Teammates then connect by running `burla login`.



Questions, or something not working? Email jake@burla.dev or [book a call](https://cal.com/jakez/burla?user=jakez&duration=30), we're happy to help.
