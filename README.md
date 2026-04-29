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

Early. The harness, model registry, run artifacts, D1 import path, and leaderboard shell exist. The benchmark sample set will grow by hand over time.

See [ROADMAP.md](./ROADMAP.md) for the path to a useful public release.

## Quick start

```bash
corepack pnpm install
cp .env.example .env.local # or create .env.local manually
```

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
corepack pnpm run mceval -- run --model openai/gpt-4.1-mini
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
corepack pnpm run check                     # test, typecheck, lint, build, OpenNext build
```

Run artifacts are written to `.mceval/runs/<runId>.json`. Import SQL is written to `.mceval/imports/<runId>.sql`.

## Model registry

Models live in [`src/data/models.ts`](./src/data/models.ts). This is not a flagship list. It is the evaluated model registry: a curated set chosen to balance coverage and cost.

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

## Repository hygiene

Do not commit secrets, `.env.local`, generated run logs, import SQL, Wrangler state, build output, or dependency folders.
