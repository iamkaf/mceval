# mceval

Minecraft model evaluation harness and public leaderboard shell for `mceval.kaf.sh`.

The public homepage is static. Benchmark runs are CLI-first, persisted as local JSON artifacts, and imported into D1 after validation. The authenticated dashboard is read-only and uses Uriel for session checks.

## Setup

```bash
corepack pnpm install
corepack pnpm dev
```

Local benchmark execution and dashboard auth use `.env.local`:

```bash
OPENROUTER_API_KEY=***
AUTH_ORIGIN=https:...f.sh
URIEL_SESSION_API_TOKEN=***
MCEVAL_ADMIN_USER_IDS=discord-user-1,discord-user-2 # optional; unset allows any authenticated Uriel user
```

`AUTH_ORIGIN` is the shared Uriel sign-in service. `URIEL_SESSION_API_TOKEN` is the server-to-server token used for `/session` checks. `MCEVAL_ADMIN_USER_IDS` is an optional app-level authorization allowlist; Uriel proves identity, mceval owns authorization.

Do not commit env files, generated run logs, import SQL, Wrangler state, build output, or dependency folders.

## Benchmark runs

Single model:

```bash
MODEL_ID=openai/gpt-5.4-mini corepack pnpm run eval:benchmark
```

Model matrix:

```bash
MODEL_IDS=openai/gpt-5.4-mini,moonshotai/kimi-k2.6 corepack pnpm run eval:benchmark
```

Machine-readable JSON:

```bash
MODEL_IDS=openai/gpt-5.4-mini,moonshotai/kimi-k2.6 \
  corepack pnpm --silent run eval:benchmark:json > /tmp/mceval-benchmark.json
python -m json.tool /tmp/mceval-benchmark.json >/dev/null
```

Run logs are written to `.mceval/runs/<runId>.json`.

## Dashboard

`/dashboard` is protected by Uriel and reads imported benchmark runs from D1. It is intentionally read-only: the browser does not execute benchmarks or call OpenRouter.

- Run list: `https://mceval.kaf.sh/dashboard`
- Run detail: `https://mceval.kaf.sh/dashboard/runs/<runId>`

If no D1 runs are present, the dashboard shows an import command instead of placeholder data.

## D1 import

```bash
corepack pnpm run db:migrate:local
corepack pnpm run eval:import-run .mceval/runs/<runId>.json
```

Verify a local import:

```bash
corepack pnpm exec wrangler d1 execute mceval --local --command \
  "SELECT r.id, r.result_count, r.accuracy, r.total_cost, COUNT(e.id) AS imported_results FROM eval_runs r LEFT JOIN eval_results e ON e.run_id = r.id WHERE r.id = '<runId>' GROUP BY r.id;"
```

Apply remote migrations only when migration files changed:

```bash
corepack pnpm run db:migrate:remote
```

## Quality gate

```bash
corepack pnpm run test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm exec opennextjs-cloudflare build
```

## Deploy

```bash
corepack enable pnpm
pnpm exec opennextjs-cloudflare deploy
curl -I https://mceval.kaf.sh
```
