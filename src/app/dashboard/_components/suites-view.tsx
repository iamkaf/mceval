"use client";

import { useState, useTransition } from "react";

import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";

import type { SuiteDraftSummary, SuiteSummary, SuiteVersionSummary } from "@/server/db/cloud-suites";
import { createDraft, freezeDraft, publishVersion, cloneVersion } from "../_actions/suites";
import { ConfirmDialog } from "./confirm-dialog";

export type SuitesViewProps = {
  suites: SuiteSummary[];
  versions: SuiteVersionSummary[];
  drafts: SuiteDraftSummary[];
};

export function SuitesView({ suites, versions, drafts }: SuitesViewProps) {
  return (
    <div className="space-y-6">
      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">Suites</Text>
        <Text variant="secondary">Author, version, and publish benchmark suites.</Text>
      </header>

      {suites.length === 0 ? (
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-8">
          <Text variant="secondary">No suites found.</Text>
        </Surface>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {suites.map((suite) => (
            <SuiteCard
              key={suite.id}
              suite={suite}
              suiteDrafts={drafts.filter((d) => d.suiteId === suite.id)}
              suiteVersions={versions.filter((v) => v.suiteId === suite.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuiteCard({
  suite,
  suiteDrafts,
  suiteVersions,
}: {
  suite: SuiteSummary;
  suiteDrafts: SuiteDraftSummary[];
  suiteVersions: SuiteVersionSummary[];
}) {
  const [newDraftOpen, setNewDraftOpen] = useState(false);
  const [freezeDraftId, setFreezeDraftId] = useState<string | null>(null);
  const [cloneVersionId, setCloneVersionId] = useState<string | null>(null);
  const [publishVersionId, setPublishVersionId] = useState<string | null>(null);

  const published = suiteVersions.find((v) => v.status === "published");
  const readyVersions = suiteVersions.filter((v) => v.status === "ready");

  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <div className="mb-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <Text as="h2" variant="heading3">{suite.name}</Text>
          {published ? (
            <Badge variant="success">{published.humanName}</Badge>
          ) : (
            <Badge variant="secondary">Unpublished</Badge>
          )}
        </div>
        <Text variant="secondary" size="sm">{suite.description ?? "No description"}</Text>
        <div className="flex gap-2">
        <Badge variant="secondary">{suiteDrafts.length} drafts</Badge>
        <Badge variant="secondary">{readyVersions.length} ready</Badge>
        </div>
      </div>

      <div className="mb-4">
        <Button size="sm" onClick={() => setNewDraftOpen(true)}>
          New draft
        </Button>
      </div>

      <div className="space-y-3">
        <SimpleCollapsible label={`Drafts (${suiteDrafts.length})`}>
          <div className="mt-3 space-y-3">
            {suiteDrafts.length === 0 ? (
              <Text variant="secondary" size="sm">No drafts.</Text>
            ) : (
              suiteDrafts.map((draft) => (
                <div key={draft.id} className="rounded-lg border border-kumo-hairline p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <a
                      className="text-kumo-brand transition hover:text-kumo-default"
                      href={`/dashboard/suites/drafts/${encodeURIComponent(draft.id)}`}
                    >
                      {draft.humanName}
                    </a>
                    <Text variant="mono-secondary">{draft.sampleCount} samples</Text>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setFreezeDraftId(draft.id)}
                  >
                    Freeze to version
                  </Button>
                </div>
              ))
            )}
          </div>
        </SimpleCollapsible>

        <SimpleCollapsible label={`Versions (${suiteVersions.length})`}>
          <div className="mt-3 space-y-3">
            {suiteVersions.length === 0 ? (
              <Text variant="secondary" size="sm">No versions.</Text>
            ) : (
              suiteVersions.map((version) => (
                <div
                  key={version.id}
                  className="flex flex-col gap-2 rounded-lg border border-kumo-hairline p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Text>{version.humanName}</Text>
                    <Text variant="secondary" size="sm">
                      {version.status} · {version.sampleCount} samples · {version.suiteHash.slice(0, 8)}
                    </Text>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {version.status === "ready" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPublishVersionId(version.id)}
                      >
                        Publish
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCloneVersionId(version.id)}
                    >
                      Clone
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SimpleCollapsible>
      </div>

      <NewDraftDialog
        suiteId={suite.id}
        open={newDraftOpen}
        onOpenChange={setNewDraftOpen}
      />

      <FreezeDialog
        draftId={freezeDraftId}
        onOpenChange={(open) => !open && setFreezeDraftId(null)}
      />

      <CloneDialog
        versionId={cloneVersionId}
        onOpenChange={(open) => !open && setCloneVersionId(null)}
      />

      <ConfirmDialog
        open={publishVersionId !== null}
        onOpenChange={(open) => !open && setPublishVersionId(null)}
        title="Publish version"
        description="This will make the version public on the homepage. The previous published version will be archived. Continue?"
        confirmLabel="Publish"
        onConfirm={() => {
          if (publishVersionId) {
            const fd = new FormData();
            fd.set("versionId", publishVersionId);
            publishVersion(fd);
            setPublishVersionId(null);
          }
        }}
      />
    </Surface>
  );
}

function NewDraftDialog({
  suiteId,
  open,
  onOpenChange,
}: {
  suiteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="sm">
        <Dialog.Title>Create draft</Dialog.Title>
        <Dialog.Description>Name your new draft.</Dialog.Description>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => createDraft(fd));
          }}
        >
          <input type="hidden" name="suiteId" value={suiteId} />
          <Input name="humanName" placeholder="DraftName1" label="Draft name" required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}

function FreezeDialog({
  draftId,
  onOpenChange,
}: {
  draftId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const open = draftId !== null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="sm">
        <Dialog.Title>Freeze draft</Dialog.Title>
        <Dialog.Description>Choose a globally unique version name.</Dialog.Description>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => freezeDraft(fd));
          }}
        >
          <input type="hidden" name="draftId" value={draftId ?? ""} />
          <Input name="humanName" placeholder="MCHistory1" label="Version name" required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Freezing..." : "Freeze"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}

function SimpleCollapsible({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1 text-sm text-kumo-link transition hover:text-kumo-default"
        aria-expanded={open}
      >
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          fill="currentColor"
          viewBox="0 0 256 256"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
        </svg>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function CloneDialog({
  versionId,
  onOpenChange,
}: {
  versionId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const open = versionId !== null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="sm">
        <Dialog.Title>Clone version</Dialog.Title>
        <Dialog.Description>Create a new draft from this version.</Dialog.Description>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => cloneVersion(fd));
          }}
        >
          <input type="hidden" name="versionId" value={versionId ?? ""} />
          <Input name="humanName" placeholder="DraftName1" label="Draft name" required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Cloning..." : "Clone"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}
