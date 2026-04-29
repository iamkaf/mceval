import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModelDetailView } from "../app/models/[modelId]/model-detail-view";
import { CompareRunsView } from "../app/runs/compare/compare-runs-view";
import { ExportLinks } from "../app/runs/export-links";
import type { BenchmarkRunDetail, BenchmarkRunSummary, ModelBenchmarkHistory } from "./db/benchmarks";

const run: BenchmarkRunSummary = {
  id: "benchmark_1",
  suiteId: "minecraft-core",
  suiteName: "Minecraft Core Bench",
  startedAt: "2026-04-28T00:00:00.000Z",
  completedAt: "2026-04-28T00:01:00.000Z",
  modelCount: 2,
  resultCount: 4,
  scoredCount: 4,
  errorCount: 1,
  accuracy: 0.75,
  meanScore: 0.75,
  totalCost: 0.006,
  totalTokens: 1200,
  meanLatencyMs: 1500,
  suiteVersion: "0.1.0",
  suiteSampleCount: 4,
  suiteSampleHash: "abc123",
  suiteSourcePath: "src/eval/fixtures/minecraft-core.ts",
  harnessVersion: "0.1.0",
  models: [],
};

const detail: BenchmarkRunDetail = {
  run,
  results: [
    {
      id: "result_1",
      runId: "benchmark_1",
      suiteId: "minecraft-core",
      sampleId: "knowledge-001",
      modelId: "openai/gpt-5.5",
      output: "wrong output",
      extracted: null,
      scoreName: "includes-any",
      score: null,
      scoreExplanation: "unscorable",
      error: "model timeout",
      latencyMs: 1500,
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      cost: 0.001,
      upstreamInferenceCost: 0.001,
      raw: null,
    },
  ],
};

const history: ModelBenchmarkHistory = {
  modelId: "openai/gpt-5.5",
  runs: [{ ...run, accuracy: 0.75, totalCost: 0.001, meanLatencyMs: 1500 }],
  results: detail.results,
};

describe("public result views", () => {
  it("renders run comparison with quality signals and provenance", () => {
    const html = renderToStaticMarkup(<CompareRunsView runs={[run]} />);

    expect(html).toContain("Run comparison");
    expect(html).toContain("75.0%");
    expect(html).toContain("$0.006000");
    expect(html).toContain("1,500ms");
    expect(html).toContain("abc123");
  });

  it("renders model detail with bad output inspection", () => {
    const html = renderToStaticMarkup(<ModelDetailView history={history} />);

    expect(html).toContain("openai/gpt-5.5");
    expect(html).toContain("model timeout");
    expect(html).toContain("wrong output");
    expect(html).toContain("knowledge-001");
  });

  it("renders public export links", () => {
    const html = renderToStaticMarkup(<ExportLinks runId="benchmark_1" />);

    expect(html).toContain("/api/runs/benchmark_1.json");
    expect(html).toContain("/api/runs/benchmark_1.csv");
  });
});
