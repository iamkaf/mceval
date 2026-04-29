import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { CostBreakdownBarChart } from "@/components/cost-breakdown-bar-chart";
import { LeaderboardBarChart } from "@/components/leaderboard-bar-chart";
import { LeaderboardScatterChart } from "@/components/leaderboard-scatter-chart";
import { TokenUsageBarChart } from "@/components/token-usage-bar-chart";
import { ModelIcon } from "@/components/model-icon";
import { evaluatedModels, findEvaluatedModel } from "@/data/models";
import { listPublishedSuiteSamples, listSuiteVersions, type PublishedSuiteSample, type SuiteVersionSummary } from "@/server/db/cloud-suites";
import {
  getModelTokenUsage,
  listLatestLeaderboard,
  listLatestLeaderboardByCategory,
} from "@/server/db/benchmarks";
import type { LeaderboardEntry } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const revalidate = 60;

const categoryNames = ["knowledge", "code", "platforms", "ecosystem"] as const;
const categoryLabels: Record<string, string> = {
  knowledge: "Knowledge",
  code: "Code",
  platforms: "Platforms",
  ecosystem: "Ecosystem",
};

const PALETTE = [
  "#1a1a1a",
  "#c17848",
  "#3b82f6",
  "#1a1a1a",
  "#3b82f6",
  "#f43f5e",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#22c55e",
];

function getModelColor(modelId: string): string {
  const index = evaluatedModels.findIndex((m) => m.modelId === modelId);
  return PALETTE[Math.max(0, index) % PALETTE.length];
}

export default async function Home() {
  const { run, entries, categoryMap, tokenUsage, publishedVersions, publishedSamples } = await getPublicLeaderboard();

  const scatterData = entries
    .map((entry) => {
      const model = findEvaluatedModel(entry.modelId);
      if (!model) return null;
      return {
        name: model.displayName,
        cost: entry.totalCost,
        score: entry.accuracy ?? 0,
        color: getModelColor(entry.modelId),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const tokenBarData = tokenUsage
    .map((t) => {
      const model = findEvaluatedModel(t.modelId);
      if (!model) return null;
      return {
        name: model.displayName,
        promptTokens: t.promptTokens,
        completionTokens: t.completionTokens,
        color: getModelColor(t.modelId),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const costBarData = entries
    .map((entry) => {
      const model = findEvaluatedModel(entry.modelId);
      if (!model) return null;
      return {
        name: model.displayName,
        cost: entry.totalCost,
        color: getModelColor(entry.modelId),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <Hero run={run} />
        <PublishedSuiteLabels versions={publishedVersions} />
        <LeaderboardBarChart entries={entries} models={evaluatedModels} />
        <LeaderboardTable run={run} entries={entries} categoryMap={categoryMap} />
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          <TokenUsageChart data={tokenBarData} />
          <CostBreakdownChart data={costBarData} />
        </div>
        <IntelligenceVsCostChart data={scatterData} />
        <Methodology />
        <SampleManifest samples={publishedSamples} />
        <Footer />
      </div>
    </main>
  );
}

function Hero({ run }: { run: { id: string | null; completedAt: string | null } }) {
  return (
    <section className="mb-12 border-b border-kumo-hairline pb-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Text as="h1" variant="heading1">
            MCEval
          </Text>
          <div className="max-w-xl">
            <Text variant="secondary">
              Open-source benchmark for measuring how well language models understand Minecraft: vanilla
              mechanics, versions, modding concepts, platforms, and ecosystem details.
            </Text>
          </div>
          <Text variant="mono-secondary">
            <a className="transition hover:text-kumo-default" href="https://github.com/iamkaf/mceval">
              github.com/iamkaf/mceval
            </a>
          </Text>
        </div>
        <div className="shrink-0 text-right">
          {run.completedAt ? (
            <div>
              <Text variant="mono-secondary">
                Updated {new Date(run.completedAt).toISOString().slice(0, 10)}
              </Text>
            </div>
          ) : null}
          {run.id ? (
            <div>
              <Text variant="mono-secondary">
                Run {run.id}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TokenUsageChart({
  data,
}: {
  data: Array<{ name: string; promptTokens: number; completionTokens: number; color: string }>;
}) {
  if (data.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <Text as="h2" variant="heading3">
          Token usage
        </Text>
        <Text variant="secondary" size="sm">
          Prompt and completion tokens per model.
        </Text>
      </div>
      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base p-4">
        <TokenUsageBarChart data={data} />
      </Surface>
    </section>
  );
}

function CostBreakdownChart({
  data,
}: {
  data: Array<{ name: string; cost: number; color: string }>;
}) {
  if (data.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <Text as="h2" variant="heading3">
          Cost breakdown
        </Text>
        <Text variant="secondary" size="sm">
          Total evaluation cost per model.
        </Text>
      </div>
      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base p-4">
        <CostBreakdownBarChart data={data} />
      </Surface>
    </section>
  );
}

function IntelligenceVsCostChart({
  data,
}: {
  data: Array<{ name: string; cost: number; score: number; color: string }>;
}) {
  if (data.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="mb-6">
        <Text as="h2" variant="heading2">
          Intelligence vs cost
        </Text>
        <Text variant="secondary" size="sm">
          Overall score plotted against total evaluation cost. Top-left is the most attractive quadrant.
        </Text>
      </div>
      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base p-5">
        <LeaderboardScatterChart data={data} />
      </Surface>
    </section>
  );
}

function LeaderboardTable({
  run,
  entries,
  categoryMap,
}: {
  run: { id: string | null };
  entries: LeaderboardEntry[];
  categoryMap: Map<string, Map<string, number | null>>;
}) {
  const scoreByModel = new Map(entries.map((e) => [e.modelId, e]));

  const maxOverall = Math.max(...entries.map((e) => e.accuracy ?? 0), 0);
  const maxByCategory = new Map<string, number>();
  for (const cat of categoryNames) {
    const values = Array.from(categoryMap.values())
      .map((m) => m.get(cat))
      .filter((v): v is number => v !== null && v !== undefined);
    maxByCategory.set(cat, Math.max(...values, 0));
  }

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Text as="h2" variant="heading2">
            Leaderboard
          </Text>
          <Text variant="secondary" size="sm">
            {run.id
              ? "Latest evaluated run, sorted by overall accuracy."
              : "No published run yet. The table shows the evaluated model set."}
          </Text>
        </div>
      </div>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="border-b border-kumo-hairline text-kumo-subtle">
              <tr>
                <th className="px-5 py-3 font-medium">Model</th>
                {categoryNames.map((cat) => (
                  <th key={cat} className="px-5 py-3 font-medium text-right">
                    {categoryLabels[cat]}
                  </th>
                ))}
                <th className="px-5 py-3 font-medium text-right">Overall</th>
                <th className="px-5 py-3 font-medium text-right">Cost</th>
                <th className="px-5 py-3 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedModels.map((model) => {
                const entry = scoreByModel.get(model.modelId);
                const catScores = categoryMap.get(model.modelId);
                return (
                  <tr
                    className="border-b border-kumo-hairline last:border-0 transition hover:bg-kumo-canvas/50"
                    key={model.modelId}
                  >
                    <td className="px-5 py-4">
                      <a href={`/${model.slug}`} className="flex items-center gap-3 transition hover:opacity-80">
                        <ModelIcon icon={model.icon} iconAlt={model.iconAlt} />
                        <div className="space-y-0.5">
                          <Text>{model.displayName}</Text>
                          <Text variant="secondary" size="sm">
                            {model.provider}
                          </Text>
                        </div>
                      </a>
                    </td>
                    {categoryNames.map((cat) => {
                      const score = catScores?.get(cat) ?? null;
                      const maxCat = maxByCategory.get(cat) ?? 0;
                      const isMax = score !== null && Math.round(score * 100) === Math.round(maxCat * 100);
                      return (
                        <td
                          key={cat}
                          className={`px-5 py-4 text-right text-kumo-subtle ${isMax ? "font-bold text-kumo-default" : ""}`}
                        >
                          {formatScore(score)}
                        </td>
                      );
                    })}
                    <td
                      className={`px-5 py-4 text-right font-medium ${
                        entry?.accuracy !== null &&
                        entry?.accuracy !== undefined &&
                        Math.round(entry.accuracy * 100) === Math.round(maxOverall * 100)
                          ? "font-bold text-kumo-default"
                          : ""
                      }`}
                    >
                      {formatScore(entry?.accuracy ?? null)}
                    </td>
                    <td className="px-5 py-4 text-right text-kumo-subtle">
                      {entry ? formatCost(entry.totalCost) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-kumo-subtle">
                      {formatLatency(entry?.meanLatencyMs ?? null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>
    </section>
  );
}

function PublishedSuiteLabels({ versions }: { versions: SuiteVersionSummary[] }) {
  if (versions.length === 0) return null;
  return (
    <section className="mb-10 grid gap-3 md:grid-cols-4">
      {versions.map((version) => (
        <Surface key={version.id} className="rounded-xl border border-kumo-hairline bg-kumo-base p-4">
          <Text variant="secondary" size="sm">{version.suiteName}</Text>
          <Text variant="mono-secondary">{version.humanName}</Text>
        </Surface>
      ))}
    </section>
  );
}

function Methodology() {
  return (
    <section className="mb-16 grid gap-6 md:grid-cols-2">
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-6">
        <div className="space-y-4">
          <Text as="h2" variant="heading3">
            Methodology
          </Text>
          <Text variant="secondary" size="sm">
            Runs are cloud-executed through Cloudflare Queues: prompts, model ids, scorer output,
            latency, tokens, and cost are persisted in D1 for publication and export.
          </Text>
          <Text variant="secondary" size="sm">
            Scoring is deterministic: normalized exact match, alias matching, and regex extraction
            come before any model-graded judgment. Cost, latency, and error rates are visible for
            every result.
          </Text>
          <Text variant="secondary" size="sm">
            Evaluations use each model&apos;s default reasoning level unless a run artifact explicitly
            states otherwise.
          </Text>
        </div>
      </Surface>

      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-6">
        <div className="space-y-4">
          <Text as="h2" variant="heading3">
            Suite
          </Text>
          <Text variant="secondary" size="sm">
            Samples are hand-authored and curated over time. Each sample has a stable id, direct
            prompt, target answer, accepted aliases for wording variation, and tags for topic and
            difficulty.
          </Text>
          <Text variant="secondary" size="sm">
            The current suite is intentionally small and will grow. Validation tooling checks ids,
            categories, accepted targets, and scoring metadata on every change.
          </Text>
        </div>
      </Surface>
    </section>
  );
}

function SampleManifest({ samples }: { samples: PublishedSuiteSample[] }) {
  if (samples.length === 0) return null;

  return (
    <section>
      <div className="mb-6">
        <Text as="h2" variant="heading2">
          Sample manifest
        </Text>
        <Text variant="secondary" size="sm">
          {samples.length} hand-authored samples across published suite versions.
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {samples.map((sample) => (
          <Surface
            className="rounded-xl border border-kumo-hairline bg-kumo-base p-5"
              key={`${sample.versionName}:${sample.stableId}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <Text variant="mono-secondary">
                  {sample.stableId}
              </Text>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-kumo-canvas px-2 py-0.5 text-xs text-kumo-subtle">
                  {sample.category}
                </span>
                <span className="rounded-full bg-kumo-canvas px-2 py-0.5 text-xs text-kumo-subtle">
                  {sample.difficulty}
                </span>
              </div>
            </div>
            <span className="mb-2 line-clamp-2 block">
              <Text size="sm">{sample.input}</Text>
            </span>
            <Text variant="secondary" size="sm">
              {sample.suiteName} · {sample.versionName} · Target: {sample.target}
            </Text>
          </Surface>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-kumo-hairline pt-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-mono text-kumo-subtle">
          MCEval — Minecraft AI evaluation
        </span>
        <span className="text-sm font-mono text-kumo-subtle">
          <a className="transition hover:text-kumo-default" href="/dashboard">
            Dashboard
          </a>
        </span>
      </div>
    </footer>
  );
}

async function getPublicLeaderboard() {
  try {
    const env = getMcevalRuntimeEnv();
    if (!env.DB) {
      return {
        run: { id: null, completedAt: null },
        entries: [] as LeaderboardEntry[],
        categoryMap: new Map(),
        tokenUsage: [],
        publishedVersions: [] as SuiteVersionSummary[],
        publishedSamples: [] as PublishedSuiteSample[],
      };
    }

    const [{ run, entries }, categoryRows, tokenUsage, allVersions, publishedSamples] = await Promise.all([
      listLatestLeaderboard(env.DB),
      listLatestLeaderboardByCategory(env.DB),
      getModelTokenUsage(env.DB),
      listSuiteVersions(env.DB),
      listPublishedSuiteSamples(env.DB),
    ]);
    const publishedVersions = allVersions.filter((version) => version.status === "published");

    const categoryMap = new Map<string, Map<string, number | null>>();
    for (const row of categoryRows) {
      if (!categoryMap.has(row.modelId)) {
        categoryMap.set(row.modelId, new Map());
      }
      categoryMap.get(row.modelId)!.set(row.category, row.accuracy);
    }

    return {
      run: { id: run?.id ?? null, completedAt: run?.completedAt ?? null },
      entries: entries.filter((entry) => findEvaluatedModel(entry.modelId)) as LeaderboardEntry[],
      categoryMap,
      tokenUsage,
      publishedVersions,
      publishedSamples,
    };
  } catch {
    return {
      run: { id: null, completedAt: null },
      entries: [] as LeaderboardEntry[],
      categoryMap: new Map(),
      tokenUsage: [],
      publishedVersions: [] as SuiteVersionSummary[],
      publishedSamples: [] as PublishedSuiteSample[],
    };
  }
}

function formatScore(score: number | null): string {
  return typeof score === "number" ? `${Math.round(score * 100)}` : "—";
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

function formatLatency(latency: number | null): string {
  return latency === null ? "—" : `${Math.round(latency).toLocaleString()}ms`;
}
