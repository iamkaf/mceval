import { redirect } from "next/navigation";

import { createSuiteDraft } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData();
  const suiteId = String(form.get("suiteId") ?? "");
  const humanName = String(form.get("humanName") ?? "");

  await createSuiteDraft({
    db: env.DB,
    suiteId,
    humanName,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
  });

  redirect("/dashboard");
}
