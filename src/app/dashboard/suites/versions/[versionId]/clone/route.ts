import { redirect } from "next/navigation";

import { cloneDraftFromVersion } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData();
  const draftId = await cloneDraftFromVersion({
    db: env.DB,
    suiteVersionId: versionId,
    humanName: String(form.get("humanName") ?? ""),
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
  });
  redirect(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
}
