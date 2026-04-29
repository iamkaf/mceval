import { redirect } from "next/navigation";

import { freezeDraftAsReadyVersion } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData();
  const humanName = String(form.get("humanName") ?? "");

  await freezeDraftAsReadyVersion({
    db: env.DB,
    draftId,
    humanName,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
  });

  redirect("/dashboard");
}
