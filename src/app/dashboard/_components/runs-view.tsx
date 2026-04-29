"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";

import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Table } from "@cloudflare/kumo/components/table";
import { Text } from "@cloudflare/kumo/components/text";

import { evaluatedModels } from "@/data/models";
import type { BenchmarkRunSummary } from "@/server/db/benchmarks";
import type { SuiteVersionSummary } from "@/server/db/cloud-suites";
import { ModelIcon } from "@/components/model-icon";
import { startRun } from "../_actions/runs";

export type RunsViewProps = {
  runs: BenchmarkRunSummary[];
  suiteVersions: SuiteVersionSummary[];
  latestAccuracy: number | null;
};

export function RunsView({ runs, suiteVersions, latestAccuracy }: RunsViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = runs.filter((r) =>
    r.id.toLowerCase().includes(filter.toLowerCase()) ||
    r.suiteName.toLowerCase().includes(filter.toLowerCase())
  );

  const totalCost = runs.reduce((sum, r) => sum + r.totalCost, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-kumo-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Text as="h1" variant="heading1">Runs</Text>
          <Text variant="secondary">Benchmark execution history and queue management.</Text>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New run</Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total runs" value={String(runs.length)} />
        <MetricCard label="Latest accuracy" value={formatAccuracy(latestAccuracy)} />
        <MetricCard label="Total cost" value={formatCost(totalCost)} />
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter runs..."
          aria-label="Filter runs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        {filter && (
          <Button variant="ghost" size="sm" onClick={() => setFilter("")}>
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-8">
          <Text variant="secondary">No runs match your filter.</Text>
        </Surface>
      ) : (
        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="overflow-x-auto">
            <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>Run</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Suite</Table.Head>
                <Table.Head>Models</Table.Head>
                <Table.Head>Results</Table.Head>
                <Table.Head>Accuracy</Table.Head>
                <Table.Head>Cost</Table.Head>
                <Table.Head>Latency</Table.Head>
              </Table.Row>
            </Table.Header>
              <Table.Body>
                {filtered.map((run) => (
                  <Table.Row key={run.id}>
                    <Table.Cell>
                      <a
                        className="font-mono text-xs text-kumo-brand transition hover:text-kumo-default"
                        href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                      >
                        {run.id}
                      </a>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={run.status} />
                    </Table.Cell>
                    <Table.Cell>{run.suiteName}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{run.modelCount}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">
                      {run.scoredCount}/{run.resultCount}
                    </Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{formatAccuracy(run.accuracy)}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{formatCost(run.totalCost)}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{formatLatency(run.meanLatencyMs)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Surface>
      )}

      <StartRunDialog
        suiteVersions={suiteVersions}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <Text variant="secondary" size="sm">{label}</Text>
      <Text variant="heading2">{value}</Text>
    </Surface>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "running":
      return <Badge variant="info">Running</Badge>;
    case "failed":
      return <Badge variant="error">Failed</Badge>;
    case "cancelled":
      return <Badge variant="warning">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function StartRunDialog({
  suiteVersions,
  open,
  onOpenChange,
}: {
  suiteVersions: SuiteVersionSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [suiteFilter, setSuiteFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  const normalizedSuiteFilter = suiteFilter.trim().toLowerCase();
  const normalizedModelFilter = modelFilter.trim().toLowerCase();
  const visibleSuiteVersions = suiteVersions.filter((version) => {
    if (!normalizedSuiteFilter) return true;
    return [version.humanName, version.suiteName, version.status, version.suiteHash]
      .some((value) => value.toLowerCase().includes(normalizedSuiteFilter));
  });
  const visibleModels = evaluatedModels.filter((model) => {
    if (!normalizedModelFilter) return true;
    return [model.displayName, model.modelId, model.provider]
      .some((value) => value.toLowerCase().includes(normalizedModelFilter));
  });
  const selectedSampleCount = suiteVersions.reduce((sum, version) => (
    selectedSuiteIds.includes(version.id) ? sum + version.sampleCount : sum
  ), 0);
  const estimatedJobs = selectedSampleCount * selectedModelIds.length;
  const canQueue = selectedSuiteIds.length > 0 && selectedModelIds.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="xl" className="flex max-h-[calc(100vh-2rem)] flex-col p-0">
        <div className="border-b border-kumo-hairline p-6 pb-5 sm:p-8 sm:pb-6">
          <Dialog.Title>Start cloud run</Dialog.Title>
          <Dialog.Description>Select suite versions and models to benchmark.</Dialog.Description>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <RunPlanMetric label="Suites" value={String(selectedSuiteIds.length)} />
            <RunPlanMetric label="Models" value={String(selectedModelIds.length)} />
            <RunPlanMetric label="Estimated jobs" value={String(estimatedJobs)} />
          </div>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canQueue) return;
            const fd = new FormData(e.currentTarget);
            startTransition(() => startRun(fd));
          }}
        >
          <div className="min-h-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <SelectionPanel
                title="Suite versions"
                count={selectedSuiteIds.length}
                total={suiteVersions.length}
                filter={suiteFilter}
                filterLabel="Filter suite versions"
                filterPlaceholder="Filter by suite, version, status..."
                onFilterChange={setSuiteFilter}
                onSelectVisible={() => setSelectedSuiteIds((current) => mergeUnique(current, visibleSuiteVersions.map((version) => version.id)))}
                onClear={() => setSelectedSuiteIds([])}
              >
                {visibleSuiteVersions.length === 0 ? (
                  <Text variant="secondary" size="sm">
                    {suiteVersions.length === 0 ? "No ready or published versions." : "No suite versions match this filter."}
                  </Text>
                ) : (
                  visibleSuiteVersions.map((version) => {
                    const checked = selectedSuiteIds.includes(version.id);
                    return (
                      <label
                        key={version.id}
                        aria-label={`${version.humanName} ${version.suiteName}`}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${checked ? "border-kumo-brand bg-kumo-canvas" : "border-kumo-hairline hover:bg-kumo-canvas/60"}`}
                      >
                        <input
                          type="checkbox"
                          name="suiteVersionIds"
                          value={version.id}
                          checked={checked}
                          onChange={(event) => setSelectedSuiteIds((current) => toggleValue(current, version.id, event.target.checked))}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{version.humanName}</span>
                            <Badge variant={version.status === "published" ? "success" : "secondary"}>{version.status}</Badge>
                          </span>
                          <span className="mt-1 block text-kumo-subtle">{version.suiteName}</span>
                          <span className="mt-2 flex flex-wrap gap-2 text-xs text-kumo-subtle">
                            <span>{version.sampleCount} samples</span>
                            <span className="font-mono">{version.suiteHash.slice(0, 8)}</span>
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </SelectionPanel>

              <SelectionPanel
                title="Registered models"
                count={selectedModelIds.length}
                total={evaluatedModels.length}
                filter={modelFilter}
                filterLabel="Filter registered models"
                filterPlaceholder="Filter by name, provider, id..."
                onFilterChange={setModelFilter}
                onSelectVisible={() => setSelectedModelIds((current) => mergeUnique(current, visibleModels.map((model) => model.modelId)))}
                onClear={() => setSelectedModelIds([])}
              >
                {visibleModels.length === 0 ? (
                  <Text variant="secondary" size="sm">No models match this filter.</Text>
                ) : (
                  visibleModels.map((model) => {
                    const checked = selectedModelIds.includes(model.modelId);
                    return (
                      <label
                        key={model.modelId}
                        aria-label={`${model.displayName} ${model.modelId}`}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${checked ? "border-kumo-brand bg-kumo-canvas" : "border-kumo-hairline hover:bg-kumo-canvas/60"}`}
                      >
                        <input
                          type="checkbox"
                          name="modelIds"
                          value={model.modelId}
                          checked={checked}
                          onChange={(event) => setSelectedModelIds((current) => toggleValue(current, model.modelId, event.target.checked))}
                          className="mt-2"
                        />
                        <ModelIcon icon={model.icon} iconAlt={model.iconAlt} initials={model.provider.slice(0, 2)} />
                        <span className="min-w-0">
                          <span className="block font-medium">{model.displayName}</span>
                          <span className="block text-kumo-subtle">{model.provider}</span>
                          <span className="mt-1 block break-all font-mono text-xs text-kumo-subtle">{model.modelId}</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </SelectionPanel>
            </div>
          </div>

          <div className="border-t border-kumo-hairline bg-kumo-base p-4 sm:p-6">
            {!canQueue ? (
              <Text variant="secondary" size="sm">Choose at least one suite version and one model to queue a run.</Text>
            ) : (
              <Text variant="secondary" size="sm">
                This will queue {estimatedJobs.toLocaleString()} jobs across {selectedSuiteIds.length} suite version{selectedSuiteIds.length === 1 ? "" : "s"} and {selectedModelIds.length} model{selectedModelIds.length === 1 ? "" : "s"}.
              </Text>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !canQueue}>
                {pending ? "Queueing..." : "Queue run"}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}

function RunPlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-kumo-hairline bg-kumo-canvas p-3">
      <Text variant="secondary" size="sm">{label}</Text>
      <Text variant="heading3">{value}</Text>
    </div>
  );
}

function SelectionPanel({
  title,
  count,
  total,
  filter,
  filterLabel,
  filterPlaceholder,
  onFilterChange,
  onSelectVisible,
  onClear,
  children,
}: {
  title: string;
  count: number;
  total: number;
  filter: string;
  filterLabel: string;
  filterPlaceholder: string;
  onFilterChange: (value: string) => void;
  onSelectVisible: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <section className="min-h-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Text variant="secondary" size="sm">{title}</Text>
          <Text variant="mono-secondary">{count}/{total} selected</Text>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onSelectVisible}>Select visible</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>Clear</Button>
        </div>
      </div>
      <Input
        aria-label={filterLabel}
        placeholder={filterPlaceholder}
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
      />
      <div className="max-h-[min(32rem,60vh)] space-y-2 overflow-auto rounded-xl border border-kumo-hairline p-3">
        {children}
      </div>
    </section>
  );
}

function toggleValue(values: string[], value: string, checked: boolean): string[] {
  if (checked) return mergeUnique(values, [value]);
  return values.filter((item) => item !== value);
}

function mergeUnique(values: string[], additions: string[]): string[] {
  return Array.from(new Set([...values, ...additions]));
}

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number | null): string {
  return value === null ? "—" : `${Math.round(value).toLocaleString()}ms`;
}
