export type EvaluatedModel = {
  provider: string;
  displayName: string;
  modelId: string;
  slug: string;
  icon: string;
  iconAlt: string;
  temperature: number;
  maxTokens: number;
};

export const evaluatedModels = [
  {
    provider: "OpenAI",
    displayName: "GPT-5.5",
    modelId: "openai/gpt-5.5",
    slug: "gpt-5.5",
    icon: "/icons/svgl/openai.svg",
    iconAlt: "OpenAI",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "Anthropic",
    displayName: "Claude Opus 4.7",
    modelId: "anthropic/claude-opus-4.7",
    slug: "claude-opus-4.7",
    icon: "/icons/svgl/anthropic.svg",
    iconAlt: "Anthropic",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "Google",
    displayName: "Gemini 3.1 Pro Preview",
    modelId: "google/gemini-3.1-pro-preview",
    slug: "gemini-3.1-pro-preview",
    icon: "/icons/svgl/google.svg",
    iconAlt: "Gemini",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "Moonshot",
    displayName: "Kimi K2.6",
    modelId: "moonshotai/kimi-k2.6",
    slug: "kimi-k2.6",
    icon: "/icons/svgl/moonshot.svg",
    iconAlt: "Kimi",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "Z.Ai",
    displayName: "GLM-5.1",
    modelId: "z-ai/glm-5.1",
    slug: "glm-5.1",
    icon: "/icons/providers/z-ai.svg",
    iconAlt: "Z.Ai",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "MiniMax",
    displayName: "MiniMax M2.7",
    modelId: "minimax/minimax-m2.7",
    slug: "minimax-m2.7",
    icon: "/icons/simple-icons/minimax.svg",
    iconAlt: "MiniMax",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "DeepSeek",
    displayName: "DeepSeek V4 Pro",
    modelId: "deepseek/deepseek-v4-pro",
    slug: "deepseek-v4-pro",
    icon: "/icons/svgl/deepseek.svg",
    iconAlt: "DeepSeek",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "xAI",
    displayName: "Grok 4.20",
    modelId: "x-ai/grok-4.20",
    slug: "grok-4.20",
    icon: "/icons/svgl/xai.svg",
    iconAlt: "xAI",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "Alibaba",
    displayName: "Qwen3.6 Max Preview",
    modelId: "qwen/qwen3.6-max-preview",
    slug: "qwen3.6-max-preview",
    icon: "/icons/providers/qwen.svg",
    iconAlt: "Qwen",
    temperature: 0,
    maxTokens: 512,
  },
  {
    provider: "Xiaomi",
    displayName: "MiMo-V2.5-Pro",
    modelId: "xiaomi/mimo-v2.5-pro",
    slug: "mimo-v2.5-pro",
    icon: "/icons/simple-icons/xiaomi.svg",
    iconAlt: "Xiaomi",
    temperature: 0,
    maxTokens: 512,
  },
] satisfies EvaluatedModel[];

export type EvaluatedModelSetName = "default" | "all";

export function getEvaluatedModelSet(_name: EvaluatedModelSetName): EvaluatedModel[] {
  return evaluatedModels;
}

export function findEvaluatedModel(modelId: string): EvaluatedModel | undefined {
  return evaluatedModels.find((model) => model.modelId === modelId);
}

export function findModelBySlug(slug: string): EvaluatedModel | undefined {
  return evaluatedModels.find((model) => model.slug === slug);
}

export function getModelSlug(modelId: string): string | undefined {
  return evaluatedModels.find((model) => model.modelId === modelId)?.slug;
}
