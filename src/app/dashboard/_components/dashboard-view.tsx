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
import type { SuiteDraftSummary, SuiteSummary, SuiteVersionSummary } from "@/server/db/cloud-suites";

const EMPTY_SUITES: SuiteSummary[] = [];
const EMPTY_SUITE_VERSIONS: SuiteVersionSummary[] = [];
const EMPTY_SUITE_DRAFTS: SuiteDraftSummary[] = [];

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
  suites?: SuiteSummary[];
  suiteVersions?: SuiteVersionSummary[];
  suiteDrafts?: SuiteDraftSummary[];
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

export function DashboardView({
  auth,
  logout,
  runs,
  leaderboard,
  latestRunDetail,
  suites = EMPTY_SUITES,
  suiteVersions = EMPTY_SUITE_VERSIONS,
  suiteDrafts = EMPTY_SUITE_DRAFTS,
}: DashboardViewProps) {
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
            { value: "suites", label: "Suites" },
            { value: "models", label: "Models" },
            { value: "samples", label: "Samples" },
            { value: "quality", label: "Quality" },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        />

        {activeTab === "runs" && <RunsTab runs={runs} suiteVersions={suiteVersions} />}
        {activeTab === "suites" && <SuitesTab suites={suites} suiteVersions={suiteVersions} suiteDrafts={suiteDrafts} />}
        {activeTab === "models" && <ModelsTab leaderboard={leaderboard} />}
        {activeTab === "samples" && <SamplesTab />}
        {activeTab === "quality" && <QualityTab latestRunDetail={latestRunDetail} />}
      </div>
    </main>
  );
}

function RunsTab({ runs, suiteVersions }: { runs: BenchmarkRunSummary[]; suiteVersions: SuiteVersionSummary[] }) {
  const runnableVersions = suiteVersions.filter((version) => version.status === "ready" || version.status === "published");

  if (runs.length === 0) {
    return (
      <div className="space-y-4">
        <RunStartForm suiteVersions={runnableVersions} />
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
          <div className="space-y-3">
            <Text as="h2" variant="heading3">
              No benchmark runs yet
            </Text>
            <Text variant="secondary">
              Create a cloud run from ready or published suite versions. Jobs are processed asynchronously through Queues.
            </Text>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RunStartForm suiteVersions={runnableVersions} />
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
                    <a className="text-kumo-brand transition hover:text-kumo-default" href={`/dashboard/runs/${encodeURIComponent(run.id)}`}>
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
    </div>
  );
}

function RunStartForm({ suiteVersions }: { suiteVersions: SuiteVersionSummary[] }) {
  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <form action="/dashboard/runs/start" method="post" className="space-y-5">
        <div>
          <Text as="h2" variant="heading3">Start cloud run</Text>
          <Text variant="secondary" size="sm">Select one or more ready/published suite versions and registered models.</Text>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Text variant="secondary" size="sm">Suite versions</Text>
            <div className="max-h-56 space-y-2 overflow-auto rounded-lg border border-kumo-hairline p-3">
              {suiteVersions.length === 0 ? <Text variant="secondary" size="sm">No ready or published suite versions.</Text> : suiteVersions.map((version) => (
                <label aria-label={`${version.humanName} ${version.suiteName}`} key={version.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="suiteVersionIds" value={version.id} className="mt-1" />
                  <span>
                    <span className="block">{version.humanName}</span>
                    <span className="text-kumo-subtle">{version.suiteName} · {version.status} · {version.sampleCount} samples</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Text variant="secondary" size="sm">Registered models</Text>
            <div className="max-h-56 space-y-2 overflow-auto rounded-lg border border-kumo-hairline p-3">
              {evaluatedModels.map((model) => (
                <label aria-label={`${model.displayName} ${model.modelId}`} key={model.modelId} className="flex items-start gap-2 text-sm">
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
        <Button type="submit">Queue run</Button>
      </form>
    </Surface>
  );
}

function SuitesTab({
  suites,
  suiteVersions,
  suiteDrafts,
}: {
  suites: SuiteSummary[];
  suiteVersions: SuiteVersionSummary[];
  suiteDrafts: SuiteDraftSummary[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {suites.map((suite) => {
          const drafts = suiteDrafts.filter((draft) => draft.suiteId === suite.id);
          const versions = suiteVersions.filter((version) => version.suiteId === suite.id);
          return (
            <Surface key={suite.id} className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
              <div className="mb-4 space-y-2">
                <Text as="h2" variant="heading3">{suite.name}</Text>
                <Text variant="secondary" size="sm">{suite.description ?? "No description"}</Text>
                <Text variant="mono-secondary">Published: {suite.publishedVersionName ?? "none"}</Text>
              </div>

              <form action="/dashboard/suites/drafts" method="post" className="mb-5 flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="suiteId" value={suite.id} />
                <input
                  name="humanName"
                  placeholder="DraftName1"
                  className="min-w-0 flex-1 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm"
                />
                <Button type="submit">Create draft</Button>
              </form>

              <div className="space-y-4">
                <div>
                  <Text variant="secondary" size="sm">Drafts</Text>
                  {drafts.length === 0 ? (
                    <Text variant="secondary" size="sm">No drafts.</Text>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {drafts.map((draft) => (
                        <div key={draft.id} className="rounded-lg border border-kumo-hairline p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <a className="text-kumo-brand transition hover:text-kumo-default" href={`/dashboard/suites/drafts/${encodeURIComponent(draft.id)}`}>{draft.humanName}</a>
                            <Text variant="mono-secondary">{draft.sampleCount} samples</Text>
                          </div>
                          <form action={`/dashboard/suites/drafts/${encodeURIComponent(draft.id)}/freeze`} method="post" className="flex flex-col gap-2 sm:flex-row">
                            <input
                              name="humanName"
                              placeholder="MCHistory1"
                              className="min-w-0 flex-1 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm"
                            />
                            <Button type="submit">Freeze ready</Button>
                          </form>
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-kumo-subtle">Add sample</summary>
                            <form action={`/dashboard/suites/drafts/${encodeURIComponent(draft.id)}/samples`} method="post" className="mt-3 grid gap-2">
                              <input name="stableId" placeholder="knowledge-001" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                              <textarea name="input" placeholder="Prompt" className="min-h-20 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                              <input name="target" placeholder="Target answer" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                              <input name="acceptedTargets" placeholder="Accepted aliases, comma separated" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                              <div className="grid gap-2 sm:grid-cols-3">
                                <input name="category" placeholder="category" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                                <input name="difficulty" placeholder="difficulty" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                                <input name="tags" placeholder="tags" className="rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                              </div>
                              <textarea name="rationale" placeholder="Rationale/source" className="min-h-16 rounded-md border border-kumo-hairline bg-kumo-canvas px-3 py-2 text-sm" />
                              <div><Button type="submit">Add sample</Button></div>
                            </form>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Text variant="secondary" size="sm">Versions</Text>
                  {versions.length === 0 ? (
                    <Text variant="secondary" size="sm">No versions.</Text>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {versions.map((version) => (
                        <div key={version.id} className="flex flex-col gap-2 rounded-lg border border-kumo-hairline p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <Text>{version.humanName}</Text>
                            <Text variant="secondary" size="sm">{version.status} · {version.sampleCount} samples · {version.suiteHash.slice(0, 8)}</Text>
                          </div>
                          {version.status === "ready" ? (
                            <form action={`/dashboard/suites/versions/${encodeURIComponent(version.id)}/publish`} method="post">
                              <Button type="submit">Publish</Button>
                            </form>
                          ) : null}
                          <form action={`/dashboard/suites/versions/${encodeURIComponent(version.id)}/clone`} method="post" className="flex gap-2">
                            <input name="humanName" placeholder="DraftName1" className="w-32 rounded-md border border-kumo-hairline bg-kumo-canvas px-2 py-1 text-sm" />
                            <Button type="submit">Clone</Button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
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
