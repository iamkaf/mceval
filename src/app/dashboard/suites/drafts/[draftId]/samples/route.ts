import { redirect } from "next/navigation";

import { addDraftSample } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData();

  await addDraftSample(env.DB, draftId, {
    stableId: String(form.get("stableId") ?? ""),
    input: String(form.get("input") ?? ""),
    target: String(form.get("target") ?? ""),
    acceptedTargets: splitList(String(form.get("acceptedTargets") ?? "")),
    tags: splitList(String(form.get("tags") ?? "")),
    category: String(form.get("category") ?? ""),
    difficulty: String(form.get("difficulty") ?? ""),
    rationale: String(form.get("rationale") ?? ""),
  });

  redirect("/dashboard");
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
