import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardShell } from "../app/dashboard/_components/dashboard-shell";
import { ModelsView } from "../app/dashboard/_components/models-view";
import { QualityView } from "../app/dashboard/_components/quality-view";
import { RunsView } from "../app/dashboard/_components/runs-view";
import { SuitesView } from "../app/dashboard/_components/suites-view";

const user = {
  userId: "user_1",
  username: "test-admin",
  displayName: "Test Admin",
  avatarUrl: null,
};

describe("dashboard views", () => {
  it("renders the dashboard shell navigation", () => {
    const html = renderToStaticMarkup(
      <DashboardShell user={user} logout={{ action: "/logout", body: "returnTo=%2Fdashboard" }}>
        <div>Shell content</div>
      </DashboardShell>,
    );

    expect(html).toContain("MCEval");
    expect(html).toContain("Suites");
    expect(html).toContain("Runs");
    expect(html).toContain("Test Admin");
    expect(html).toContain("Shell content");
  });

  it("renders suite management without mock data", () => {
    const html = renderToStaticMarkup(<SuitesView suites={[]} versions={[]} drafts={[]} />);

    expect(html).toContain("Author, version, and publish benchmark suites.");
    expect(html).toContain("No suites found.");
    expect(html).not.toContain("MCKnowledgeDraft1");
  });

  it("renders run creation and recent runs", () => {
    const html = renderToStaticMarkup(
      <RunsView
        latestAccuracy={0.75}
        suiteVersions={[
          {
            id: "suite_version_1",
            suiteId: "suite_knowledge",
            suiteKey: "knowledge",
            suiteName: "Minecraft Feature and History Knowledge",
            humanName: "MCHistory1",
            status: "ready",
            sampleCount: 1,
            suiteHash: "hash",
            createdAt: "2026-04-29T00:00:00.000Z",
            publishedAt: null,
          },
        ]}
        runs={[
          {
            id: "benchmark_1",
            status: "completed",
            suiteId: "knowledge",
            suiteName: "Minecraft Feature and History Knowledge",
            startedAt: "2026-04-29T00:00:00.000Z",
            completedAt: "2026-04-29T00:01:00.000Z",
            modelCount: 1,
            resultCount: 1,
            scoredCount: 1,
            errorCount: 0,
            accuracy: 1,
            meanScore: 1,
            totalCost: 0.001,
            totalTokens: 10,
            meanLatencyMs: 1000,
            suiteVersion: "MCHistory1",
            suiteSampleCount: 1,
            suiteSampleHash: "hash",
            suiteSourcePath: "d1:suite_versions",
            harnessVersion: "cloud-v1",
            models: [],
          },
        ]}
      />,
    );

    expect(html).toContain("Benchmark execution history and queue management.");
    expect(html).toContain("benchmark_1");
    expect(html).toContain("100.0%");
    expect(html).toContain("New run");
  });

  it("renders model leaderboard view", () => {
    const html = renderToStaticMarkup(
      <ModelsView
        leaderboard={[
          {
            modelId: "openai/gpt-5.5",
            scoredCount: 1,
            errorCount: 0,
            meanScore: 1,
            accuracy: 1,
            meanLatencyMs: 1000,
            totalCost: 0.001,
          },
        ]}
      />,
    );

    expect(html).toContain("Leaderboard and cost-performance analysis.");
    expect(html).toContain("GPT-5.5");
    expect(html).toContain("$0.001000");
  });

  it("renders quality rates for runs without results", () => {
    const run = {
      id: "benchmark_empty",
      status: "queued",
      suiteId: "knowledge",
      suiteName: "Minecraft Feature and History Knowledge",
      startedAt: "2026-04-29T00:00:00.000Z",
      completedAt: "2026-04-29T00:00:00.000Z",
      modelCount: 0,
      resultCount: 0,
      scoredCount: 0,
      errorCount: 0,
      accuracy: null,
      meanScore: null,
      totalCost: 0,
      totalTokens: 0,
      meanLatencyMs: null,
      suiteVersion: "MCHistory1",
      suiteSampleCount: 0,
      suiteSampleHash: "hash",
      suiteSourcePath: "d1:suite_versions",
      harnessVersion: "cloud-v1",
      models: [],
    };

    const html = renderToStaticMarkup(
      <QualityView runs={[run]} runDetail={{ run, results: [] }} />,
    );

    expect(html).toContain("Error rate");
    expect(html).toContain("Unscored rate");
    expect(html).not.toContain("NaN");
  });
});
