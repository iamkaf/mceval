# mceval

Open-source Minecraft AI evaluation.

MCEval is a cloud-managed benchmark system and public leaderboard for measuring how well language models understand Minecraft: vanilla mechanics, versions, modding concepts, platforms, and ecosystem details.

Published evaluations use each model's default reasoning level unless a run artifact explicitly states otherwise.

The project is intentionally boring where it matters:

- D1-persisted benchmark runs
- deterministic scoring before model-graded judgment
- explicit model ids and suite provenance
- token, latency, and cost tracking
- asynchronous Cloudflare Queue execution

## Status

Early, but live: the evaluated model registry, D1-backed public leaderboard, dashboard, run comparison, model history pages, and CSV/JSON exports exist. The project is moving to dashboard-authored suite versions and Cloudflare Queue execution.

The current public leaderboard is seeded by `benchmark_1777426615091`, a historical model-set run with 6 models, 24 attempted results, 22 scored results, 2 provider empty-response errors, and `$0.03014268` total OpenRouter-reported cost.

See [TODO.md](./TODO.md) for the cloud execution and dashboard management plan.

## Quick start

```bash
corepack pnpm install
cp .env.example .env.local # or create .env.local manually
```

Apply D1 migrations and use the dashboard to manage suites and queue benchmark runs:

```bash
corepack pnpm run db:migrate:remote
corepack pnpm run deploy
```

Public result views:

- `/dashboard` manages suite drafts, suite versions, cloud runs, cancellation, and retries.
- `/runs/<runId>` shows a public run detail page.
- `/api/runs/<runId>.json` exports the full run detail as JSON.
- `/api/runs/<runId>.csv` exports result rows as CSV.
- `/models/<encoded model id>` shows model history and failure inspection.

Cloud execution requires Worker secrets and bindings. Set the OpenRouter key as a Worker secret:

```bash
corepack pnpm exec wrangler secret put OPENROUTER_API_KEY
```

## Core commands

```bash
corepack pnpm run check                     # test, typecheck, lint, quality, build, OpenNext build
corepack pnpm run db:migrate:remote         # apply D1 schema changes
corepack pnpm run deploy                    # build and deploy the Worker
```

## Model registry

Models live in [`src/data/models.ts`](./src/data/models.ts). This is not a flagship list. It is the registered model registry: a curated set chosen to balance coverage and cost.

The registry contains models that can be selected from the dashboard for cloud benchmark runs. Model selection is a run-time dashboard choice rather than a code-level default flag.

Each model has:

- provider
- display name
- OpenRouter model id
- icon
- benchmark temperature and token cap

Dashboard run creation selects registered models explicitly.

## Benchmark samples

Suites and samples are moving to D1-managed dashboard authoring. The four first-class suites are Minecraft Feature and History Knowledge, Minecraft Source Code Knowledge, Minecraft Content Platforms Knowledge, and Minecraft Ecosystem Knowledge. A sample should be small, factual, and deterministic whenever possible.

A useful sample includes:

- stable id
- direct prompt
- target answer
- accepted aliases when wording varies
- tags for topic and difficulty
- source/rationale in metadata when possible

## Scoring

The harness prefers deterministic scorers:

- normalized exact match
- normalized alias/includes match
- regex extraction plus exact match

Cost, token usage, latency, raw model response, and scorer output are persisted in D1. External scoring is planned after the cloud execution path is stable.

## Publishing data

Ready suite versions are benchmarkable but private. Publishing requires 100% benchmark coverage and makes that suite version homepage-visible. Older published versions remain available as history.

## Development

```bash
corepack pnpm dev
corepack pnpm run test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
```

Full gate:

```bash
corepack pnpm run check
```

`check` runs tests, typecheck, lint, repository quality checks, the Next build, and the OpenNext Cloudflare build.

## Repository hygiene

Do not commit secrets, `.env.local`, Wrangler state, build output, or dependency folders.
