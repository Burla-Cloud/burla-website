# API Reference

`remote_parallel_map` is the only function in the Burla python package.



***

### `burla.remote_parallel_map`

Run a Python function on many remote computers at the same time.

```python
remote_parallel_map(
  function_,
  inputs,
  func_cpu=1,
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

Run provided `function_` on each item in `inputs` in at the same time using all available workers.\
Extra inputs are queued and processed sequentially on each worker.

If `grow=True` automatically boots and assigns additional workers to minimize runtime.

While running:

* If the provided `function_` raises an exception, the exception is raised on the client machine.
* Your print statements (anything written to stdout/stderr) are streamed back to your local machine, appearing like they would have if running the same code locally.

When finished `remote_parallel_map` returns a list of objects returned by each `function_` call.\
Optionally, it can return a generator that yields results as they become available.

<table data-header-hidden><thead><tr><th width="181.25390625"></th><th></th></tr></thead><tbody><tr><td><strong>Parameters</strong></td><td></td></tr><tr><td><strong>Name</strong></td><td><strong>Description</strong></td></tr><tr><td><code>function_</code></td><td><p><code>Callable</code></p><p>Any python function that is &#x3C;100MB (1M lines) when pickled.</p></td></tr><tr><td><code>inputs</code></td><td><p><code>List[Any]</code></p><p>List of elements passable to <code>function_</code>.<br>Tuples are unpacked into *args by default.</p></td></tr><tr><td><code>func_cpu</code></td><td><p><code>int</code></p><p>(Optional) Number of CPU's made available to each running instance of <code>function_</code>. Max possible value is determined by your cluster machine type. Defaults to 1.</p></td></tr><tr><td><code>func_ram</code></td><td><p><code>int</code> or <code>"dynamic"</code></p><p>(Optional) Amount of RAM (GB) made available to each running instance of <code>function_</code>. Defaults to <code>"dynamic"</code>: Burla starts with as many parallel function calls as the requested CPUs allow, then gives each call more RAM by lowering parallelism on any node where workers run out of memory. Pass an integer, such as <code>8</code>, to reserve a fixed amount of RAM per function call instead. Max fixed RAM is determined by your cluster machine type.</p></td></tr><tr><td><code>func_gpu</code></td><td><p><code>str</code></p><p>(Optional) Allocate one GPU per call to <code>function_</code>. One of: <code>"A100"</code> / <code>"A100_40G"</code>, <code>"A100_80G"</code>, <code>"H100"</code> / <code>"H100_80G"</code>. Defaults to <code>None</code> (no GPU).</p></td></tr><tr><td><code>image</code></td><td><p><code>str</code></p><p>(Optional) If provided, only nodes running this container image are eligible. When <code>grow=True</code> and no matching nodes are available, newly booted nodes will run this image. Defaults to <code>None</code> (no image filter).</p></td></tr><tr><td><code>grow</code></td><td><code>bool</code><br>(Optional) Automatically adds additional nodes to complete the provided work as quickly as possible. These nodes inherit existing settings.</td></tr><tr><td><code>max_parallelism</code></td><td><p><code>int</code></p><p>(Optional) Maximum number of <code>function_</code> instances allowed to be running at the same time.</p></td></tr><tr><td><code>detach</code></td><td><code>bool</code><br>(Optional) Job will continue to run independently on the cluster if stopped locally. Detached jobs can run in the background indefinitely.</td></tr><tr><td><code>generator</code></td><td><code>bool</code><br>(Optional) Set to <code>True</code> to return a <code>Generator</code> instead of a <code>List</code>. The generator will yield outputs as they are produced, instead of all at once at the end.</td></tr><tr><td><code>spinner</code></td><td><p><code>bool</code></p><p>(Optional) Set to <code>False</code> to hide the status indicator/spinner.</p></td></tr></tbody></table>

<table data-header-hidden><thead><tr><th width="180.60546875"></th><th></th></tr></thead><tbody><tr><td><strong>Returns</strong></td><td></td></tr><tr><td><strong>Type</strong></td><td><strong>Description</strong></td></tr><tr><td><code>List</code> or <code>Generator</code></td><td>List of objects returned by <code>function_</code> in no particular order. If <code>Generator=True</code>, returns generator yielding objects returned by <code>function_</code> in the order they are produced.</td></tr></tbody></table>
