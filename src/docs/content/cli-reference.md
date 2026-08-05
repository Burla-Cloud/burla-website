# CLI Reference

Burla's CLI contains the following commands:

* [`burla install`](/docs/cli-reference#burla-install) Deploy self-hosted Burla in your Google Cloud project.
* [`burla login`](/docs/cli-reference#burla-login) Authorize your computer execute code in your Burla instance.

The global arg `--help` can be placed after any command or command group to see CLI documentation.

***

### `burla install`

Deploy a self-hosted Burla instance in your current Google Cloud Project.\
Running `burla install` multiple times will update the existing installation with the latest version.

**Description:**

Installs Burla inside the Google Cloud project that your [gcloud CLI](https://cloud.google.com/sdk/gcloud) is currently pointing to.\
For a more user-friendly installation guide see: [Installation: Self-Hosted](/docs/get-started)

To view your current gcloud project run: `gcloud config get project`\
To change your current gcloud project run: `gcloud config set project <desired-project-id>`

**Prerequisites:**

* Have the [gcloud CLI](https://cloud.google.com/sdk/gcloud) installed ([how do I install the gcloud CLI?](https://cloud.google.com/sdk/docs/install)).
* Be logged in to the [gcloud CLI](https://cloud.google.com/sdk/gcloud) ([how do I log in?](https://cloud.google.com/sdk/docs/authorizing#user-account))\
  (`gcloud auth login` & `gcloud auth application-default login`)
* Have a Google Cloud user account with the minimum required permissions to install Burla.\
  **Or:** Just run `burla install`, if you're missing any permissions it will tell you which ones!

Here is the set of permissions you'll need to run `burla install`:\
Any of these three permission set's will work.

<details>

<summary>Simplest possible permissions</summary>

Burla can be installed by users having the project editor (`roles/editor`) role.

</details>

<details>

<summary>Service admin based permissions (more specific)</summary>

Burla can be installed by users having the following generic roles:

1. Service Usage Admin (`roles/serviceusage.serviceUsageAdmin`)
2. Cloud Run Admin (`roles/run.admin`)
3. Compute Network Admin (`roles/compute.networkAdmin`)
4. Secret Manager Admin (`roles/secretmanager.admin`)
5. Service Account Admin (`roles/iam.serviceAccountAdmin`)
6. Service Account Key Admin (`roles/iam.serviceAccountKeyAdmin`)
7. Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)
8. Firestore / Datastore Owner (`roles/datastore.owner`)

</details>

<details>

<summary>Exact minimum required permissions (very specific) (IAM role)</summary>

Below is an IAM role definition for this minimum installer permission set.

To create this IAM role, put the lower text in a file called `burla-installer-role.yaml`.\
Then run the following command:

```bash
PROJECT_ID="$(gcloud config get-value project)"
gcloud iam roles create burlaInstaller \
  --project "$PROJECT_ID" \
  --file burla-installer-role.yaml
```

Contents of `burla-installer-role.yaml`:

```yaml
title: "Burla Installer"
description: "Minimum permissions required to install Burla"
stage: "GA"
includedPermissions:
  # Enable required APIs
  - serviceusage.services.enable
  - serviceusage.services.get
  - serviceusage.services.list

  # Read project number + set project IAM bindings
  - resourcemanager.projects.get
  - resourcemanager.projects.getIamPolicy
  - resourcemanager.projects.setIamPolicy

  # Firewall rule for cluster nodes
  - compute.firewalls.create
  - compute.firewalls.get
  - compute.firewalls.list

  # Create + manage bucket
  - storage.buckets.create
  - storage.buckets.get
  - storage.buckets.list
  - storage.buckets.update

  # Secret for cluster token + IAM bindings + versions
  - secretmanager.secrets.create
  - secretmanager.secrets.get
  - secretmanager.secrets.list
  - secretmanager.secrets.getIamPolicy
  - secretmanager.secrets.setIamPolicy
  - secretmanager.versions.add
  - secretmanager.versions.access

  # Create service accounts, grant them roles, rotate keys, and use them for Cloud Run deploy
  - iam.serviceAccounts.create
  - iam.serviceAccounts.get
  - iam.serviceAccounts.list
  - iam.serviceAccounts.getIamPolicy
  - iam.serviceAccounts.setIamPolicy
  - iam.serviceAccounts.actAs
  - iam.serviceAccountKeys.create
  - iam.serviceAccountKeys.list
  - iam.serviceAccountKeys.delete

  # Create Firestore database + write initial config doc via Firestore client
  - datastore.databases.create
  - datastore.databases.get
  - datastore.entities.create
  - datastore.entities.update
  - datastore.entities.get

  # Deploy and configure Cloud Run service
  - run.services.create
  - run.services.get
  - run.services.list
  - run.services.update
  - run.services.getIamPolicy
  - run.services.setIamPolicy
```

</details>

These permissions are only required to **install** Burla, they are **not** granted to the Burla service itself.\
Upon install Burla creates a service account for itself having [this minimum set of permissions](https://github.com/Burla-Cloud/burla/blob/2e027b57c9e9309587b89a1024c84851998304db/client/src/burla/_install.py#L427-L453).

{% hint style="info" %}
On install, your Google account (the one you are currently logged in to `gcloud` with) is set as the only account authorized to access this new Burla deployment.
{% endhint %}

We encourage you to check out [\_install.py](https://github.com/Burla-Cloud/burla/blob/main/client/src/burla/_install.py) in the client for even more specific installation details.

***

### `burla login`

Connects your computer to the Burla cluster you most recently logged into in your browser.\
Authorizes your machine to call `remote_parallel_map` on this cluster.

**Description:**

Launches the "Authorize this Machine" page in your default web browser.

If there is no auth-cookie (you have not yet logged into the dashboard), throws simple error requesting you login to your cluster dashboard first.

When the "Authorize" button is hit, a new auth token is created and sent to your machine.

This token is saved in the text file `burla_credentials.json`. This file is stored in your operating system's recommended user data directory which is determined using the [appdirs](https://github.com/ActiveState/appdirs) python library.

This token is refreshed each time the `burla login` is run, or certain amount of time passes.
