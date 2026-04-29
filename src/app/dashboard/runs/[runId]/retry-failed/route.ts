import { redirect } from "next/navigation";

import { retryFailedJobs } from "@/server/db/cloud-runs";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  await requireDashboardAccess(`/dashboard/runs/${encodeURIComponent(runId)}`);
  const env = requireMcevalCloudEnv();
  const form = await request.formData().catch(() => null);
  const suiteVersionId = stringOrUndefined(form?.get("suiteVersionId"));
  const modelId = stringOrUndefined(form?.get("modelId"));
  await retryFailedJobs(env.DB, env.EVAL_QUEUE, { runId, suiteVersionId, modelId });
  redirect(`/dashboard/runs/${encodeURIComponent(runId)}`);
}

function stringOrUndefined(value: FormDataEntryValue | null | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
