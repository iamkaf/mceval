import { notFound } from "next/navigation";

import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { getSuiteDraftDetail } from "@/server/db/cloud-suites";
import { requireMcevalCloudEnv } from "@/server/runtime/cloudflare";
import { requireDashboardAccess } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export default async function SuiteDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  await requireDashboardAccess(`/dashboard/suites/drafts/${encodeURIComponent(draftId)}`);
  const env = requireMcevalCloudEnv();
  const draft = await getSuiteDraftDetail(env.DB, draftId);
  if (!draft) notFound();
  const returnTo = `/dashboard/suites/drafts/${encodeURIComponent(draft.id)}`;

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border-b border-kumo-hairline pb-6">
          <Text variant="mono-secondary"><a href="/dashboard">← Dashboard</a></Text>
          <Text as="h1" variant="heading1">{draft.humanName}</Text>
          <Text variant="secondary">{draft.suiteName} · {draft.sampleCount} active samples</Text>
        </header>

        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
          <form action={`/dashboard/suites/drafts/${encodeURIComponent(draft.id)}/edit`} method="post" className="flex flex-col gap-2 sm:flex-row">
            <input name="humanName" defaultValue={draft.humanName} className="min-w-0 flex-1 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            <Button type="submit">Save draft</Button>
          </form>
        </Surface>

        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
          <form action={`/dashboard/suites/drafts/${encodeURIComponent(draft.id)}/samples`} method="post" className="grid gap-2">
            <Text as="h2" variant="heading3">Add sample</Text>
            <input name="stableId" placeholder="knowledge-001" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            <textarea name="input" placeholder="Prompt" className="min-h-20 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            <input name="target" placeholder="Target answer" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            <input name="acceptedTargets" placeholder="Accepted aliases, comma separated" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            <div className="grid gap-2 sm:grid-cols-4">
              <input name="category" placeholder="category" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
              <input name="difficulty" placeholder="difficulty" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
              <input name="tags" placeholder="tags" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
              <input name="position" placeholder="position" type="number" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            </div>
            <textarea name="rationale" placeholder="Rationale/source" className="min-h-16 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
            <div><Button type="submit">Add sample</Button></div>
          </form>
        </Surface>

        <div className="space-y-4">
          {draft.samples.map((sample) => (
            <Surface key={sample.id} className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
              <form action={`/dashboard/suites/samples/${encodeURIComponent(sample.id)}`} method="post" className="grid gap-2">
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid gap-2 sm:grid-cols-4">
                  <input name="stableId" defaultValue={sample.stableId} className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                  <input name="category" defaultValue={sample.category} className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                  <input name="difficulty" defaultValue={sample.difficulty} className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                  <input name="position" defaultValue={sample.position} type="number" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                </div>
                <textarea name="input" defaultValue={sample.input} className="min-h-20 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                <input name="target" defaultValue={sample.target} className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                <input name="acceptedTargets" defaultValue={sample.acceptedTargets.join(", ")} className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                <input name="tags" defaultValue={sample.tags.join(", ")} className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                <textarea name="rationale" defaultValue={sample.rationale ?? ""} className="min-h-16 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <Button type="submit">Save sample</Button>
                </div>
              </form>
              <form action={`/dashboard/suites/samples/${encodeURIComponent(sample.id)}/archive`} method="post" className="mt-2">
                <input type="hidden" name="returnTo" value={returnTo} />
                <Button type="submit">Archive sample</Button>
              </form>
            </Surface>
          ))}
        </div>
      </div>
    </main>
  );
}
