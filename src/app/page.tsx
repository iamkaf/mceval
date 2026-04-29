import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { ModelIcon } from "@/components/model-icon";
import { evaluatedModels, findEvaluatedModel } from "@/data/models";
import { minecraftCoreSuite } from "@/eval/fixtures/minecraft-core";
import { listLatestLeaderboard, listLatestLeaderboardByCategory } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const revalidate = 60;

const categoryNames = ["knowledge", "code", "platforms", "ecosystem"] as const;
const categoryLabels: Record<string, string> = {
  knowledge: "Knowledge",
  code: "Code",
  platforms: "Platforms",
  ecosystem: "Ecosystem",
};

export default async function Home() {
  const { run, entries, categoryMap } = await getPublicLeaderboard();

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <Hero run={run} />
        <Leaderboard run={run} entries={entries} categoryMap={categoryMap} />
        <Methodology />
        <SampleManifest />
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
            <Text variant="mono-secondary">
              Updated {new Date(run.completedAt).toISOString().slice(0, 10)}
            </Text>
          ) : null}
          {run.id ? (
            <Text variant="mono-secondary">
              Run {run.id}
            </Text>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Leaderboard({
  run,
  entries,
  categoryMap,
}: {
  run: { id: string | null };
  entries: LeaderboardEntry[];
  categoryMap: Map<string, Map<string, number | null>>;
}) {
  const scoreByModel = new Map(entries.map((e) => [e.modelId, e]));

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
                    {categoryNames.map((cat) => (
                      <td key={cat} className="px-5 py-4 text-right text-kumo-subtle">
                        {formatScore(catScores?.get(cat) ?? null)}
                      </td>
                    ))}
                    <td className="px-5 py-4 text-right font-medium">
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

function Methodology() {
  return (
    <section className="mb-16 grid gap-6 md:grid-cols-2">
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-6">
        <div className="space-y-4">
          <Text as="h2" variant="heading3">
            Methodology
          </Text>
          <Text variant="secondary" size="sm">
            Runs are artifact-first: prompts, model ids, scorer output, latency, tokens, and cost are
            persisted as JSON before publication. Every run is reproducible from its artifact.
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

function SampleManifest() {
  const samples = minecraftCoreSuite.samples;

  return (
    <section>
      <div className="mb-6">
        <Text as="h2" variant="heading2">
          Sample manifest
        </Text>
        <Text variant="secondary" size="sm">
          {samples.length} hand-authored samples in the current suite.
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {samples.map((sample) => (
          <Surface
            className="rounded-xl border border-kumo-hairline bg-kumo-base p-5"
            key={sample.id}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <Text variant="mono-secondary">
                {sample.id}
              </Text>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-kumo-canvas px-2 py-0.5 text-xs text-kumo-subtle">
                  {(sample.metadata?.category as string) ?? "unknown"}
                </span>
                <span className="rounded-full bg-kumo-canvas px-2 py-0.5 text-xs text-kumo-subtle">
                  {(sample.metadata?.difficulty as string) ?? "unknown"}
                </span>
              </div>
            </div>
            <span className="mb-2 line-clamp-2 block">
              <Text size="sm">{sample.input}</Text>
            </span>
            <Text variant="secondary" size="sm">
              Target: {sample.target ?? "—"}
            </Text>
          </Surface>
        ))}
      </div>
    </section>
  );
}

type LeaderboardEntry = {
  modelId: string;
  scoredCount: number;
  errorCount: number;
  meanScore: number | null;
  accuracy: number | null;
  meanLatencyMs: number | null;
  totalCost: number;
};

async function getPublicLeaderboard() {
  try {
    const env = getMcevalRuntimeEnv();
    if (!env.DB) {
      return { run: { id: null, completedAt: null }, entries: [] as LeaderboardEntry[], categoryMap: new Map() };
    }

    const { run, entries } = await listLatestLeaderboard(env.DB);
    const categoryRows = await listLatestLeaderboardByCategory(env.DB);

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
    };
  } catch {
    return { run: { id: null, completedAt: null }, entries: [] as LeaderboardEntry[], categoryMap: new Map() };
  }
}

function formatScore(score: number | null): string {
  return typeof score === "number" ? `${Math.round(score * 100)}%` : "—";
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

function formatLatency(latency: number | null): string {
  return latency === null ? "—" : `${Math.round(latency).toLocaleString()}ms`;
}
