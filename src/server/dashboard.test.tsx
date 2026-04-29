import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardView } from "../app/dashboard/_components/dashboard-view";

const auth = {
  result: {
    authenticated: true as const,
    user: {
      userId: "discord-user-1",
      displayName: "Kaf <admin>",
      username: "kaf",
      avatarUrl: null,
    },
    session: {
      sessionId: "session-1",
      tokenFamilyId: "family-1",
      issuedAt: 100,
      idleExpiresAt: 200,
      absoluteExpiresAt: 300,
    },
  },
};

const logout = {
  action: "https://auth.kaf.sh/logout",
  body: "returnTo=https%3A%2F%2Fmceval.kaf.sh%2F",
};

function renderDashboard(runs: React.ComponentProps<typeof DashboardView>["runs"]): string {
  return renderToStaticMarkup(
    <DashboardView auth={auth} logout={logout} runs={runs} leaderboard={[]} latestRunDetail={null} />,
  );
}

describe("dashboard view", () => {
  it("renders the authenticated user and Uriel logout form", () => {
    const html = renderDashboard([]);

    expect(html).toContain("MCEval Dashboard");
    expect(html).toContain("Kaf &lt;admin&gt;");
    expect(html).toContain('action="https://auth.kaf.sh/logout"');
    expect(html).toContain('name="returnTo"');
    expect(html).toContain('value="https://mceval.kaf.sh/"');
  });

  it("renders an empty benchmark state with the import command", () => {
    const html = renderDashboard([]);

    expect(html).toContain("No benchmark runs imported yet");
    expect(html).toContain("corepack pnpm run eval:import-run .mceval/runs/&lt;runId&gt;.json");
  });

  it("renders imported benchmark runs", () => {
    const html = renderDashboard([
      {
        id: "benchmark_<1>",
        suiteId: "minecraft-core",
        suiteName: "Minecraft Core Bench",
        startedAt: "2026-04-28T00:00:00.000Z",
        completedAt: "2026-04-28T00:01:00.000Z",
        modelCount: 2,
        resultCount: 8,
        scoredCount: 8,
        errorCount: 0,
        accuracy: 0.875,
        meanScore: 0.875,
        totalCost: 0.0063,
        totalTokens: 1200,
        meanLatencyMs: 1200,
        suiteVersion: "0.1.0",
        suiteSampleCount: 4,
        suiteSampleHash: "hash123",
        suiteSourcePath: "src/eval/fixtures/minecraft-core.ts",
        harnessVersion: "0.1.0",
        models: [],
      },
    ]);

    expect(html).toContain("Minecraft Core Bench");
    expect(html).toContain("87.5%");
    expect(html).toContain("$0.006300");
    expect(html).toContain('/dashboard/runs/benchmark_%3C1%3E');
    expect(html).toContain("benchmark_&lt;1&gt;");
  });
});
