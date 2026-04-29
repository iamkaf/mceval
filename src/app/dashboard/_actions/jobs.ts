"use server";

import { revalidatePath } from "next/cache";

import { retryEvalJob } from "@/server/db/cloud-runs";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../_lib/auth";

export async function retryJob(jobId: string, runId: string) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  await retryEvalJob(env.DB, env.EVAL_QUEUE, jobId);

  revalidatePath(`/dashboard/runs/${encodeURIComponent(runId)}`);
}
