"use client";

import { useState } from "react";

import { Input } from "@cloudflare/kumo/components/input";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Table } from "@cloudflare/kumo/components/table";
import { Text } from "@cloudflare/kumo/components/text";

import { findEvaluatedModel } from "@/data/models";
import type { LeaderboardEntry } from "@/server/db/benchmarks";
import { LeaderboardScatterChart } from "@/components/leaderboard-scatter-chart";

const COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee",
  "#60a5fa", "#a78bfa", "#f472b6", "#94a3b8", "#34d399",
];

export type ModelsViewProps = {
  leaderboard: LeaderboardEntry[];
};

export function ModelsView({ leaderboard }: ModelsViewProps) {
  const [filter, setFilter] = useState("");

  const filtered = leaderboard.filter((entry) => {
    const model = findEvaluatedModel(entry.modelId);
    const term = filter.toLowerCase();
    return (
      !term ||
      model?.displayName.toLowerCase().includes(term) ||
      entry.modelId.toLowerCase().includes(term)
    );
  });

  const scatterData = leaderboard.map((entry, i) => {
    const model = findEvaluatedModel(entry.modelId);
    return {
      name: model?.displayName ?? entry.modelId,
      cost: entry.totalCost,
      score: entry.accuracy ?? 0,
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <div className="space-y-6">
      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">Models</Text>
        <Text variant="secondary">Leaderboard and cost-performance analysis.</Text>
      </header>

      {scatterData.length > 0 && (
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
          <div className="mb-4">
            <Text as="h2" variant="heading3">Cost vs. Accuracy</Text>
          </div>
          <LeaderboardScatterChart data={scatterData} />
        </Surface>
      )}

      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter models..."
          aria-label="Filter models"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        {filter && (
          <button className="text-sm text-kumo-subtle hover:text-kumo-default" onClick={() => setFilter("")}>
            Clear
          </button>
        )}
      </div>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="overflow-x-auto">
          <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>Model</Table.Head>
                <Table.Head>Accuracy</Table.Head>
                <Table.Head>Scored</Table.Head>
                <Table.Head>Errors</Table.Head>
                <Table.Head>Cost</Table.Head>
                <Table.Head>Latency</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filtered.map((entry) => {
                const model = findEvaluatedModel(entry.modelId);
                return (
                  <Table.Row key={entry.modelId}>
                    <Table.Cell>
                      <a
                        className="text-kumo-brand transition hover:text-kumo-default"
                        href={`/dashboard/models/${encodeURIComponent(entry.modelId)}`}
                      >
                        {model?.displayName ?? entry.modelId}
                      </a>
                      <Text variant="secondary" size="sm">{entry.modelId}</Text>
                    </Table.Cell>
                    <Table.Cell className="text-kumo-subtle">
                      {entry.accuracy === null ? "—" : `${(entry.accuracy * 100).toFixed(1)}%`}
                    </Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{entry.scoredCount}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{entry.errorCount}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">${entry.totalCost.toFixed(6)}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">
                      {entry.meanLatencyMs === null ? "—" : `${Math.round(entry.meanLatencyMs).toLocaleString()}ms`}
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
