import { redirect } from "next/navigation";

import { updateSuiteDraft } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  await requireDashboardAccess(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  const env = requireMcevalCloudEnv();
  const form = await request.formData();
  await updateSuiteDraft(env.DB, draftId, String(form.get("humanName") ?? ""));
  redirect(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
}
