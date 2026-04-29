import { redirect } from "next/navigation";

import { createCloudBenchmarkRun } from "@/server/db/cloud-runs";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData();
  const suiteVersionIds = form.getAll("suiteVersionIds").map(String).filter(Boolean);
  const modelIds = form.getAll("modelIds").map(String).filter(Boolean);

  const { runId } = await createCloudBenchmarkRun({
    db: env.DB,
    queue: env.EVAL_QUEUE,
    suiteVersionIds,
    modelIds,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
    modelSetLabel: "dashboard",
  });

  redirect(`/dashboard/runs/${encodeURIComponent(runId)}`);
}
