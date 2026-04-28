import { describe, expect, it } from "vitest";

import {
  benchmarkSuiteSchema,
  evalModelSchema,
  evalResultSchema,
  evalRunSchema,
} from "./schema";

describe("eval schemas", () => {
  it("accepts a benchmark suite with samples", () => {
    const suite = benchmarkSuiteSchema.parse({
      id: "knowledge",
      name: "Knowledge Bench",
      description: "Minecraft features, dates, Mojang",
      samples: [
        {
          id: "knowledge-001",
          input: "Which update added the Nether?",
          target: "Alpha 1.2.0",
          metadata: { category: "release-history" },
        },
      ],
    });

    expect(suite.samples).toHaveLength(1);
    expect(suite.samples[0]?.id).toBe("knowledge-001");
  });

  it("rejects a suite without samples", () => {
    expect(() =>
      benchmarkSuiteSchema.parse({
        id: "knowledge",
        name: "Knowledge Bench",
        samples: [],
      }),
    ).toThrow();
  });

  it("applies model defaults", () => {
    const model = evalModelSchema.parse({
      provider: "OpenAI",
      modelId: "openai/gpt-4.1-mini",
      displayName: "GPT-4.1 Mini",
    });

    expect(model.temperature).toBe(0);
    expect(model.maxTokens).toBe(512);
  });

  it("accepts run and result records", () => {
    const run = evalRunSchema.parse({
      id: "run_1",
      suiteId: "knowledge",
      modelId: "openai/gpt-4.1-mini",
      status: "complete",
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:01:00.000Z",
      completedAt: "2026-04-28T00:01:00.000Z",
    });

    const result = evalResultSchema.parse({
      runId: run.id,
      modelId: run.modelId,
      sampleId: "knowledge-001",
      output: "Alpha 1.2.0 added the Nether.",
      extracted: "alpha 1.2.0 added the nether.",
      latencyMs: 250,
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
      score: { name: "includes", score: 1 },
    });

    expect(result.score.score).toBe(1);
  });
});
