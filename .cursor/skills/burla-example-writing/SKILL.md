---
name: burla-example-writing
description: Creates and revises Burla documentation examples that are concise, technically correct, and indistinguishable from careful human writing. Use when adding, rewriting, reviewing, or illustrating examples under src/docs/content, including basic guides, featured examples, code samples, expected output, cards, covers, and dashboard screenshots.
---

# Burla Example Writing

## Quality bar

An example should feel like a strong engineer wrote it to help another engineer complete one task.

Use these as style references:

- Basic guide: https://modal.com/docs/guide/images
- `src/docs/content/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning.md`
- `src/docs/content/featured-examples/multi-stage-genomic-pipeline.md`
- `src/docs/content/featured-examples/process-2.4tb-of-parquet-files-in-76s.md`

Use references for tone and structure, not as factual authority. Verify every Burla claim against the current implementation.

When revising an existing page, preserve concise human-written structure and voice that already works. Change only what accuracy or clarity requires. More explanation is not automatically better.

## Start with the proof

Before writing, state privately in one sentence what the example must prove.

Keep only what is necessary to prove that sentence. Do not add a second lesson because it is related or convenient.

Each tutorial step demonstrates exactly one concept or feature. If a heading naturally contains “and,” split it unless both actions are inseparable from the proof.

## Use the smallest real example

- Use one input unless multiple inputs are required to demonstrate parallelism.
- Use one file unless multiple files are the feature.
- Return nothing when the return value is unused.
- Return a primitive when a dictionary, object, dataframe, or metadata wrapper adds no value.
- Do not add helper functions, configuration, abstractions, retries, logging, or cleanup unless the example needs them.
- Do not repeat imports or setup in sequential code blocks.
- Do not sort, reshape, or decorate output only to make it look nicer. Explain nondeterminism when it matters.
- Never add a smoke test. Remove smoke tests encountered while editing.

Minimal does not mean incomplete. For example, one remote function that writes and immediately reads the same file does not prove storage is shared across executions. Two separate remote calls are the minimum for that claim.

Run a deletion pass after drafting. For every line, ask:

1. Does removing this make the concept harder to understand?
2. Does the reader need this now?
3. Is this the simplest type, value, and control flow that works?

Delete the line unless one answer is yes.

## Structure basic guides

Use the smallest subset of this structure that works:

1. Title.
2. One sentence or two short bullets stating the behavior.
3. “Before you run this” with only real prerequisites.
4. Numbered steps, one concept per step.
5. Minimal runnable code.
6. Exact expected output, if output helps.
7. One screenshot, only when it confirms a UI-visible result.

Do not add a recap, congratulations, sales pitch, generic conclusion, support invitation, or “why this matters” section unless it resolves a question the reader will actually have.

Place explanations immediately after the code they clarify. Do not narrate obvious syntax.

## Structure larger examples

Featured and workload examples may be longer when the real workflow requires it:

- Name the real dataset, tool, hardware, and result.
- Explain why each stage exists.
- Keep one operation per section.
- Show measured numbers only when they came from the real run.
- Prefer concrete operational details over generic cloud commentary.
- Never invent scale, runtime, cost, output, failures, or benchmarks.

## Write like a human

- Use plain, specific sentences.
- Prefer concrete nouns and verbs.
- State concrete compatibility and requirements instead of using vague labels such as “ordinary.”
- Tell readers what they need to do, not what they do not need to do.
- Answer the reader’s likely question at the moment it arises.
- Cut setup commentary, padded transitions, fake enthusiasm, and obvious summaries.
- Avoid generic marketing language and claims such as “powerful,” “seamless,” “unlock,” or “transformative.”
- Avoid “This is exactly the kind of...” and other synthetic scene-setting.
- Avoid “not just X, but Y” constructions.
- Do not use em dashes.
- Do not imitate a polished essay when a direct instruction is enough.

An experienced engineer should not be able to identify the prose as AI-generated.

## Use precise terminology

Use **cloud storage** in titles and ordinary instructions.

When technical precision matters, say **object storage** and name the provider forms:

- Amazon S3 bucket
- Google Cloud Storage bucket
- Azure Blob Storage container

Do not call every provider’s storage a bucket. Do not use “blob storage” as the generic user-facing term.

## Verify against current Burla

The website can lag behind Burla. Before changing behavior, prerequisites, defaults, paths, output order, supported clouds, or dashboard UI:

1. Inspect the current `dev` branch in the Burla source repo. On Jake’s machine this is `~/Documents/burla/burla`.
2. Confirm local `dev` matches `origin/dev`.
3. Read the implementation, not only existing docs.
4. Flag every stale or incorrect statement found.

If the source repo is unavailable, do not guess. State what could not be verified.

Pay special attention to:

- Whether a feature requires `burla deploy`.
- Whether `burla login` is universal or conditional.
- Current `remote_parallel_map` defaults.
- Tuple unpacking and result ordering.
- Exact string contents, including newlines.
- Whether paths exist locally, per node, or across the deployed cluster.
- Differences among AWS, GCP, and Azure.

Do not preserve incorrect behavior for consistency with an older example.

## Screenshots and example assets

When the dashboard appears in an example:

1. Run the dashboard from the current Burla `dev` branch.
2. Create only the data shown by the example.
3. Remove license banners, unrelated rows, and test artifacts from the captured view.
4. Capture every image the example uses from the same dashboard state, commonly the inline screenshot, cover, and card.
5. Preserve the existing asset dimensions unless the layout requires a change.
6. Add useful alt text.
7. Delete temporary local and cloud files after capture.

Never reuse a screenshot of an old dashboard theme.

## Final review

Before finishing:

- Read the page as a first-time Burla user.
- Confirm every step teaches one thing.
- Confirm every code line is required.
- Confirm the shown output can actually occur.
- Confirm terminology is provider-neutral and precise.
- Confirm screenshots match the current UI and code.
- Update the example card description when the page’s framing changed.
- Run the website build and lint.
- Render the page in a browser and check the full reading flow.

If the example can be shorter without weakening its proof, it is not finished.
