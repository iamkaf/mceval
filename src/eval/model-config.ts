import { getEvaluatedModelSet, type EvaluatedModelSetName } from "../data/models";
import { evalModelSchema, type EvalModel } from "./schema";

export type EvalModelEnv = Partial<Record<
  | "MODEL_IDS"
  | "MODEL_ID"
  | "MODEL_PROVIDER"
  | "MODEL_NAME"
  | "MODEL_SET"
  | "TEMPERATURE"
  | "MAX_TOKENS",
  string | undefined
>>;

export function parseEvalModels(env: EvalModelEnv): EvalModel[] {
  if (!env.MODEL_IDS && !env.MODEL_ID && env.MODEL_SET) {
    return getEvaluatedModelSet(parseModelSetName(env.MODEL_SET)).map((model) =>
      evalModelSchema.parse({
        provider: model.provider,
        modelId: model.modelId,
        displayName: model.displayName,
        temperature: Number(env.TEMPERATURE ?? model.temperature),
        maxTokens: Number(env.MAX_TOKENS ?? model.maxTokens),
      }),
    );
  }

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

function parseModelSetName(name: string): EvaluatedModelSetName {
  if (name === "default" || name === "all") {
    return name;
  }

  throw new Error(`Unknown MODEL_SET "${name}". Expected "default" or "all".`);
}
