import { describe, expect, it } from "vitest";

import type { RunLog } from "./run-log";
import { summarizeModelComparisons } from "./run-summary";

const baseLog: RunLog = {
  id: "run_1",
  suite: { id: "minecraft-core", name: "Minecraft Core Bench", sampleCount: 2 },
  models: [
    { provider: "OpenRouter", modelId: "model-a", displayName: "model-a", temperature: 0, maxTokens: 512 },
    { provider: "OpenRouter", modelId: "model-b", displayName: "model-b", temperature: 0, maxTokens: 512 },
  ],
  startedAt: "2026-04-28T00:00:00.000Z",
  completedAt: "2026-04-28T00:00:01.000Z",
  harnessVersion: "0.1.0",
  metrics: {
    count: 4,
    scoredCount: 4,
    errorCount: 0,
    accuracy: 0.75,
    meanScore: 0.75,
    meanLatencyMs: 100,
    totalTokens: 40,
    promptTokens: 20,
    completionTokens: 20,
    totalCost: 0.04,
    upstreamInferenceCost: 0.03,
  },
  results: [
    result("model-a", "sample-1", 1, 100, 0.01),
    result("model-a", "sample-2", 0, 300, 0.02),
    result("model-b", "sample-1", 1, 50, 0.005),
    result("model-b", "sample-2", 1, 70, 0.005),
  ],
};

describe("run summary", () => {
  it("summarizes accuracy, cost, latency, and failed samples per model", () => {
    expect(summarizeModelComparisons(baseLog)).toEqual([
      {
        modelId: "model-a",
        accuracy: 0.5,
        cost: 0.03,
        meanLatencyMs: 200,
        failedSampleIds: ["sample-2"],
      },
      {
        modelId: "model-b",
        accuracy: 1,
        cost: 0.01,
        meanLatencyMs: 60,
        failedSampleIds: [],
      },
    ]);
  });
});

function result(modelId: string, sampleId: string, score: number, latencyMs: number, cost: number) {
  return {
    runId: "run_1",
    modelId,
    sampleId,
    output: "output",
    latencyMs,
    usage: { cost },
    score: { name: "includesAny", score },
  };
}
