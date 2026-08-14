# API Reference

`remote_parallel_map` is the only function in the Burla Python package.



***

### `burla.remote_parallel_map`

Run a Python function on many remote computers at the same time.

```python
remote_parallel_map(
  function_,
  inputs,
  func_cpu="dynamic",
  func_ram="dynamic",
  func_gpu=None,
  image=None,
  grow=False,
  max_parallelism=None,
  detach=False,
  generator=False,
  spinner=True
)
```

Run `function_` on each item in `inputs` using all available workers.\
Extra inputs are queued and processed sequentially on each worker.

`grow=True` automatically boots and assigns additional workers to minimize runtime.

While running:

* If the provided `function_` raises an exception, the exception is raised on the client machine.
* Your print statements (anything written to stdout/stderr) are streamed back to your local machine, appearing like they would have if running the same code locally.

When finished `remote_parallel_map` returns a list of objects returned by each `function_` call.\
Optionally, it can return a generator that yields results as they become available.

<table data-header-hidden>
<thead><tr><th width="181.25390625"></th><th></th></tr></thead>
<tbody>
<tr><td><strong>Parameters</strong></td><td></td></tr>
<tr><td><strong>Name</strong></td><td><strong>Description</strong></td></tr>
<tr><td><code>function_</code></td><td><p><code>Callable</code></p><p>Any Python function smaller than 100MB when pickled.</p></td></tr>
<tr><td><code>inputs</code></td><td><p><code>List[Any]</code></p><p>Values passed to <code>function_</code>. Tuples are unpacked into positional arguments.</p></td></tr>
<tr><td><code>func_cpu</code></td><td><p><code>int</code> or <code>"dynamic"</code></p><p>(Optional) CPUs allocated to each function call. Defaults to <code>"dynamic"</code>: Burla begins with one call per CPU, then gives each call more CPU when it is measurably waiting for a core. Pass an integer to reserve a fixed number instead.</p></td></tr>
<tr><td><code>func_ram</code></td><td><p><code>int</code> or <code>"dynamic"</code></p><p>(Optional) RAM in GB allocated to each function call. Defaults to <code>"dynamic"</code>: Burla lowers parallelism when workers run out of memory. Pass an integer to reserve a fixed amount instead.</p></td></tr>
<tr><td><code>func_gpu</code></td><td><p><code>str</code></p><p>(Optional) Allocates one GPU per function call. Use <code>"A100"</code> / <code>"A100_40G"</code>, <code>"A100_80G"</code>, or <code>"H100"</code> / <code>"H100_80G"</code>. Defaults to <code>None</code>.</p></td></tr>
<tr><td><code>image</code></td><td><p><code>str</code></p><p>(Optional) Limits the job to nodes running this container image. With <code>grow=True</code>, Burla boots matching nodes when needed. If omitted, new nodes use the stock <code>python:X.Y</code> image matching your local Python version.</p></td></tr>
<tr><td><code>grow</code></td><td><p><code>bool</code></p><p>(Optional) Adds nodes to complete the job as quickly as possible. Defaults to <code>False</code>.</p></td></tr>
<tr><td><code>max_parallelism</code></td><td><p><code>int</code></p><p>(Optional) Maximum number of function calls that can run at once. Defaults to the number of inputs.</p></td></tr>
<tr><td><code>detach</code></td><td><p><code>bool</code></p><p>(Optional) Keeps the job running if the local process stops. Requires a deployed cluster. Defaults to <code>False</code>.</p></td></tr>
<tr><td><code>generator</code></td><td><p><code>bool</code></p><p>(Optional) Returns a generator that yields results as they arrive. Defaults to <code>False</code>.</p></td></tr>
<tr><td><code>spinner</code></td><td><p><code>bool</code></p><p>(Optional) Set to <code>False</code> to hide the status indicator. Defaults to <code>True</code>.</p></td></tr>
</tbody>
</table>

<table data-header-hidden><thead><tr><th width="180.60546875"></th><th></th></tr></thead><tbody><tr><td><strong>Returns</strong></td><td></td></tr><tr><td><strong>Type</strong></td><td><strong>Description</strong></td></tr><tr><td><code>List</code> or <code>Generator</code></td><td>List of objects returned by <code>function_</code> in no particular order. If <code>Generator=True</code>, returns generator yielding objects returned by <code>function_</code> in the order they are produced.</td></tr></tbody></table>
