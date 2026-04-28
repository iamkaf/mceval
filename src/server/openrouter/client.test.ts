import { describe, expect, it, vi } from "vitest";

import { createOpenRouterClient, runOpenRouterChat } from "./client";

describe("OpenRouter client", () => {
  it("creates a client with MCEval attribution", () => {
    const client = createOpenRouterClient({ apiKey: "test-key" });

    expect(client).toBeDefined();
  });

  it("normalizes chat completions", async () => {
    const send = vi.fn().mockResolvedValue({
      model: "openai/gpt-4.1-mini",
      choices: [{ message: { content: "Alpha 1.2.0" } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        cost: 0.0015,
        costDetails: {
          upstreamInferenceCost: 0.0012,
          upstreamInferencePromptCost: 0.0004,
          upstreamInferenceCompletionsCost: 0.0008,
        },
      },
    });

    const result = await runOpenRouterChat({
      client: { chat: { send } },
      model: "openai/gpt-4.1-mini",
      messages: [{ role: "user", content: "Which update added the Nether?" }],
      temperature: 0,
      maxTokens: 64,
    });

    expect(send).toHaveBeenCalledWith({
      chatRequest: {
        model: "openai/gpt-4.1-mini",
        messages: [{ role: "user", content: "Which update added the Nether?" }],
        stream: false,
        temperature: 0,
        maxTokens: 64,
      },
      httpReferer: "https://mceval.kaf.sh",
      appTitle: "MCEval",
    });
    expect(result.text).toBe("Alpha 1.2.0");
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      cost: 0.0015,
      upstreamInferenceCost: 0.0012,
      upstreamInferencePromptCost: 0.0004,
      upstreamInferenceCompletionsCost: 0.0008,
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("throws a useful error for empty completions", async () => {
    await expect(
      runOpenRouterChat({
        client: {
          chat: {
            send: async () => ({ choices: [{ message: { content: "" } }] }),
          },
        },
        model: "openai/gpt-4.1-mini",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow(/empty response/i);
  });
});
