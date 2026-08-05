# Getting Started

Burla runs your Python functions on VMs in your own cloud account, and there is nothing to deploy. If you're logged in to your cloud's CLI and can boot VMs there, setup is one command:

```bash
pip install burla
```

Burla doesn't create service accounts, buckets, firewall rules, or IAM bindings. The VMs it boots carry no credentials, and your code, inputs, and results never leave your account.

You'll need Python 3.11+ and one of these CLIs installed and logged in: [`aws`](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), [`gcloud`](https://cloud.google.com/sdk/docs/install), or [`az`](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli).



#### 1. Pick your cloud

Burla defaults to the account and region your AWS CLI is pointed at. If that's what you want, skip this step.

To use Google Cloud, select it once and Burla will use your active gcloud project:

```bash
burla config set cloud gcp
gcloud config set project <project-id>
```

To use Microsoft Azure, select it once and Burla will use your active subscription:

```bash
burla config set cloud azure
az account set --subscription <subscription-id>
```



#### 2. Open the dashboard and boot some machines

```bash
burla dashboard
```

This starts Burla's cluster coordinator on your machine, streams its logs, and opens the dashboard in your browser. Press Ctrl-C to stop it. If a coordinator is already running, the command just opens the dashboard.

In the dashboard, hit the **⏻ Start** button. This boots one node by default, and you'll see it come online in the nodes list. Machine type, node count, disk size, and Docker image are all editable in the dashboard's settings.

{% hint style="info" %}
Nodes shut themselves down after 10 idle minutes (configurable in settings), so nothing keeps running, or billing you, after you walk away.
{% endhint %}



#### 3. Run some code

While your node boots, run this from any Python shell, script, or notebook:

```python
from burla import remote_parallel_map

def my_function(x):
    print(f"processing input {x} on a machine in the cloud")
    return x * 2

results = remote_parallel_map(my_function, list(range(100)))
```

Anything your function prints streams back to your terminal, exceptions are re-raised locally with full tracebacks, and the dashboard shows live logs, node status, and background jobs. Prefer a notebook? The same example is in our [Colab quickstart](https://colab.research.google.com/drive/1bR8Gpa85gqJi7_9uKdcJDX9_WG0tuVmG?usp=sharing).

Hardware and environment are arguments, not configuration:

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

{% hint style="success" %}
The dashboard is optional. `remote_parallel_map` starts the coordinator by itself, and by default (`grow=True`) boots VMs whenever capacity falls short. We lead with the dashboard because it makes for a nicer first run: without it, your first call spends a couple minutes booting VMs with nothing to watch.
{% endhint %}



#### 4. Deploy it for your team (optional)

Everything so far ran the coordinator on your laptop. To share one cluster, dashboard, and job history with teammates, move it onto a small always-on VM in your account:

```bash
burla deploy
```

Job history and settings from your machine move with it, so the deployed dashboard picks up where your local one left off. This is the only step that needs more than permission to boot VMs (it sets up a service account and IAM); the exact list is in the [CLI reference](/docs/cli-reference). After deploying, teammates connect by running `burla login`.



Questions, or something not working? Email jake@burla.dev or [book a call](https://cal.com/jakez/burla?user=jakez&duration=30), we're happy to help.
