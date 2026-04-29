import { redirect } from "next/navigation";

import { archiveDraftSample } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ sampleId: string }> }) {
  const { sampleId } = await params;
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData().catch(() => null);
  const returnTo = String(form?.get("returnTo") ?? "/dashboard");
  await archiveDraftSample(env.DB, sampleId);
  redirect(returnTo.startsWith("/dashboard") ? returnTo : "/dashboard");
}
