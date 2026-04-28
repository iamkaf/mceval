import { evalModelSchema, type EvalModel } from "./schema";

export type EvalModelEnv = Partial<Record<
  "MODEL_IDS" | "MODEL_ID" | "MODEL_PROVIDER" | "MODEL_NAME" | "TEMPERATURE" | "MAX_TOKENS",
  string | undefined
>>;

export function parseEvalModels(env: EvalModelEnv): EvalModel[] {
  const ids = (env.MODEL_IDS ?? env.MODEL_ID ?? "openai/gpt-4.1-mini")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.map((modelId) =>
    evalModelSchema.parse({
      provider: env.MODEL_PROVIDER ?? "OpenRouter",
      modelId,
      displayName: env.MODEL_NAME ?? modelId,
      temperature: Number(env.TEMPERATURE ?? 0),
      maxTokens: Number(env.MAX_TOKENS ?? 512),
    }),
  );
}
