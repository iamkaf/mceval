import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { D1DatabaseLike } from "@/server/db/types";

export type McevalRuntimeEnv = {
  AUTH_ORIGIN?: string;
  URIEL_SESSION_API_TOKEN?: string;
  MCEVAL_ADMIN_USER_IDS?: string;
  DB?: D1DatabaseLike;
};

export function getMcevalRuntimeEnv(): McevalRuntimeEnv {
  try {
    const { env } = getCloudflareContext();
    return env as McevalRuntimeEnv;
  } catch {
    return process.env as McevalRuntimeEnv;
  }
}
