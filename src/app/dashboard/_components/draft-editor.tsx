"use client";

import { useState, useTransition } from "react";

import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { Textarea } from "@cloudflare/kumo/components/input";

import type { SuiteDraftDetail } from "@/server/db/cloud-suites";
import { editDraft, addSample, updateSample, archiveSample } from "../_actions/suites";
import { ConfirmDialog } from "./confirm-dialog";

export type DraftEditorProps = {
  draft: SuiteDraftDetail;
};

export function DraftEditor({ draft }: DraftEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [archiveSampleId, setArchiveSampleId] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState(draft.samples[0]?.id ?? null);
  const [filter, setFilter] = useState("");
  const selectedSample = draft.samples.find((sample) => sample.id === selectedSampleId) ?? draft.samples[0] ?? null;
  const filteredSamples = draft.samples.filter((sample) => {
    const term = filter.trim().toLowerCase();
    if (!term) return true;
    return [sample.stableId, sample.input, sample.target, sample.category, sample.difficulty, ...sample.tags]
      .some((value) => value.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <Surface className="overflow-hidden rounded-2xl border border-kumo-hairline bg-kumo-base">
        <div className="grid gap-px bg-kumo-hairline md:grid-cols-[1.4fr_1fr]">
          <div className="bg-kumo-base p-5">
            <EditDraftName draft={draft} />
          </div>
          <div className="grid grid-cols-3 gap-px bg-kumo-hairline">
            <DraftMetric label="Samples" value={draft.sampleCount} />
            <DraftMetric label="Categories" value={new Set(draft.samples.map((sample) => sample.category)).size} />
            <DraftMetric label="Aliases" value={draft.samples.reduce((sum, sample) => sum + sample.acceptedTargets.length, 0)} />
          </div>
        </div>
      </Surface>

      {draft.samples.length === 0 ? (
        <Surface className="rounded-2xl border border-dashed border-kumo-hairline bg-kumo-base p-10 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <Text as="h2" variant="heading2">Start the draft with one sharp sample</Text>
            <Text variant="secondary">Each sample needs a stable id, prompt, target, category, and difficulty before the draft can be frozen.</Text>
            <Button onClick={() => setAddOpen(true)}>Add first sample</Button>
          </div>
        </Surface>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Surface className="rounded-2xl border border-kumo-hairline bg-kumo-base p-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Text as="h2" variant="heading3">Samples</Text>
                <Text variant="secondary" size="sm">Select one sample to edit. Changes save per card.</Text>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}>Add</Button>
            </div>
            <Input
              aria-label="Filter draft samples"
              className="mb-3"
              placeholder="Filter by id, prompt, tag..."
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            {filteredSamples.length === 0 ? (
              <div className="rounded-xl border border-kumo-hairline p-4">
                <Text variant="secondary" size="sm">No samples match this filter.</Text>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-18rem)] space-y-2 overflow-auto pr-1">
                {filteredSamples.map((sample) => (
                  <SampleNavItem
                    key={sample.id}
                    active={sample.id === selectedSample?.id}
                    sample={sample}
                    onSelect={() => setSelectedSampleId(sample.id)}
                  />
                ))}
              </div>
            )}
          </Surface>

          {selectedSample ? (
            <Surface className="rounded-2xl border border-kumo-hairline bg-kumo-base p-5">
              <SampleEditor
                key={selectedSample.id}
                draftId={draft.id}
                sample={selectedSample}
                onArchive={() => setArchiveSampleId(selectedSample.id)}
              />
            </Surface>
          ) : null}
        </div>
      )}

      <AddSampleDialog draftId={draft.id} open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={archiveSampleId !== null}
        onOpenChange={(open) => !open && setArchiveSampleId(null)}
        title="Archive sample"
        description="This sample will be removed from the draft but preserved in history. Continue?"
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiveSampleId) {
            const fd = new FormData();
            fd.set("sampleId", archiveSampleId);
            fd.set("draftId", draft.id);
            archiveSample(fd);
            setArchiveSampleId(null);
          }
        }}
      />
    </div>
  );
}

function DraftMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-kumo-base p-5">
      <Text variant="secondary" size="sm">{label}</Text>
      <Text variant="heading2">{value}</Text>
    </div>
  );
}

function EditDraftName({ draft }: { draft: SuiteDraftDetail }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => editDraft(fd));
      }}
    >
      <input type="hidden" name="draftId" value={draft.id} />
      <Input
        name="humanName"
        defaultValue={draft.humanName}
        label="Draft name"
        className="min-w-0 flex-1"
      />
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function SampleEditor({
  draftId,
  sample,
  onArchive,
}: {
  draftId: string;
  sample: SuiteDraftDetail["samples"][number];
  onArchive: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => updateSample(fd));
      }}
    >
      <input type="hidden" name="sampleId" value={sample.id} />
      <input type="hidden" name="draftId" value={draftId} />

      <div className="flex flex-col gap-3 border-b border-kumo-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text as="h2" variant="heading3">{sample.stableId}</Text>
            <Badge variant="secondary">{sample.category}</Badge>
            <Badge variant="secondary">{sample.difficulty}</Badge>
          </div>
          <Text variant="secondary" size="sm">Position {sample.position} · {sample.acceptedTargets.length} aliases · {sample.tags.length} tags</Text>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save sample"}
          </Button>
          <Button type="button" variant="secondary-destructive" onClick={onArchive} disabled={pending}>
            Archive
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Input name="stableId" defaultValue={sample.stableId} label="Stable ID" />
        <Input name="category" defaultValue={sample.category} label="Category" />
        <Input name="difficulty" defaultValue={sample.difficulty} label="Difficulty" />
        <Input name="position" defaultValue={String(sample.position)} type="number" label="Position" />
      </div>

      <Textarea
        name="input"
        defaultValue={sample.input}
        label="Prompt"
        className="min-h-24"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="target" defaultValue={sample.target} label="Target answer" />
        <Input
          name="acceptedTargets"
          defaultValue={sample.acceptedTargets.join(", ")}
          label="Accepted aliases"
        />
      </div>

      <Input name="tags" defaultValue={sample.tags.join(", ")} label="Tags" />

      <Textarea
        name="rationale"
        defaultValue={sample.rationale ?? ""}
        label="Rationale / source"
        className="min-h-16"
      />

    </form>
  );
}

function SampleNavItem({
  active,
  sample,
  onSelect,
}: {
  active: boolean;
  sample: SuiteDraftDetail["samples"][number];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        active
          ? "border-kumo-brand bg-kumo-canvas text-kumo-default"
          : "border-kumo-hairline hover:border-kumo-subtle hover:bg-kumo-canvas"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs">{sample.stableId}</span>
        <span className="shrink-0 text-xs text-kumo-subtle">#{sample.position}</span>
      </div>
      <span className="line-clamp-2 text-sm">{sample.input}</span>
      <div className="mt-3 flex flex-wrap gap-1">
        <Badge variant="secondary">{sample.category}</Badge>
        <Badge variant="secondary">{sample.difficulty}</Badge>
        {sample.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
      </div>
    </button>
  );
}

function AddSampleDialog({
  draftId,
  open,
  onOpenChange,
}: {
  draftId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="lg" className="p-6 sm:p-8">
        <Dialog.Title>Add sample</Dialog.Title>
        <Dialog.Description>Add a new question to this draft.</Dialog.Description>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              addSample(fd);
              onOpenChange(false);
              e.currentTarget.reset();
            });
          }}
        >
          <input type="hidden" name="draftId" value={draftId} />
          <Input name="stableId" placeholder="knowledge-001" label="Stable ID" required />
          <Textarea name="input" placeholder="Prompt" label="Prompt" className="min-h-24" required />
          <Input name="target" placeholder="Target answer" label="Target answer" required />
          <Input name="acceptedTargets" placeholder="Accepted aliases, comma separated" label="Accepted aliases" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input name="category" placeholder="category" label="Category" required />
            <Input name="difficulty" placeholder="difficulty" label="Difficulty" required />
            <Input name="tags" placeholder="tags" label="Tags" />
          </div>
          <Textarea name="rationale" placeholder="Rationale / source" label="Rationale" className="min-h-16" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add sample"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}
