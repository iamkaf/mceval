import { describe, expect, it } from "vitest";

import type { EvalModel, EvalSample } from "./schema";
import { runEvalCase, runEvalSuite } from "./runner";
import { scoreCaseOutput } from "./scoring";

const model: EvalModel = {
  provider: "OpenAI",
  modelId: "openai/gpt-4.1-mini",
  displayName: "GPT-4.1 Mini",
  temperature: 0,
  maxTokens: 512,
};

const sample: EvalSample = {
  id: "knowledge-001",
  input: "Which update added the Nether?",
  target: "Alpha 1.2.0",
};

describe("scoring", () => {
  it("scores exact and contained target answers", () => {
    expect(scoreCaseOutput(sample, "Alpha 1.2.0")).toBe(1);
    expect(scoreCaseOutput(sample, "The Nether was added in Alpha 1.2.0.")).toBe(1);
  });

  it("returns zero for missing target text and null for unscored samples", () => {
    expect(scoreCaseOutput(sample, "Beta 1.8")).toBe(0);
    expect(scoreCaseOutput({ ...sample, target: undefined }, "Anything")).toBeNull();
  });
});

describe("eval runner", () => {
  it("runs a sample through an injected model caller", async () => {
    const result = await runEvalCase({
      sample,
      model,
      callModel: async ({ prompt }) => ({
        text: `${prompt} Alpha 1.2.0`,
        latencyMs: 42,
        modelId: "openai/gpt-4.1-mini-20260401",
        usage: { promptTokens: 4, completionTokens: 4, totalTokens: 8 },
      }),
      runId: "run_1",
    });

    expect(result).toMatchObject({
      runId: "run_1",
      modelId: "openai/gpt-4.1-mini",
      sampleId: "knowledge-001",
      latencyMs: 42,
      score: { score: 1 },
    });
  });

  it("continues a suite when one sample fails", async () => {
    const results = await runEvalSuite({
      suite: {
        id: "knowledge",
        name: "Knowledge Bench",
        samples: [
          sample,
          { ...sample, id: "knowledge-002", input: "fail this" },
        ],
      },
      models: [model],
      runId: "run_1",
      callModel: async ({ prompt }) => {
        if (prompt === "fail this") {
          throw new Error("provider exploded");
        }

        return { text: "Alpha 1.2.0", latencyMs: 12, modelId: model.modelId };
      },
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.error).toBeUndefined();
    expect(results[1]?.error).toMatch(/provider exploded/);
    expect(results[1]?.score.score).toBeNull();
  });
});
