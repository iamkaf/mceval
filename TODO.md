# MCEval TODO

MCEval is moving from a CLI-driven artifact importer to a cloud-native, dashboard-managed evaluation system. The target architecture is Cloudflare Queues for async execution, D1 for canonical persistence, versioned benchmark suites, and a dashboard that owns authoring, runs, cancellation, retry, publication, and exports.

## Product Rules

- No JSON imports for cloud runs.
- No local benchmark execution path.
- No compatibility shims, fallbacks, or regression support for old workflows.
- D1 is the canonical persistence layer for suites, jobs, runs, results, and exports.
- Cloudflare Queues run benchmark jobs asynchronously.
- The dashboard is the control plane.
- Only registered models can be benchmarked.
- Model selection belongs in the UI; the registry has no `defaultEnabled` flag.
- Suite version names are globally unique human names, such as `MCHistory1` or `MCCode2`.
- Drafts are mutable WIP.
- Ready versions are immutable and benchmarkable but not public.
- Published versions are immutable and homepage-visible.
- Each suite may have multiple drafts and multiple ready versions.
- Each suite has only one published version at a time.
- Older published versions remain visible as history.
- The homepage can show a mix of published versions across suites, with labels.
- Publishing a ready version requires 100% benchmark coverage.
- Overall scores are weighted by sample, not by suite.

## Suites

The system has four first-class suites:

- Minecraft Feature and History Knowledge
- Minecraft Source Code Knowledge
- Minecraft Content Platforms Knowledge
- Minecraft Ecosystem Knowledge

Current details in `src/data/benchmarks.ts` are placeholders pending authoring work. These suites should become D1-managed records rather than static code fixtures.

## Phase 1: Cloud Execution Core

- [x] Add Cloudflare Queue producer and consumer bindings to `wrangler.jsonc`.
- [x] Add a custom OpenNext worker entrypoint that reuses the generated `fetch` handler and adds a `queue` handler.
- [x] Add required cloud bindings and secrets to runtime types: `DB`, `EVAL_QUEUE`, and `OPENROUTER_API_KEY`.
- [x] Fail hard when required cloud bindings or secrets are missing in dashboard run creation or queue consumers.
- [x] Define a small queue message shape: `{ runId, jobId }`.
- [x] Process queue batches with explicit per-message `ack()` and `retry()`.
- [x] Add retry delays for transient provider failures.
- [x] Add a dead-letter queue for exhausted jobs.

## Phase 2: D1 Schema

- [x] Replace artifact-import assumptions in `eval_runs` with operational run state.
- [x] Add `status` to runs: `queued`, `running`, `completed`, `failed`, `cancelled`.
- [x] Add run timestamps for queued, started, completed, and cancelled states.
- [x] Add run creator fields from dashboard auth.
- [x] Add `eval_run_suites` for runs that include one or more suite versions.
- [x] Add `eval_jobs` for one row per suite-version sample and model.
- [x] Add job status: `queued`, `running`, `completed`, `failed`, `cancelled`.
- [x] Add `eval_job_attempts` to preserve retry and failure history.
- [x] Keep `eval_results` as the latest accepted result per job for leaderboard and export queries.
- [x] Add `sample_hash`, `suite_hash`, and `model_config_hash` fields needed for future changed-only reruns.

## Phase 3: Suite Authoring CRUD

- [x] Add D1 tables for suites, drafts, draft samples, versions, and version samples.
- [x] Seed the four canonical suites.
- [x] Build dashboard suite list and detail pages.
- [x] Support creating suite drafts from scratch.
- [x] Support cloning a draft from the current published version.
- [x] Support editing draft metadata.
- [x] Support adding, editing, and archiving draft samples.
- [x] Preserve archived samples in history.
- [x] Use free-form category strings.
- [x] Enforce stable sample ids within a suite.
- [x] Validate sample prompts, targets, accepted aliases, tags, category, and difficulty before freezing a version.
- [x] Freeze a draft into an immutable ready version with a globally unique human version name.

## Phase 4: Dashboard Run Management

- [x] Add a dashboard run creation flow.
- [x] Allow runs against one or more ready or published suite versions.
- [x] Allow model selection only from `src/data/models.ts`.
- [x] Remove `defaultEnabled` from the model registry.
- [x] Insert runs, run suites, and jobs into D1 before enqueueing work.
- [x] Enqueue benchmark jobs with `sendBatch` in chunks.
- [x] Show active, completed, failed, and cancelled runs.
- [x] Show per-run progress by queued, running, completed, failed, and cancelled jobs.
- [x] Show per-suite and per-model progress inside a run.
- [x] Add run cancellation.
- [x] Add single-job retry.
- [x] Add retry-all-failed for a run.
- [x] Add retry failed jobs by suite.
- [x] Add retry failed jobs by model.
- [x] Ensure cancelled runs never update public leaderboard data.

## Phase 5: Queue Consumer

- [x] Load jobs, runs, suite version samples, and registered model config from D1/code.
- [x] No-op and acknowledge jobs for cancelled runs.
- [x] Idempotently skip completed jobs.
- [x] Claim queued or failed jobs before calling the provider.
- [x] Call OpenRouter with registered model settings.
- [x] Score model output with the current deterministic scorer.
- [x] Record every attempt in `eval_job_attempts`.
- [x] Upsert latest accepted result in `eval_results`.
- [x] Update job status and attempts.
- [x] Aggregate run metrics from D1.
- [x] Finalize a run when every job is terminal.

## Phase 6: Publishing And Homepage

- [x] Require 100% benchmark coverage before publishing a ready suite version.
- [x] Publish one version per suite while archiving the previous published version.
- [x] Update public queries to read only published suite versions and completed public runs.
- [x] Allow the homepage to show a mix of suite versions and label each suite/version clearly.
- [x] Keep the previous completed leaderboard visible if a newly published version has no public completed run yet.
- [x] Replace static sample manifest rendering with D1-backed published suite samples.
- [x] Update methodology copy to describe cloud execution, D1 persistence, and suite versioning.

## Phase 7: Exports

- [x] Keep exports one-way from D1.
- [x] Export run JSON from D1 without requiring run artifacts.
- [x] Export run CSV from D1.
- [x] Include suite ids, suite version names, sample stable ids, prompts, targets, model ids, scores, outputs, errors, latency, tokens, and cost.
- [x] Add dashboard export controls.

## Phase 8: Legacy Cleanup

- [x] Remove CLI benchmark execution from the product path.
- [x] Remove JSON import documentation.
- [x] Remove SQL import generation from cloud workflows.
- [x] Remove local publish/import instructions from README.
- [ ] Keep reusable scoring, schema, OpenRouter, and metric helpers only where cloud execution uses them.
- [ ] Update tests around cloud execution and suite authoring only.

## V2: External Scoring

- [ ] Add support for an external scoring API.
- [ ] Authenticate external scorer requests with a token or equivalent secret.
- [ ] Store scorer configuration per suite version or run.
- [ ] Preserve scorer request and response metadata for auditability.
- [ ] Support deterministic scorer fallback only when explicitly configured for a suite.
- [ ] Show scorer provenance in dashboard and exports.

## V2: Donated Keys

- [ ] Add a donate-your-own-key system for crowdsourced benchmark execution.
- [ ] Store donated keys securely outside plain D1 rows.
- [ ] Track donor consent, provider, limits, and revocation state.
- [ ] Add per-key budget and rate controls.
- [ ] Attribute runs to donated key pools without exposing secrets.
- [ ] Build dashboard controls for enabling, disabling, and auditing donated keys.

## V2: Exports

- [ ] Add richer export bundles for public reproducibility.
- [ ] Export suite versions, samples, run metadata, results, attempts, scorer metadata, and model configuration.
- [ ] Add filtered exports by suite, model, version, and run.
- [ ] Add export history and downloadable artifacts generated from D1.
