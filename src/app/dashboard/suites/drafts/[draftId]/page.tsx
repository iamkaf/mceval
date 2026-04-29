import { notFound } from "next/navigation";

import { Text } from "@cloudflare/kumo/components/text";
import { getSuiteDraftDetail } from "@/server/db/cloud-suites";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../_lib/auth";
import { DraftEditor } from "../../../_components/draft-editor";

export const dynamic = "force-dynamic";

export default async function SuiteDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  await requireDashboardAccess(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  const env = getMcevalRuntimeEnv();
  if (!env.DB) throw new Error("DB binding is required.");

  const draft = await getSuiteDraftDetail(env.DB, draftId);
  if (!draft) notFound();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-kumo-subtle">
        <a className="transition hover:text-kumo-default" href="/dashboard/suites">Suites</a>
        <span>/</span>
        <a className="transition hover:text-kumo-default" href="/dashboard/suites">{draft.suiteName}</a>
        <span>/</span>
        <span className="text-kumo-default">{draft.humanName}</span>
      </nav>

      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">{draft.humanName}</Text>
        <Text variant="secondary">{draft.suiteName} · {draft.sampleCount} active samples</Text>
      </header>

      <DraftEditor draft={draft} />
    </div>
  );
}
