"use client";

import { useState, useTransition } from "react";

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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="lg">
        <Dialog.Title>Start cloud run</Dialog.Title>
        <Dialog.Description>Select suite versions and models to benchmark.</Dialog.Description>
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => startRun(fd));
          }}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Text variant="secondary" size="sm">Suite versions</Text>
              <div className="max-h-56 space-y-2 overflow-auto rounded-lg border border-kumo-hairline p-3">
                {suiteVersions.length === 0 ? (
                  <Text variant="secondary" size="sm">No ready or published versions.</Text>
                ) : (
                  suiteVersions.map((version) => (
                    <label
                      key={version.id}
                      aria-label={`${version.humanName} ${version.suiteName}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="suiteVersionIds"
                        value={version.id}
                        className="mt-1"
                      />
                      <span>
                        <span className="block">{version.humanName}</span>
                        <span className="text-kumo-subtle">
                          {version.suiteName} · {version.status} · {version.sampleCount} samples
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Text variant="secondary" size="sm">Registered models</Text>
              <div className="max-h-56 space-y-2 overflow-auto rounded-lg border border-kumo-hairline p-3">
                {evaluatedModels.map((model) => (
                  <label
                    key={model.modelId}
                    aria-label={`${model.displayName} ${model.modelId}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <input type="checkbox" name="modelIds" value={model.modelId} className="mt-1" />
                    <span>
                      <span className="block">{model.displayName}</span>
                      <span className="text-kumo-subtle">{model.modelId}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Queueing..." : "Queue run"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
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
