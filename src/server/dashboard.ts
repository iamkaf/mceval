import type { AuthenticatedSessionResult } from "@iamkaf/uriel";

import type { BenchmarkRunSummary } from "./db/benchmarks";

export type DashboardRenderOptions = {
  auth: {
    result: AuthenticatedSessionResult;
  };
  logout: {
    action: string;
    body: string;
  };
  runs: BenchmarkRunSummary[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseReturnTo(body: string): string {
  return new URLSearchParams(body).get("returnTo") ?? "/";
}

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(6)}`;
}

function renderRuns(runs: BenchmarkRunSummary[]): string {
  if (runs.length === 0) {
    return `<section class="card">
      <h2>No benchmark runs imported yet</h2>
      <p class="muted">Run a benchmark from the CLI, then import the run log into D1.</p>
      <pre>corepack pnpm run eval:import-run .mceval/runs/&lt;runId&gt;.json</pre>
    </section>`;
  }

  return `<section class="card">
    <h2>Recent benchmark runs</h2>
    <table>
      <thead><tr><th>Run</th><th>Suite</th><th>Models</th><th>Accuracy</th><th>Cost</th><th>Latency</th></tr></thead>
      <tbody>${runs.map(renderRunRow).join("")}</tbody>
    </table>
  </section>`;
}

function renderRunRow(run: BenchmarkRunSummary): string {
  const href = `/dashboard/runs/${encodeURIComponent(run.id)}`;
  return `<tr>
    <td><a href="${href}">${escapeHtml(run.id)}</a></td>
    <td>${escapeHtml(run.suiteName)}</td>
    <td>${run.modelCount}</td>
    <td>${formatAccuracy(run.accuracy)}</td>
    <td>${formatCost(run.totalCost)}</td>
    <td>${run.meanLatencyMs === null ? "—" : `${Math.round(run.meanLatencyMs)}ms`}</td>
  </tr>`;
}

export function renderDashboardHtml(options: DashboardRenderOptions): string {
  const user = options.auth.result.user;
  const returnTo = parseReturnTo(options.logout.body);

  return `<!doctype html>
<html lang="en" data-mode="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MCEval Dashboard</title>
  <style>
    body { margin: 0; min-height: 100vh; background: #05070a; color: #f4f7fb; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 1120px; margin: 0 auto; padding: 48px 24px; }
    .card { border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 24px; margin-top: 18px; background: rgba(255,255,255,.04); overflow-x: auto; }
    .muted { color: rgba(244,247,251,.66); }
    a { color: #9bd3ff; }
    button { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 10px 16px; background: #f4f7fb; color: #05070a; font-weight: 650; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,.10); text-align: left; }
    pre { white-space: pre-wrap; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 12px; background: rgba(0,0,0,.28); }
  </style>
</head>
<body>
  <main>
    <p class="muted">Authenticated via Uriel</p>
    <h1>MCEval Dashboard</h1>
    <section class="card">
      <p class="muted">Signed in as</p>
      <h2>${escapeHtml(user.displayName)}</h2>
      <p class="muted">Read-only benchmark operations. Runs are imported from CLI artifacts into D1; the browser does not execute evals.</p>
      <form action="${escapeHtml(options.logout.action)}" method="post">
        <input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}" />
        <button type="submit">Log out</button>
      </form>
    </section>
    ${renderRuns(options.runs)}
  </main>
</body>
</html>`;
}
