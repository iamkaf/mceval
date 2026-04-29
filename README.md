# mceval

Open-source Minecraft AI evaluation.

MCEval is a small benchmark harness and public leaderboard for measuring how well language models understand Minecraft: vanilla mechanics, versions, modding concepts, platforms, and ecosystem details.

Published evaluations use each model's default reasoning level unless a run artifact explicitly states otherwise.

The project is intentionally boring where it matters:

- artifact-first benchmark runs
- deterministic scoring before model-graded judgment
- explicit model ids and suite provenance
- token, latency, and cost tracking
- reproducible imports into a public leaderboard

## Status

Early, but live: the harness, evaluated model registry, run artifacts, D1 import path, public leaderboard, run comparison, model history pages, and CSV/JSON exports exist. The benchmark sample set is intentionally small and will grow by hand over time.

The current public leaderboard is seeded by `benchmark_1777426615091`, a default model-set run with 6 models, 24 attempted results, 22 scored results, 2 provider empty-response errors, and `$0.03014268` total OpenRouter-reported cost.

See [TODO.md](./TODO.md) for the cloud execution and dashboard management plan.

## Quick start

```bash
corepack pnpm install
cp .env.example .env.local # or create .env.local manually
```

Import an existing run artifact or publish a fresh run:

```bash
corepack pnpm run mceval -- import .mceval/runs/<runId>.json
corepack pnpm run mceval -- import .mceval/runs/<runId>.json --remote
corepack pnpm run mceval -- publish --remote
```

Public result views:

- `/runs/compare` compares imported runs with cost, latency, scored-count, errors, and suite provenance.
- `/runs/<runId>` shows a public run detail page.
- `/api/runs/<runId>.json` exports the full run detail as JSON.
- `/api/runs/<runId>.csv` exports result rows as CSV.
- `/models/<encoded model id>` shows model history and failure inspection.

`.env.local` only needs an OpenRouter key for benchmark execution:

```bash
OPENROUTER_API_KEY=...
```

Run the default cost-balanced model set:

```bash
corepack pnpm run mceval -- run
```

Run all registered models:

```bash
corepack pnpm run mceval -- run --model-set all
```

Run one model:

```bash
corepack pnpm run mceval -- run --model deepseek/deepseek-v4-pro
```

Run, import locally, and print the latest leaderboard in one command:

```bash
corepack pnpm run mceval -- publish --local
```

## Core commands

```bash
corepack pnpm run mceval -- models          # list model registry
corepack pnpm run mceval -- samples         # validate benchmark samples
corepack pnpm run mceval -- run             # execute default evaluated model set
corepack pnpm run mceval -- import <run>    # import a run artifact into local D1
corepack pnpm run mceval -- leaderboard     # query latest local leaderboard
corepack pnpm run check                     # test, typecheck, lint, quality, build, OpenNext build
```

Run artifacts are written to `.mceval/runs/<runId>.json`. Import SQL is written to `.mceval/imports/<runId>.sql`.

## Model registry

Models live in [`src/data/models.ts`](./src/data/models.ts). This is not a flagship list. It is the evaluated model registry: a curated set chosen to balance coverage and cost.

The default model set currently contains the open-weight/OpenRouter-available models used for the public leaderboard: Kimi K2.6, GLM-5.1, MiniMax M2.7, DeepSeek V4 Pro, Qwen3.6 Max Preview, and MiMo-V2.5-Pro. The full registry also includes disabled-by-default frontier entries for ad hoc or exhaustive runs.

Each model has:

- provider
- display name
- OpenRouter model id
- icon
- default-enabled flag
- benchmark temperature and token cap

The default set is intentionally cheaper than the full registry. Use `--model-set all` for exhaustive runs.

## Benchmark samples

Samples live in [`src/eval/fixtures`](./src/eval/fixtures). Start from [`src/eval/fixtures/sample-template.ts`](./src/eval/fixtures/sample-template.ts) and use the [sample authoring guide](./docs/sample-authoring.md). A sample should be small, factual, and deterministic whenever possible.

A useful sample includes:

- stable id
- direct prompt
- target answer
- accepted aliases when wording varies
- tags for topic and difficulty
- source/rationale in metadata when possible

Validate samples with:

```bash
corepack pnpm run mceval -- samples
```

## Scoring

The harness prefers deterministic scorers:

- normalized exact match
- normalized alias/includes match
- regex extraction plus exact match

Cost, token usage, latency, raw model response, and scorer output are kept in the run artifact. Model-graded scoring is deliberately deferred until deterministic coverage is strong enough to justify it.

## Publishing data

Local publish loop:

```bash
corepack pnpm run mceval -- publish --local
```

Remote publish loop, for maintainers with Cloudflare access:

```bash
corepack pnpm run mceval -- publish --remote
```

`publish` runs the benchmark, imports the artifact, verifies the imported row count, and prints the latest leaderboard. That is the intended path; avoid hand-assembling shell commands unless debugging.

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

Do not commit secrets, `.env.local`, generated run logs, import SQL, Wrangler state, build output, or dependency folders.
