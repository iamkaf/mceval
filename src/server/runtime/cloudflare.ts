import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { D1DatabaseLike } from "@/server/db/types";

export type McevalRuntimeEnv = {
  AUTH_ORIGIN?: string;
  URIEL_SESSION_API_TOKEN?: string;
  MCEVAL_ADMIN_USER_IDS?: string;
  OPENROUTER_API_KEY?: string;
  MCEVAL_DISABLE_AUTH?: string;
  DB?: D1DatabaseLike;
  EVAL_QUEUE?: Queue<EvalJobQueueMessage>;
};

export type EvalJobQueueMessage = {
  runId: string;
  jobId: string;
};

export function getMcevalRuntimeEnv(): McevalRuntimeEnv {
  try {
    const { env } = getCloudflareContext();
    return env as McevalRuntimeEnv;
  } catch {
    return process.env as McevalRuntimeEnv;
  }
}

export function requireMcevalCloudEnv(): Required<Pick<McevalRuntimeEnv, "DB" | "EVAL_QUEUE">> & McevalRuntimeEnv {
  const env = getMcevalRuntimeEnv();
  if (!env.DB) {
    throw new Error("DB binding is required.");
  }
  if (!env.EVAL_QUEUE) {
    throw new Error("EVAL_QUEUE binding is required.");
  }
  return env as Required<Pick<McevalRuntimeEnv, "DB" | "EVAL_QUEUE">> & McevalRuntimeEnv;
}

export function requireEvalConsumerEnv(env: McevalRuntimeEnv): Required<Pick<McevalRuntimeEnv, "DB" | "OPENROUTER_API_KEY">> & McevalRuntimeEnv {
  const mergedEnv = { ...process.env, ...env } as McevalRuntimeEnv;
  if (!env.DB) {
    throw new Error("DB binding is required.");
  }
  if (!mergedEnv.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY secret is required.");
  }
  return { ...mergedEnv, DB: env.DB, EVAL_QUEUE: env.EVAL_QUEUE } as Required<Pick<McevalRuntimeEnv, "DB" | "OPENROUTER_API_KEY">> & McevalRuntimeEnv;
}
