import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { ModelIcon } from "@/components/model-icon";
import { benchmarks } from "@/data/benchmarks";
import { evaluatedModels, findEvaluatedModel } from "@/data/models";
import { listLatestLeaderboard, type LeaderboardEntry } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const dynamic = "force-dynamic";

const columns = ["Model", ...benchmarks.map((benchmark) => benchmark.name.replace(" Bench", "")), "Overall"];

export default async function Home() {
  const leaderboard = await getPublicLeaderboard();
  const scoreByModel = new Map(leaderboard.entries.map((entry) => [entry.modelId, entry]));

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start justify-between gap-6 border-b border-kumo-hairline pb-6">
          <div className="space-y-2">
            <Text as="h1" variant="heading1">
              MCEval
            </Text>
            <Text variant="secondary">Minecraft AI evaluation</Text>
          </div>
          <Text variant="mono-secondary">
            <a className="transition hover:text-kumo-default" href="https://github.com/iamkaf/mceval">
              GitHub
            </a>
          </Text>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {benchmarks.map((benchmark) => (
            <Surface
              className="rounded-xl border border-kumo-hairline bg-kumo-base p-5"
              key={benchmark.name}
            >
              <div className="space-y-3">
                <Text as="h2" variant="heading3">
                  {benchmark.name}
                </Text>
                <Text variant="secondary" size="sm">
                  {benchmark.scope}
                </Text>
              </div>
            </Surface>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
            <div className="flex items-start justify-between gap-4 border-b border-kumo-hairline px-5 py-4">
              <div className="space-y-1">
                <Text as="h2" variant="heading3">
                  Leaderboard
                </Text>
                <Text variant="secondary" size="sm">
                  {leaderboard.runId
                    ? `Latest run ${leaderboard.runId}`
                    : "No published run yet. The table shows the evaluated model set."}
                </Text>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="border-b border-kumo-hairline text-kumo-subtle">
                  <tr>
                    {columns.map((column) => (
                      <th className="px-5 py-3 font-medium" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluatedModels.map((entry) => {
                    const score = scoreByModel.get(entry.modelId);
                    return (
                      <tr className="border-b border-kumo-hairline last:border-0" key={entry.modelId}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ModelIcon icon={entry.icon} iconAlt={entry.iconAlt} />
                            <div className="space-y-1">
                              <Text>{entry.displayName}</Text>
                              <Text variant="secondary" size="sm">
                                {entry.provider}
                              </Text>
                            </div>
                          </div>
                        </td>
                        {benchmarks.map((benchmark) => (
                          <td className="px-5 py-4 text-kumo-subtle" key={benchmark.name}>
                            {score ? formatScore(score.accuracy) : "—"}
                          </td>
                        ))}
                        <td className="px-5 py-4 text-kumo-subtle">{score ? formatScore(score.accuracy) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>

          <aside className="space-y-6">
            <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
              <div className="space-y-4">
                <Text as="h2" variant="heading3">
                  Methodology
                </Text>
                <Text variant="secondary" size="sm">
                  Runs are artifact-first: prompts, model ids, scorer output, latency, tokens, and cost are persisted before
                  publication. Deterministic scoring is preferred over model-graded judgment.
                </Text>
                {leaderboard.updatedAt ? (
                  <Text variant="mono-secondary">
                    Updated {new Date(leaderboard.updatedAt).toISOString().slice(0, 10)}
                  </Text>
                ) : null}
              </div>
            </Surface>

            <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
              <div className="space-y-4">
                <Text as="h2" variant="heading3">
                  Evaluated models
                </Text>
                <div className="divide-y divide-kumo-hairline">
                  {evaluatedModels.map((entry) => (
                    <div className="grid grid-cols-[8rem_1fr] items-center gap-4 py-3 first:pt-0 last:pb-0" key={entry.modelId}>
                      <div className="flex items-center gap-3">
                        <ModelIcon icon={entry.icon} iconAlt={entry.iconAlt} />
                        <Text variant="secondary" size="sm">
                          {entry.provider}
                        </Text>
                      </div>
                      <Text size="sm">{entry.displayName}</Text>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          </aside>
        </section>
      </div>
    </main>
  );
}

type PublicPageLeaderboard = {
  runId: string | null;
  updatedAt: string | null;
  entries: LeaderboardEntry[];
};

async function getPublicLeaderboard(): Promise<PublicPageLeaderboard> {
  try {
    const env = getMcevalRuntimeEnv();
    if (!env.DB) {
      return { runId: null, updatedAt: null, entries: [] };
    }

    const leaderboard = await listLatestLeaderboard(env.DB);
    return {
      runId: leaderboard.run?.id ?? null,
      updatedAt: leaderboard.run?.completedAt ?? null,
      entries: leaderboard.entries.filter((entry) => findEvaluatedModel(entry.modelId)),
    };
  } catch {
    return { runId: null, updatedAt: null, entries: [] };
  }
}

function formatScore(score: number | null): string {
  return typeof score === "number" ? `${Math.round(score * 100)}%` : "—";
}
