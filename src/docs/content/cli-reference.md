# CLI Reference

Burla's CLI contains the following commands:

* [`burla deploy`](/docs/cli-reference#burla-deploy) Deploy (or update) an always-on Burla cluster your team can share.
* [`burla dashboard`](/docs/cli-reference#burla-dashboard) Open the dashboard for the cluster this machine uses.
* [`burla login`](/docs/cli-reference#burla-login) Authorize your computer to use a deployed Burla cluster.
* [`burla config`](/docs/cli-reference#burla-config) View or set which cloud Burla boots VMs in.

The global arg `--help` can be placed after any command to see CLI documentation.\
Run `burla --version` to print the installed client version.

***

### `burla deploy`

Burla needs no deployment to run: `remote_parallel_map` and `burla dashboard` run the cluster coordinator on your own machine. `burla deploy` moves that coordinator, its dashboard, and its job history onto one small always-on VM in your cloud account, so the cluster stays up for your whole team.

```bash
burla deploy              # deploys into the cloud selected by `burla config`
burla deploy --cloud=gcp  # or aws, azure: override the configured cloud once
```

**Description:**

* Your first deploy copies the job history and settings from your machine's coordinator, so the deployed dashboard picks up where your local one left off.
* Running `burla deploy` again updates an existing deployment in place. The head VM keeps its job history and settings, so this is also how you upgrade to a new Burla version.
* After a successful deploy your machine is pointed at the new cluster automatically. Teammates connect by running [`burla login`](/docs/cli-reference#burla-login).

{% hint style="info" %}
`--cloud` defaults to whichever cloud [`burla config`](/docs/cli-reference#burla-config) selects (AWS if you've never set it). Either way, Burla deploys into the account your CLI is pointed at: your active AWS account and region, gcloud project, or Azure subscription.
{% endhint %}

**What it creates:**

<details>

<summary>On Google Cloud</summary>

* Enables the `compute`, `cloudresourcemanager`, `storage`, and `iamcredentials` APIs.
* A bucket named `<project-id>-burla-shared-workspace`: the shared workspace every node mounts.
* A `burla-main-service` service account for the head VM, granted `roles/compute.instanceAdmin.v1`, `roles/storage.objectUser`, and `roles/artifactregistry.reader`, plus `roles/iam.serviceAccountTokenCreator` on itself and `roles/iam.serviceAccountUser` on the default compute service account.
* A static IP and one always-on `e2-small` VM named `burla-main-service` (in `us-central1`) running the coordinator and dashboard.

</details>

<details>

<summary>On AWS</summary>

* A bucket named `aws-<account-id>-burla-shared-workspace`: the shared workspace every node mounts.
* Two IAM roles with instance profiles: `burla-main-service` (boot and delete nodes, pull images from ECR, read/write the workspace bucket) and `burla-node` (read/write the workspace bucket only).
* Security groups for the head instance and nodes.
* A reusable node machine image, built once by a temporary builder instance that deletes itself afterward.
* An Elastic IP and one always-on `t3.small` instance named `burla-main-service` running the coordinator and dashboard.

</details>

<details>

<summary>On Microsoft Azure</summary>

* A storage account and container for the shared workspace every node mounts.
* A managed identity for the head VM, with roles to boot and delete VMs and to read/write the workspace container.
* One small always-on VM named `burla-main-service` running the coordinator and dashboard, with a static public IP.

</details>

No inbound firewall rules are ever opened in your account: the head VM and nodes dial out to Burla's relay, and your dashboard is served at `https://head--<project-id>.relay.burla.dev`.

**Prerequisites:**

Deploying is the only Burla command that needs more than permission to boot VMs.

{% hint style="info" %}
If you're missing permissions, run the command anyway: it will fail showing exactly which command was denied. Email jake@burla.dev if you need any help!
{% endhint %}

<details>

<summary>What permissions do I need to run <code>burla deploy</code> on Google Cloud?</summary>

You need permission to run these `gcloud` commands (project owner covers all of them):

* `gcloud services enable ...`
* `gcloud storage buckets create / update ...`
* `gcloud iam service-accounts create ...`
* `gcloud projects add-iam-policy-binding ...`
* `gcloud iam service-accounts add-iam-policy-binding ...`
* `gcloud compute addresses create ...`
* `gcloud compute instances create / start / stop ...`

</details>

<details>

<summary>What permissions do I need to run <code>burla deploy</code> on AWS?</summary>

You need permission to run these `aws` commands (`AdministratorAccess` covers all of them):

* `aws s3api create-bucket / put-bucket-cors ...`
* `aws iam create-role / put-role-policy / attach-role-policy / create-instance-profile ...`
* `aws ec2 create-security-group / authorize-security-group-ingress ...`
* `aws ec2 run-instances / create-image / terminate-instances ...`
* `aws ec2 allocate-address / associate-address ...`
* `aws ssm send-command ...`

</details>

<details>

<summary>What permissions do I need to run <code>burla deploy</code> on Microsoft Azure?</summary>

You need permission to run these `az` commands (subscription `Owner` covers all of them):

* `az storage account create / container create ...`
* `az identity create ...`
* `az role assignment create ...`
* `az network public-ip create / nsg create ...`
* `az vm create / start / stop ...`

</details>

***

### `burla dashboard`

Open the dashboard for whichever cluster this machine uses.

**Description:**

* If this machine is connected to a deployed cluster (you ran `burla deploy` or `burla login`), opens that cluster's dashboard.
* Otherwise, if a coordinator is already running on this machine (for example because you recently called `remote_parallel_map`), opens its dashboard.
* Otherwise, starts a coordinator in the foreground, streams its logs, and opens its dashboard in your browser. Press Ctrl-C to stop it.

***

### `burla login`

Authorize this machine to run code on a deployed Burla cluster.

**Description:**

Opens the cluster login page in your default browser. Once you finish signing in, an auth token is sent back to this machine and saved in `burla_credentials.json`, stored in your operating system's standard user config directory. From then on `remote_parallel_map` and `burla dashboard` use the deployed cluster.

Pass `--no-browser` to print the login URL instead of opening a browser (this happens automatically inside Google Colab).

You only need `burla login` to connect to a cluster someone else deployed: `burla deploy` connects the deployer's machine automatically.

***

### `burla config`

View or set which cloud Burla boots VMs in.

```bash
burla config set cloud gcp   # or: aws, azure
burla config get cloud
```

**Description:**

* The default is `aws`: Burla uses the account and region your AWS CLI is pointed at. With `gcp` it uses your active gcloud project, and with `azure` your active Azure subscription.
* Every Burla command follows this setting, including `remote_parallel_map` and `burla deploy` (which can override it once with `--cloud`).
* Setting the `BURLA_CLOUD` environment variable overrides this setting for a single shell.
