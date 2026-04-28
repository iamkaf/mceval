import { describe, expect, it } from "vitest";

import type { BenchmarkSuite, EvalModel } from "./schema";
import { runEvalSuite } from "./runner";
import { includesScorer } from "./scorer";

const suite: BenchmarkSuite = {
  id: "minecraft-core",
  name: "Minecraft Core Bench",
  samples: [
    {
      id: "knowledge-001",
      input: "Which update added the Nether?",
      target: "Alpha 1.2.0",
      metadata: { category: "knowledge" },
    },
  ],
};

const model: EvalModel = {
  provider: "OpenAI",
  modelId: "openai/gpt-4.1-mini",
  displayName: "GPT-4.1 Mini",
  temperature: 0,
  maxTokens: 512,
};

describe("runner harness spine", () => {
  it("passes samples to callers and records scorer details", async () => {
    const results = await runEvalSuite({
      suite,
      models: [model],
      runId: "run_1",
      scorer: includesScorer,
      callModel: async ({ sample, prompt, model: calledModel }) => ({
        text: `${prompt} Alpha 1.2.0`,
        latencyMs: 42,
        modelId: calledModel.modelId,
        raw: { id: "raw-response" },
        usage: { totalTokens: 8 },
        messages: [{ role: "user", content: sample.input }],
      }),
    });

    expect(results).toEqual([
      {
        runId: "run_1",
        modelId: "openai/gpt-4.1-mini",
        sampleId: "knowledge-001",
        output: "Which update added the Nether? Alpha 1.2.0",
        extracted: "which update added the nether? alpha 1.2.0",
        latencyMs: 42,
        usage: { totalTokens: 8 },
        score: {
          name: "includes",
          score: 1,
          extracted: "which update added the nether? alpha 1.2.0",
          explanation: "normalized substring match",
        },
        raw: { id: "raw-response" },
      },
    ]);
  });
});
