"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  addDraftSample,
  archiveDraftSample,
  cloneDraftFromVersion,
  createSuiteDraft,
  freezeDraftAsReadyVersion,
  publishReadyVersion,
  updateDraftSample,
  updateSuiteDraft,
} from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../_lib/auth";

export async function createDraft(formData: FormData) {
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const suiteId = String(formData.get("suiteId") ?? "");
  const humanName = String(formData.get("humanName") ?? "");

  const draftId = await createSuiteDraft({
    db: env.DB,
    suiteId,
    humanName,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
  });

  revalidatePath("/dashboard/suites");
  redirect(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
}

export async function editDraft(formData: FormData) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const draftId = String(formData.get("draftId") ?? "");
  const humanName = String(formData.get("humanName") ?? "");

  await updateSuiteDraft(env.DB, draftId, humanName);

  revalidatePath(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  revalidatePath("/dashboard/suites");
}

export async function freezeDraft(formData: FormData) {
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const draftId = String(formData.get("draftId") ?? "");
  const humanName = String(formData.get("humanName") ?? "");

  await freezeDraftAsReadyVersion({
    db: env.DB,
    draftId,
    humanName,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
  });

  revalidatePath("/dashboard/suites");
}

export async function addSample(formData: FormData) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const draftId = String(formData.get("draftId") ?? "");

  await addDraftSample(env.DB, draftId, {
    stableId: String(formData.get("stableId") ?? ""),
    input: String(formData.get("input") ?? ""),
    target: String(formData.get("target") ?? ""),
    acceptedTargets: splitList(String(formData.get("acceptedTargets") ?? "")),
    tags: splitList(String(formData.get("tags") ?? "")),
    category: String(formData.get("category") ?? ""),
    difficulty: String(formData.get("difficulty") ?? ""),
    rationale: String(formData.get("rationale") ?? ""),
  });

  revalidatePath(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  revalidatePath("/dashboard/suites");
}

export async function updateSample(formData: FormData) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const sampleId = String(formData.get("sampleId") ?? "");
  const draftId = String(formData.get("draftId") ?? "");

  await updateDraftSample(env.DB, sampleId, {
    stableId: String(formData.get("stableId") ?? ""),
    input: String(formData.get("input") ?? ""),
    target: String(formData.get("target") ?? ""),
    acceptedTargets: splitList(String(formData.get("acceptedTargets") ?? "")),
    tags: splitList(String(formData.get("tags") ?? "")),
    category: String(formData.get("category") ?? ""),
    difficulty: String(formData.get("difficulty") ?? ""),
    rationale: String(formData.get("rationale") ?? ""),
    position: Number(formData.get("position") ?? 0),
  });

  revalidatePath(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  revalidatePath("/dashboard/suites");
}

export async function archiveSample(formData: FormData) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const sampleId = String(formData.get("sampleId") ?? "");
  const draftId = String(formData.get("draftId") ?? "");

  await archiveDraftSample(env.DB, sampleId);

  revalidatePath(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  revalidatePath("/dashboard/suites");
}

export async function publishVersion(formData: FormData) {
  await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const versionId = String(formData.get("versionId") ?? "");

  await publishReadyVersion(env.DB, versionId);

  revalidatePath("/dashboard/suites");
}

export async function cloneVersion(formData: FormData) {
  const { auth } = await requireDashboardAccess("/dashboard");
  const env = requireMcevalCloudEnv();
  const versionId = String(formData.get("versionId") ?? "");
  const humanName = String(formData.get("humanName") ?? "");

  const draftId = await cloneDraftFromVersion({
    db: env.DB,
    suiteVersionId: versionId,
    humanName,
    createdByUserId: auth.result.user.userId,
    createdByDisplayName: auth.result.user.displayName,
  });

  revalidatePath("/dashboard/suites");
  redirect(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
