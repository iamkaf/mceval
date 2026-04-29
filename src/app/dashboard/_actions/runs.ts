"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createCloudBenchmarkRun } from "@/server/db/cloud-runs";
import { cancelCloudRun, retryFailedJobs } from "@/server/db/cloud-runs";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../_lib/auth";

export async function startRun(formData: FormData) {
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const suiteVersionIds = formData.getAll("suiteVersionIds").map(String).filter(Boolean);
  const modelIds = formData.getAll("modelIds").map(String).filter(Boolean);

  const { runId } = await createCloudBenchmarkRun({
    db: env.DB,
    queue: env.EVAL_QUEUE,
    suiteVersionIds,
    modelIds,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
    modelSetLabel: "dashboard",
  });

  revalidatePath("/dashboard/runs");
  redirect(`/dashboard/runs/${encodeURIComponent(runId)}`);
}

export async function cancelRun(runId: string) {
  await requireDashboardAccess(`/dashboard/runs/${encodeURIComponent(runId)}`);
  const env = requireMcevalCloudEnv();
  await cancelCloudRun(env.DB, runId);

  revalidatePath(`/dashboard/runs/${encodeURIComponent(runId)}`);
  revalidatePath("/dashboard/runs");
}

export async function retryFailed(formData: FormData) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const runId = String(formData.get("runId") ?? "");
  const suiteVersionId = stringOrUndefined(formData.get("suiteVersionId"));
  const modelId = stringOrUndefined(formData.get("modelId"));

  await retryFailedJobs(env.DB, env.EVAL_QUEUE, { runId, suiteVersionId, modelId });

  revalidatePath(`/dashboard/runs/${encodeURIComponent(runId)}`);
}

function stringOrUndefined(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
