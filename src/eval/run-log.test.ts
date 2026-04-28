import { describe, expect, it } from "vitest";

import { createRunLog } from "./run-log";
import type { BenchmarkSuite, EvalModel, EvalResult } from "./schema";

const suite: BenchmarkSuite = {
  id: "minecraft-core",
  name: "Minecraft Core Bench",
  samples: [
    {
      id: "sample-1",
      input: "Which update added the Nether?",
      target: "Alpha 1.2.0",
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

const results: EvalResult[] = [
  {
    runId: "run_1",
    modelId: "openai/gpt-4.1-mini",
    sampleId: "sample-1",
    output: "Alpha 1.2.0",
    extracted: "alpha 1.2.0",
    latencyMs: 42,
    score: { name: "includes", score: 1 },
    raw: { model: "openai/gpt-4.1-mini" },
  },
];

describe("run logs", () => {
  it("creates a reproducible log with suite, model, params, metrics, and raw result data", () => {
    const log = createRunLog({
      runId: "run_1",
      suite,
      models: [model],
      results,
      startedAt: "2026-04-28T00:00:00.000Z",
      completedAt: "2026-04-28T00:00:01.000Z",
      harnessVersion: "0.1.0-test",
    });

    expect(log).toMatchObject({
      id: "run_1",
      suite: { id: "minecraft-core", sampleCount: 1 },
      models: [{ modelId: "openai/gpt-4.1-mini", temperature: 0, maxTokens: 512 }],
      metrics: { count: 1, accuracy: 1, totalTokens: 0 },
      results,
      harnessVersion: "0.1.0-test",
    });
  });
});
