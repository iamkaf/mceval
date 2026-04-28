import { describe, expect, it } from "vitest";

import { buildBenchmarkRunSummary } from "./benchmark-summary";
import type { RunLog } from "./run-log";

const log: RunLog = {
  id: "benchmark_123",
  suite: { id: "minecraft-core", name: "Minecraft Core Bench", sampleCount: 1 },
  models: [{ provider: "OpenRouter", modelId: "model-a", displayName: "model-a", temperature: 0, maxTokens: 512 }],
  startedAt: "2026-04-28T00:00:00.000Z",
  completedAt: "2026-04-28T00:00:01.000Z",
  harnessVersion: "0.1.0",
  metrics: {
    count: 1,
    scoredCount: 1,
    errorCount: 0,
    accuracy: 1,
    meanScore: 1,
    meanLatencyMs: 42,
    totalTokens: 12,
    promptTokens: 6,
    completionTokens: 6,
    totalCost: 0.001,
    upstreamInferenceCost: 0.0008,
  },
  results: [
    {
      runId: "benchmark_123",
      modelId: "model-a",
      sampleId: "knowledge-001",
      output: "output",
      latencyMs: 42,
      usage: { totalTokens: 12, cost: 0.001 },
      score: { name: "includesAny", score: 1 },
    },
  ],
};

describe("benchmark summary", () => {
  it("builds the canonical JSON summary for benchmark runs", () => {
    expect(buildBenchmarkRunSummary(log, ".mceval/runs/benchmark_123.json")).toEqual({
      runId: "benchmark_123",
      logPath: ".mceval/runs/benchmark_123.json",
      suite: "minecraft-core",
      suiteVersion: undefined,
      sampleHash: undefined,
      models: ["model-a"],
      samples: 1,
      results: 1,
      errors: 0,
      accuracy: 1,
      meanLatencyMs: 42,
      totalTokens: 12,
      totalCost: 0.001,
      comparisons: [
        {
          modelId: "model-a",
          accuracy: 1,
          cost: 0.001,
          meanLatencyMs: 42,
          failedSampleIds: [],
        },
      ],
    });
  });
});
