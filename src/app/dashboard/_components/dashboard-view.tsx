"use client";

import { useState } from "react";

import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Tabs } from "@cloudflare/kumo/components/tabs";
import { Text } from "@cloudflare/kumo/components/text";
import type { AuthenticatedSessionResult } from "@iamkaf/uriel";

import { evaluatedModels, findEvaluatedModel } from "@/data/models";
import { minecraftCoreSuite } from "@/eval/fixtures/minecraft-core";
import type {
  BenchmarkRunDetail,
  BenchmarkRunSummary,
  LeaderboardEntry,
} from "@/server/db/benchmarks";

export type LogoutForm = {
  action: string;
  body: string;
};

export type DashboardViewProps = {
  auth: {
    result: AuthenticatedSessionResult;
  };
  logout: LogoutForm;
  runs: BenchmarkRunSummary[];
  leaderboard: LeaderboardEntry[];
  latestRunDetail: BenchmarkRunDetail | null;
};

function parseReturnTo(body: string): string {
  return new URLSearchParams(body).get("returnTo") ?? "/";
}

function LogoutFormView({ logout }: { logout: LogoutForm }) {
  return (
    <form action={logout.action} method="post">
      <input type="hidden" name="returnTo" value={parseReturnTo(logout.body)} />
      <Button type="submit">Log out</Button>
    </form>
  );
}

export function DashboardView({ auth, logout, runs, leaderboard, latestRunDetail }: DashboardViewProps) {
  const user = auth.result.user;
  const [activeTab, setActiveTab] = useState("runs");

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-kumo-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Text as="h1" variant="heading1">
              MCEval Dashboard
            </Text>
            <Text variant="secondary">Authenticated as {user.displayName}</Text>
          </div>
          <LogoutFormView logout={logout} />
        </header>

        <Tabs
          variant="underline"
          tabs={[
            { value: "runs", label: "Runs" },
            { value: "models", label: "Models" },
            { value: "samples", label: "Samples" },
            { value: "quality", label: "Quality" },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        />

        {activeTab === "runs" && <RunsTab runs={runs} />}
        {activeTab === "models" && <ModelsTab leaderboard={leaderboard} />}
        {activeTab === "samples" && <SamplesTab />}
        {activeTab === "quality" && <QualityTab latestRunDetail={latestRunDetail} />}
      </div>
    </main>
  );
}

function RunsTab({ runs }: { runs: BenchmarkRunSummary[] }) {
  if (runs.length === 0) {
    return (
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
        <div className="space-y-3">
          <Text as="h2" variant="heading3">
            No benchmark runs imported yet
          </Text>
          <Text variant="secondary">
            Run a benchmark from the CLI, then import the run log into D1.
          </Text>
          <pre className="overflow-x-auto rounded-lg border border-kumo-hairline bg-kumo-canvas p-3 text-sm text-kumo-subtle">
            corepack pnpm run eval:import-run .mceval/runs/&lt;runId&gt;.json
          </pre>
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
      <div className="border-b border-kumo-hairline px-5 py-4">
        <Text as="h2" variant="heading3">
          Recent benchmark runs
        </Text>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="border-b border-kumo-hairline text-kumo-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">Run</th>
              <th className="px-5 py-3 font-medium">Suite</th>
              <th className="px-5 py-3 font-medium">Models</th>
              <th className="px-5 py-3 font-medium">Results</th>
              <th className="px-5 py-3 font-medium">Scored</th>
              <th className="px-5 py-3 font-medium">Errors</th>
              <th className="px-5 py-3 font-medium">Accuracy</th>
              <th className="px-5 py-3 font-medium">Cost</th>
              <th className="px-5 py-3 font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr className="border-b border-kumo-hairline last:border-0" key={run.id}>
                <td className="px-5 py-4 font-mono text-xs">
                  <a
                    className="text-kumo-brand transition hover:text-kumo-default"
                    href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                  >
                    {run.id}
                  </a>
                </td>
                <td className="px-5 py-4">{run.suiteName}</td>
                <td className="px-5 py-4 text-kumo-subtle">{run.modelCount}</td>
                <td className="px-5 py-4 text-kumo-subtle">{run.resultCount}</td>
                <td className="px-5 py-4 text-kumo-subtle">{run.scoredCount}</td>
                <td className="px-5 py-4 text-kumo-subtle">{run.errorCount}</td>
                <td className="px-5 py-4 text-kumo-subtle">{formatAccuracy(run.accuracy)}</td>
                <td className="px-5 py-4 text-kumo-subtle">{formatCost(run.totalCost)}</td>
                <td className="px-5 py-4 text-kumo-subtle">{formatLatency(run.meanLatencyMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function ModelsTab({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const scoreByModel = new Map(leaderboard.map((e) => [e.modelId, e]));

  return (
    <div className="space-y-4">
      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">
            Evaluated models
          </Text>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead className="border-b border-kumo-hairline text-kumo-subtle">
              <tr>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Accuracy</th>
                <th className="px-5 py-3 font-medium">Scored</th>
                <th className="px-5 py-3 font-medium">Errors</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedModels.map((model) => {
                const entry = scoreByModel.get(model.modelId);
                return (
                  <tr className="border-b border-kumo-hairline last:border-0" key={model.modelId}>
                    <td className="px-5 py-4">
                      <a
                        className="text-kumo-brand transition hover:text-kumo-default"
                        href={`/dashboard/models/${encodeURIComponent(model.modelId)}`}
                      >
                        {model.displayName}
                      </a>
                      <Text variant="secondary" size="sm">
                        {model.modelId}
                      </Text>
                    </td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatAccuracy(entry?.accuracy ?? null)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{entry?.scoredCount ?? "—"}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{entry?.errorCount ?? "—"}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{entry ? formatCost(entry.totalCost) : "—"}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatLatency(entry?.meanLatencyMs ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}

function SamplesTab() {
  const samples = minecraftCoreSuite.samples;

  return (
    <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
      <div className="border-b border-kumo-hairline px-5 py-4">
        <Text as="h2" variant="heading3">
          Sample manifest
        </Text>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead className="border-b border-kumo-hairline text-kumo-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Difficulty</th>
              <th className="px-5 py-3 font-medium">Prompt</th>
              <th className="px-5 py-3 font-medium">Target</th>
              <th className="px-5 py-3 font-medium">Aliases</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => {
              const aliases = (sample.metadata?.acceptedTargets as string[] | undefined) ?? [];
              return (
                <tr className="border-b border-kumo-hairline last:border-0" key={sample.id}>
                  <td className="px-5 py-4 font-mono text-xs">{sample.id}</td>
                  <td className="px-5 py-4">{(sample.metadata?.category as string) ?? "—"}</td>
                  <td className="px-5 py-4">{(sample.metadata?.difficulty as string) ?? "—"}</td>
                  <td className="max-w-md px-5 py-4">
                    <Text size="sm">{sample.input}</Text>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{sample.target ?? "—"}</td>
                  <td className="px-5 py-4 font-mono text-xs">{aliases.join(", ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function QualityTab({ latestRunDetail }: { latestRunDetail: BenchmarkRunDetail | null }) {
  if (!latestRunDetail) {
    return (
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
        <Text variant="secondary">No run data available for quality analysis.</Text>
      </Surface>
    );
  }

  const { run, results } = latestRunDetail;
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
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Accuracy" value={formatAccuracy(run.accuracy)} />
        <MetricCard label="Error rate" value={`${((errors.length / results.length) * 100).toFixed(1)}%`} />
        <MetricCard label="Unscored rate" value={`${((unscored.length / results.length) * 100).toFixed(1)}%`} />
        <MetricCard label="Total cost" value={formatCost(run.totalCost)} />
      </div>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">
            Result distribution
          </Text>
        </div>
        <div className="grid gap-px bg-kumo-hairline sm:grid-cols-4">
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Perfect
            </Text>
            <Text variant="heading2">{perfect.length}</Text>
          </div>
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Incorrect
            </Text>
            <Text variant="heading2">{zero.length}</Text>
          </div>
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Errors
            </Text>
            <Text variant="heading2">{errors.length}</Text>
          </div>
          <div className="bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Unscored
            </Text>
            <Text variant="heading2">{unscored.length}</Text>
          </div>
        </div>
      </Surface>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">
            Per-model quality
          </Text>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead className="border-b border-kumo-hairline text-kumo-subtle">
              <tr>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Correct</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Accuracy</th>
                <th className="px-5 py-3 font-medium">Mean cost</th>
                <th className="px-5 py-3 font-medium">Mean latency</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(modelStats.entries()).map(([modelId, stats]) => {
                const model = findEvaluatedModel(modelId);
                return (
                  <tr className="border-b border-kumo-hairline last:border-0" key={modelId}>
                    <td className="px-5 py-4">{model?.displayName ?? modelId}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{stats.correct}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{stats.total}</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {((stats.correct / stats.total) * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatCost(stats.cost / stats.total)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {Math.round(stats.latency / stats.total).toLocaleString()}ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <Text variant="secondary" size="sm">
        {label}
      </Text>
      <Text variant="heading2">{value}</Text>
    </Surface>
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
