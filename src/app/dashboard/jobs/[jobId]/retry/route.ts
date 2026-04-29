import { redirect } from "next/navigation";

import { retryEvalJob } from "@/server/db/cloud-runs";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  await retryEvalJob(env.DB, env.EVAL_QUEUE, jobId);
  const form = await request.formData().catch(() => null);
  const returnTo = form?.get("returnTo");
  redirect(typeof returnTo === "string" && returnTo.startsWith("/dashboard") ? returnTo : "/dashboard");
}
