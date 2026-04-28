import { OpenRouter } from "@openrouter/sdk";

import type { TokenUsage } from "@/eval/schema";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterChatClient = {
  chat: {
    send: (request: {
      chatRequest: {
        model: string;
        messages: ChatMessage[];
        stream?: false;
        temperature?: number;
        maxTokens?: number;
        seed?: number;
      };
      httpReferer?: string;
      appTitle?: string;
    }) => Promise<unknown>;
  };
};

export type RunOpenRouterChatInput = {
  client: OpenRouterChatClient;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  seed?: number;
};

export type OpenRouterChatResult = {
  text: string;
  modelId: string;
  latencyMs: number;
  usage?: TokenUsage;
  raw: unknown;
};

export function createOpenRouterClient({ apiKey }: { apiKey: string }) {
  return new OpenRouter({
    apiKey,
    appTitle: "MCEval",
    httpReferer: "https://mceval.kaf.sh",
  }) as OpenRouterChatClient;
}

export async function runOpenRouterChat({
  client,
  model,
  messages,
  temperature,
  maxTokens,
  seed,
}: RunOpenRouterChatInput): Promise<OpenRouterChatResult> {
  const start = performance.now();
  const raw = await client.chat.send({
    chatRequest: {
      model,
      messages,
      stream: false,
      temperature,
      maxTokens,
      seed,
    },
    httpReferer: "https://mceval.kaf.sh",
    appTitle: "MCEval",
  });
  const latencyMs = Math.round(performance.now() - start);
  const normalized = normalizeChatResult(raw, model);

  if (!normalized.text.trim()) {
    throw new Error(`OpenRouter returned an empty response for ${model}`);
  }

  return {
    ...normalized,
    latencyMs,
    raw,
  };
}

function normalizeChatResult(
  raw: unknown,
  fallbackModel: string,
): Pick<OpenRouterChatResult, "text" | "modelId" | "usage"> {
  const result = raw as {
    model?: string;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      cost?: number;
      costDetails?: {
        upstreamInferenceCost?: number;
        upstreamInferencePromptCost?: number;
        upstreamInferenceCompletionsCost?: number;
      };
      cost_details?: {
        upstream_inference_cost?: number;
        upstream_inference_prompt_cost?: number;
        upstream_inference_completions_cost?: number;
      };
    };
  };

  const content = result.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  const costDetails = result.usage?.costDetails;
  const snakeCostDetails = result.usage?.cost_details;
  const usage = result.usage
    ? {
        promptTokens: result.usage.promptTokens ?? result.usage.prompt_tokens,
        completionTokens:
          result.usage.completionTokens ?? result.usage.completion_tokens,
        totalTokens: result.usage.totalTokens ?? result.usage.total_tokens,
        cost: result.usage.cost,
        upstreamInferenceCost:
          costDetails?.upstreamInferenceCost ??
          snakeCostDetails?.upstream_inference_cost,
        upstreamInferencePromptCost:
          costDetails?.upstreamInferencePromptCost ??
          snakeCostDetails?.upstream_inference_prompt_cost,
        upstreamInferenceCompletionsCost:
          costDetails?.upstreamInferenceCompletionsCost ??
          snakeCostDetails?.upstream_inference_completions_cost,
      }
    : undefined;

  return {
    text,
    modelId: result.model ?? fallbackModel,
    usage,
  };
}
