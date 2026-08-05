# Getting Started

We recommend you first give Burla a try inside our cloud to make sure it's right for you.\
To try this [schedule a call with us](https://cal.com/jakez/burla?user=jakez\&duration=30) and we'll send you a managed trial instance afterward.

{% hint style="info" %}
Self-Hosted Burla is currently exclusive to Google Cloud.\
Please reach out and tell us if you want to Self-Host, but aren't on GCP! My email is: jake@burla.dev
{% endhint %}



#### 1. Ensure `gcloud` is setup and installed:

If you haven't, [install the gcloud CLI](https://cloud.google.com/sdk/docs/install), and [login using application-default credentials](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment).

Ensure `gcloud` is pointing at the project you wish to install Burla inside:

* To view your current gcloud project run: `gcloud config get project`
* To change your current gcloud project run: `gcloud config set project <NEW-PROJECT-ID>`



#### 2. Run the `burla install` command:

Run `pip install burla` then run `burla install`.

<details>

<summary>What permissions does my Google Cloud account need to run <code>burla install</code> ?</summary>

{% hint style="info" %}
If you don't have permissions, run the command anyway, and it will tell you which ones you are missing. Email jake@burla.dev if you need any help!
{% endhint %}

To run `burla install` you'll need permission to run these `gcloud` commands:

* `gcloud services enable ...`
* `gcloud compute firewall-rules create ...`
* `gcloud secrets create ...`
* `gcloud firestore databases create ...`
* `gcloud run deploy ...`

The **exact required permissions** for `burla install` are listed in the [CLI documentation](/docs/cli-reference#prerequisites).

</details>



#### 3. Start a machine and run some code!

1. Use the [**Login**](https://login.burla.dev) button on this website to get to your new cluster dashboard.
2. Hit the **⏻ Start** button to turn the cluster on.\
   By default this starts one 4-CPU node. If inactive for >10 minutes this node will shut itself off.\
   If you pass `grow=True` to `remote_parallel_map` it will start this node by itself.
3. While booting, run `burla login` to connect your local computer to your cluster.
4. Run the example below!

```python
from burla import remote_parallel_map

def my_function(my_input):
    print("I'm running on remote computer in the cloud!")
    
remote_parallel_map(my_function, [1, 2, 3]) 
```
