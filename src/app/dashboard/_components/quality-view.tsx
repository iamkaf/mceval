"use client";

import { useState } from "react";

import { Select } from "@cloudflare/kumo/components/select";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Table } from "@cloudflare/kumo/components/table";
import { Text } from "@cloudflare/kumo/components/text";

import { findEvaluatedModel } from "@/data/models";
import type { BenchmarkRunDetail, BenchmarkRunSummary } from "@/server/db/benchmarks";
import { ModelIcon } from "@/components/model-icon";

export type QualityViewProps = {
  runs: BenchmarkRunSummary[];
  runDetail: BenchmarkRunDetail | null;
};

export function QualityView({ runs, runDetail }: QualityViewProps) {
  const [runId, setRunId] = useState(runDetail?.run.id ?? "");

  const selectedRun = runs.find((r) => r.id === runId) ?? runs[0];

  return (
    <div className="space-y-6">
      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">Quality</Text>
        <Text variant="secondary">Inspect run results, errors, and per-model accuracy.</Text>
      </header>

      {runs.length > 0 && (
        <div className="max-w-sm">
          <Select
            label="Run"
            value={runId || selectedRun?.id}
            onValueChange={(value) => {
              const v = value ?? "";
              setRunId(v);
              const url = new URL(window.location.href);
              url.searchParams.set("run", v);
              window.history.replaceState({}, "", url);
            }}
            items={runs.map((r) => ({ label: `${r.suiteName} — ${r.id.slice(0, 8)}`, value: r.id }))}
          />
        </div>
      )}

      {!runDetail ? (
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-8">
          <Text variant="secondary">No run data available for quality analysis.</Text>
        </Surface>
      ) : (
        <RunQualityDetail detail={runDetail} />
      )}
    </div>
  );
}

function RunQualityDetail({ detail }: { detail: BenchmarkRunDetail }) {
  const { run, results } = detail;
  const scored = results.filter((r) => r.score !== null);
  const errors = results.filter((r) => r.error);
  const perfect = scored.filter((r) => r.score === 1);
  const zero = scored.filter((r) => r.score === 0);
  const unscored = results.filter((r) => r.score === null);

  const modelStats = new Map<string, { correct: number; total: number; cost: number; latency: number }>();
  for (const r of results) {
    const s = modelStats.get(r.modelId) ?? { correct: 0, total: 0, cost: 0, latency: 0 };
    s.total += 1;
    if (r.score === 1) s.correct += 1;
    s.cost += r.cost ?? 0;
    s.latency += r.latencyMs;
    modelStats.set(r.modelId, s);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Accuracy" value={formatAccuracy(run.accuracy)} />
        <MetricCard
          label="Error rate"
          value={formatRate(errors.length, results.length)}
        />
        <MetricCard
          label="Unscored rate"
          value={formatRate(unscored.length, results.length)}
        />
        <MetricCard label="Total cost" value={formatCost(run.totalCost)} />
      </div>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">Result distribution</Text>
        </div>
        <div className="grid gap-px bg-kumo-hairline sm:grid-cols-4">
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Perfect</Text>
            <Text variant="heading2">{perfect.length}</Text>
          </div>
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Incorrect</Text>
            <Text variant="heading2">{zero.length}</Text>
          </div>
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Errors</Text>
            <Text variant="heading2">{errors.length}</Text>
          </div>
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Unscored</Text>
            <Text variant="heading2">{unscored.length}</Text>
          </div>
        </div>
      </Surface>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">Per-model quality</Text>
        </div>
        <div className="overflow-x-auto">
          <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>Model</Table.Head>
                <Table.Head>Correct</Table.Head>
                <Table.Head>Total</Table.Head>
                <Table.Head>Accuracy</Table.Head>
                <Table.Head>Mean cost</Table.Head>
                <Table.Head>Mean latency</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Array.from(modelStats.entries()).map(([modelId, stats]) => {
                const model = findEvaluatedModel(modelId);
                return (
                  <Table.Row key={modelId}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <ModelIcon icon={model?.icon} iconAlt={model?.iconAlt} initials={(model?.provider ?? modelId).slice(0, 2)} />
                        <div className="min-w-0">
                          <span>{model?.displayName ?? modelId}</span>
                          <Text variant="secondary" size="sm">{modelId}</Text>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{stats.correct}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{stats.total}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">
                      {((stats.correct / stats.total) * 100).toFixed(1)}%
                    </Table.Cell>
                    <Table.Cell className="text-kumo-subtle">
                      {formatCost(stats.cost / stats.total)}
                    </Table.Cell>
                    <Table.Cell className="text-kumo-subtle">
                      {Math.round(stats.latency / stats.total).toLocaleString()}ms
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </div>
      </Surface>
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

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRate(count: number, total: number): string {
  return total === 0 ? "—" : `${((count / total) * 100).toFixed(1)}%`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(6)}`;
}
