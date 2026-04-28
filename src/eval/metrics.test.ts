import { describe, expect, it } from "vitest";

import { aggregateMetrics } from "./metrics";
import type { EvalResult } from "./schema";

const results: EvalResult[] = [
  {
    runId: "run_1",
    modelId: "test-model",
    sampleId: "sample-1",
    output: "A",
    extracted: "a",
    latencyMs: 100,
    usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5, cost: 0.01, upstreamInferenceCost: 0.008 },
    score: { name: "exact", score: 1 },
  },
  {
    runId: "run_1",
    modelId: "test-model",
    sampleId: "sample-2",
    output: "B",
    extracted: "b",
    latencyMs: 300,
    usage: { promptTokens: 4, completionTokens: 6, totalTokens: 10, cost: 0.02, upstreamInferenceCost: 0.016 },
    score: { name: "exact", score: 0 },
  },
  {
    runId: "run_1",
    modelId: "test-model",
    sampleId: "sample-3",
    output: "",
    latencyMs: 0,
    score: { name: "exact", score: null },
    error: "provider failed",
  },
];

describe("metrics", () => {
  it("aggregates score, error, latency, and token metrics", () => {
    expect(aggregateMetrics(results)).toEqual({
      count: 3,
      scoredCount: 2,
      errorCount: 1,
      accuracy: 0.5,
      meanScore: 0.5,
      meanLatencyMs: 200,
      totalTokens: 15,
      promptTokens: 6,
      completionTokens: 9,
      totalCost: 0.03,
      upstreamInferenceCost: 0.024,
    });
  });
});
