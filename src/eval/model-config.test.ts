import { describe, expect, it } from "vitest";

import { parseEvalModels } from "./model-config";

describe("model config", () => {
  it("parses a comma-separated MODEL_IDS matrix", () => {
    const models = parseEvalModels({
      MODEL_IDS: "openai/gpt-5.4-mini, anthropic/claude-sonnet-4.5",
      TEMPERATURE: "0.2",
      MAX_TOKENS: "256",
    });

    expect(models).toEqual([
      {
        provider: "OpenRouter",
        modelId: "openai/gpt-5.4-mini",
        displayName: "openai/gpt-5.4-mini",
        temperature: 0.2,
        maxTokens: 256,
      },
      {
        provider: "OpenRouter",
        modelId: "anthropic/claude-sonnet-4.5",
        displayName: "anthropic/claude-sonnet-4.5",
        temperature: 0.2,
        maxTokens: 256,
      },
    ]);
  });

  it("falls back to MODEL_ID for one-model benchmark runs", () => {
    expect(parseEvalModels({ MODEL_ID: "openai/gpt-5.4-mini" })).toHaveLength(1);
  });

  it("uses the evaluated default model set when requested", () => {
    const models = parseEvalModels({ MODEL_SET: "default" });

    expect(models.length).toBeGreaterThan(1);
    expect(models).toContainEqual(
      expect.objectContaining({
        provider: "Alibaba",
        modelId: "qwen/qwen3.6-max-preview",
        displayName: "Qwen3.6 Max Preview",
      }),
    );
  });
});
