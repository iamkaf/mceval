# MCEval Roadmap

MCEval is an open-source Minecraft AI evaluation project: a small, inspectable harness, a public leaderboard, and reproducible artifacts. The site should make it obvious what was tested, how it was scored, what it cost, and how to reproduce it.

## Principles

- **AI-first public surface**: public docs explain evaluation, scoring, artifacts, and contribution flow; private deployment/auth details stay out of the README.
- **Artifact-first runs**: every benchmark run writes a JSON artifact before anything is imported or published.
- **Deterministic before subjective**: exact, alias, regex, and rule-based scoring come before any model-graded scoring.
- **Cost-aware model selection**: evaluated models are curated for usefulness and budget, not because they are each provider's flagship.
- **Low-churn operations**: common workflows should be one command, not a pile of shell incantations.
- **Hand-authored samples**: benchmark samples are curated over time; tooling should make authoring and validation cheap.

## Phase 0 — real public leaderboard

- [x] Maintain one evaluated model registry with display metadata, OpenRouter IDs, icons, and run settings.
- [x] Make benchmark execution consume named model sets from the registry.
- [x] Add one-command local run, local import, remote import, and publish workflows.
- [x] Add explicit dry-run and verification support for remote D1 imports.
- [x] Replace static leaderboard sample data with D1-backed public leaderboard aggregation.
- [ ] Publish the first real run to remote D1.

## Phase 1 — credible evaluation core

- [x] Harden deterministic scoring with answer extraction, aliases, normalization, and unscorable handling.
- [x] Add sample validation tooling for ids, categories, accepted targets, and scoring metadata.
- [x] Add a sample template and authoring docs so new hand-written samples are easy to add correctly.
- [ ] Track cost, latency, errors, and scored-count quality signals in all public views.
- [ ] Keep benchmark suite provenance attached to every imported run.

## Phase 2 — operating quality

- [ ] Add CI for tests, typecheck, lint, Next build, OpenNext build, icon checks, and secret-pattern checks.
- [ ] Add run comparison and model-detail pages.
- [ ] Add CSV/JSON export for public results.
- [ ] Add clearer failure inspection for bad samples and bad model outputs.

## Phase 3 — public release

- [ ] Expand the curated Minecraft sample set by hand.
- [ ] Run and publish the cost-balanced evaluated matrix.
- [ ] Tag the first public release.
- [ ] Write methodology and launch notes.
