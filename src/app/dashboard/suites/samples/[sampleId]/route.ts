import { redirect } from "next/navigation";

import { updateDraftSample } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ sampleId: string }> }) {
  const { sampleId } = await params;
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const form = await request.formData();
  const returnTo = String(form.get("returnTo") ?? "/dashboard");
  await updateDraftSample(env.DB, sampleId, {
    stableId: String(form.get("stableId") ?? ""),
    input: String(form.get("input") ?? ""),
    target: String(form.get("target") ?? ""),
    acceptedTargets: splitList(String(form.get("acceptedTargets") ?? "")),
    tags: splitList(String(form.get("tags") ?? "")),
    category: String(form.get("category") ?? ""),
    difficulty: String(form.get("difficulty") ?? ""),
    rationale: String(form.get("rationale") ?? ""),
    position: Number(form.get("position") ?? 0),
  });
  redirect(returnTo.startsWith("/dashboard") ? returnTo : "/dashboard");
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
