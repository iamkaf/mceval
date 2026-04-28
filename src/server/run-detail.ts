import type { BenchmarkRunDetail } from "./db/benchmarks";

export type LogoutForm = {
  action: string;
  body: string;
};

export type RunDetailRenderOptions = {
  detail: BenchmarkRunDetail;
  logout: LogoutForm;
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

function formatCost(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(6)}`;
}

function layout(title: string, body: string, logout: LogoutForm): string {
  const returnTo = parseReturnTo(logout.body);
  return `<!doctype html>
<html lang="en" data-mode="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; background: #05070a; color: #f4f7fb; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 48px 24px; }
    .card { border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 24px; margin-top: 18px; background: rgba(255,255,255,.04); overflow-x: auto; }
    .muted { color: rgba(244,247,251,.66); }
    a { color: #9bd3ff; }
    button { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 10px 16px; background: #f4f7fb; color: #05070a; font-weight: 650; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,.10); text-align: left; vertical-align: top; }
    code { color: #d7eaff; }
  </style>
</head>
<body>
  <main>
    <p><a href="/dashboard">← Dashboard</a></p>
    ${body}
    <section class="card">
      <form action="${escapeHtml(logout.action)}" method="post">
        <input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}" />
        <button type="submit">Log out</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}

export function renderRunDetailHtml(options: RunDetailRenderOptions): string {
  const { run, results } = options.detail;
  const rows = results
    .map(
      (result) => `<tr>
        <td>${escapeHtml(result.modelId)}</td>
        <td>${escapeHtml(result.sampleId)}</td>
        <td>${result.score === null ? "—" : result.score.toFixed(2)}</td>
        <td>${escapeHtml(result.extracted ?? "—")}</td>
        <td>${Math.round(result.latencyMs)}ms</td>
        <td>${formatCost(result.cost ?? result.upstreamInferenceCost)}</td>
        <td>${escapeHtml(result.error ?? result.output)}</td>
      </tr>`,
    )
    .join("");

  return layout(
    `MCEval ${run.id}`,
    `<h1>${escapeHtml(run.id)}</h1>
    <section class="card">
      <p class="muted">${escapeHtml(run.suiteName)}</p>
      <p>Accuracy: <strong>${formatAccuracy(run.accuracy)}</strong></p>
      <p>Total cost: <strong>${formatCost(run.totalCost)}</strong></p>
      <p>Models: ${run.modelCount} · Results: ${run.resultCount} · Errors: ${run.errorCount}</p>
    </section>
    <section class="card">
      <h2>Results</h2>
      <table>
        <thead><tr><th>Model</th><th>Sample</th><th>Score</th><th>Extracted</th><th>Latency</th><th>Cost</th><th>Output / Error</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`,
    options.logout,
  );
}

export function renderMissingRunHtml(runId: string, logout: LogoutForm): string {
  return layout(
    "Run not found",
    `<section class="card"><h1>Run not found</h1><p>No imported benchmark run matched <code>${escapeHtml(runId)}</code>.</p></section>`,
    logout,
  );
}
