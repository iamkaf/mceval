import type { AuthenticatedSessionResult } from "@iamkaf/uriel";

export type DashboardRenderOptions = {
  auth: {
    result: AuthenticatedSessionResult;
  };
  logout: {
    action: string;
    body: string;
  };
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
    main { max-width: 960px; margin: 0 auto; padding: 48px 24px; }
    .card { border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 24px; background: rgba(255,255,255,.04); }
    .muted { color: rgba(244,247,251,.66); }
    button { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 10px 16px; background: #f4f7fb; color: #05070a; font-weight: 650; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <p class="muted">Authenticated via Uriel</p>
    <h1>MCEval Dashboard</h1>
    <section class="card">
      <p class="muted">Signed in as</p>
      <h2>${escapeHtml(user.displayName)}</h2>
      <p class="muted">Dashboard wiring is intentionally minimal. Benchmark operations remain CLI-first until the admin UI earns its keep.</p>
      <form action="${escapeHtml(options.logout.action)}" method="post">
        <input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}" />
        <button type="submit">Log out</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}
