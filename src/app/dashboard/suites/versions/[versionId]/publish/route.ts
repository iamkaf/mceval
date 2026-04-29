import { redirect } from "next/navigation";

import { publishReadyVersion } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  await publishReadyVersion(env.DB, versionId);
  redirect("/dashboard");
}
