import { describe, expect, it } from "vitest";

import { runDetailToCsv, runDetailToJson } from "../app/api/runs/export";
import type { BenchmarkRunDetail } from "./db/benchmarks";

const detail: BenchmarkRunDetail = {
  run: {
    id: "benchmark_1",
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
    totalCost: 0.001,
    totalTokens: 10,
    meanLatencyMs: 100,
    suiteVersion: "0.1.0",
    suiteSampleCount: 1,
    suiteSampleHash: "hash",
    suiteSourcePath: "src/eval/fixtures/minecraft-core.ts",
    harnessVersion: "0.1.0",
    models: [],
  },
  results: [
    {
      id: "result_1",
      runId: "benchmark_1",
      suiteId: "minecraft-core",
      sampleId: "sample,1",
      modelId: "openai/gpt-5.5",
      output: "line one\nline two",
      extracted: "line one",
      scoreName: "includes-any",
      score: 1,
      scoreExplanation: "matched",
      error: null,
      latencyMs: 100,
      promptTokens: 4,
      completionTokens: 6,
      totalTokens: 10,
      cost: 0.001,
      upstreamInferenceCost: null,
      raw: null,
    },
  ],
};

describe("public run exports", () => {
  it("exports run detail as JSON", () => {
    expect(JSON.parse(runDetailToJson(detail))).toMatchObject({ run: { id: "benchmark_1" } });
  });

  it("exports run detail as escaped CSV", () => {
    const csv = runDetailToCsv(detail);
    expect(csv).toContain("run_id,suite_id,sample_id");
    expect(csv).toContain('"sample,1"');
    expect(csv).toContain('"line one\nline two"');
  });
});
