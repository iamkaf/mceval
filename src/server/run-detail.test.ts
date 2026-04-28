import { describe, expect, it } from "vitest";

import { renderMissingRunHtml, renderRunDetailHtml } from "./run-detail";

const logout = {
  action: "https://auth.kaf.sh/logout",
  body: "returnTo=https%3A%2F%2Fmceval.kaf.sh%2F",
};

const detail = {
  run: {
    id: "benchmark_<1>",
    suiteId: "minecraft-core",
    suiteName: "Minecraft Core Bench",
    startedAt: "2026-04-28T00:00:00.000Z",
    completedAt: "2026-04-28T00:01:00.000Z",
    modelCount: 1,
    resultCount: 1,
    errorCount: 0,
    accuracy: 1,
    totalCost: 0.0001,
    meanLatencyMs: 1000,
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

describe("run detail rendering", () => {
  it("renders benchmark run detail and escapes result output", () => {
    const html = renderRunDetailHtml({ detail, logout });

    expect(html).toContain("benchmark_&lt;1&gt;");
    expect(html).toContain("Minecraft Core Bench");
    expect(html).toContain("knowledge-&lt;001&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("100.0%");
    expect(html).toContain("$0.000100");
  });

  it("renders a safe missing run page", () => {
    const html = renderMissingRunHtml("missing_<run>", logout);

    expect(html).toContain("Run not found");
    expect(html).toContain("missing_&lt;run&gt;");
    expect(html).toContain("/dashboard");
  });
});
