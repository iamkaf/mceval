import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MissingRunView, RunDetailView } from "../app/dashboard/_components/run-detail-view";

const detail = {
  run: {
    id: "benchmark_<1>",
    status: "completed",
    suiteId: "minecraft-core",
    suiteName: "Minecraft Core Bench",
    startedAt: "2026-04-28T00:00:00.000Z",
    completedAt: "2026-04-28T00:01:00.000Z",
    modelCount: 1,
    resultCount: 1,
    scoredCount: 1,
    errorCount: 0,
    accuracy: 1,
    meanScore: 1,
    totalCost: 0.0001,
    totalTokens: 22,
    meanLatencyMs: 1000,
    suiteVersion: "0.1.0",
    suiteSampleCount: 1,
    suiteSampleHash: "hash123",
    suiteSourcePath: "src/eval/fixtures/minecraft-core.ts",
    harnessVersion: "0.1.0",
    models: [],
  },
  results: [
    {
      id: "result-1",
      runId: "benchmark_<1>",
      suiteId: "minecraft-core",
      sampleId: "knowledge-<001>",
      modelId: "openai/gpt-5.4-mini",
      output: "<script>alert(1)</script>",
      extracted: "Halloween Update",
      scoreName: "includes-any",
      score: 1,
      scoreExplanation: "matched",
      error: null,
      latencyMs: 1000,
      promptTokens: 10,
      completionTokens: 12,
      totalTokens: 22,
      cost: 0.0001,
      upstreamInferenceCost: null,
      raw: null,
    },
  ],
};

describe("run detail view", () => {
  it("renders benchmark run detail and escapes result output", () => {
    const html = renderToStaticMarkup(<RunDetailView detail={detail} />);

    expect(html).toContain("benchmark_&lt;1&gt;");
    expect(html).toContain("Minecraft Core Bench");
    expect(html).toContain("knowledge-&lt;001&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("100.0%");
    expect(html).toContain("$0.000100");
  });

  it("renders a safe missing run page", () => {
    const html = renderToStaticMarkup(<MissingRunView runId="missing_<run>" />);

    expect(html).toContain("Run not found");
    expect(html).toContain("missing_&lt;run&gt;");
    expect(html).toContain("/dashboard");
  });
});
