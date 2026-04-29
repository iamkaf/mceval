import { redirect } from "next/navigation";

import { cancelCloudRun } from "@/server/db/cloud-runs";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  await requireDashboardAccess(`/dashboard/runs/${encodeURIComponent(runId)}`);
  const env = requireMcevalCloudEnv();
  await cancelCloudRun(env.DB, runId);
  redirect(`/dashboard/runs/${encodeURIComponent(runId)}`);
}
