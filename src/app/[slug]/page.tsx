import { notFound } from "next/navigation";

import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { ModelIcon } from "@/components/model-icon";
import { evaluatedModels, findModelBySlug } from "@/data/models";
import { getModelLatestResults } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const revalidate = 60;

export function generateStaticParams() {
  return evaluatedModels.map((model) => ({ slug: model.slug }));
}

export default async function ModelCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = findModelBySlug(slug);
  if (!model) {
    notFound();
  }

  const env = getMcevalRuntimeEnv();
  if (!env.DB) {
    notFound();
  }

  const results = await getModelLatestResults(env.DB, model.modelId);
  if (results.length === 0) {
    notFound();
  }

  const accuracy =
    results.filter((r) => r.score === 1).length / results.filter((r) => r.score !== null).length || 0;
  const totalCost = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const meanLatency =
    results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length || 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-10 border-b border-kumo-hairline pb-8">
          <span className="mb-4 block">
            <Text variant="mono-secondary">
              <a className="transition hover:text-kumo-default" href="/">
                ← Leaderboard
              </a>
            </Text>
          </span>
          <div className="flex items-center gap-4">
            <ModelIcon icon={model.icon} iconAlt={model.iconAlt} />
            <div className="space-y-1">
              <Text as="h1" variant="heading1">
                {model.displayName}
              </Text>
              <Text variant="secondary">
                {model.provider} · {model.modelId}
              </Text>
            </div>
          </div>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Accuracy
            </Text>
            <Text variant="heading2">{formatScore(accuracy)}</Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Cost
            </Text>
            <Text variant="heading2">{formatCost(totalCost)}</Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">
              Mean latency
            </Text>
            <Text variant="heading2">{formatLatency(meanLatency)}</Text>
          </Surface>
        </section>

        <section>
          <div className="mb-6">
            <Text as="h2" variant="heading2">
              Results
            </Text>
          </div>
          <div className="space-y-4">
            {results.map((result) => (
              <Surface
                className="rounded-xl border border-kumo-hairline bg-kumo-base p-5"
                key={result.id}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Text variant="mono-secondary">
                      {result.sampleId}
                    </Text>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        result.score === 1
                          ? "bg-green-950 text-green-400"
                          : result.score === null
                            ? "bg-kumo-canvas text-kumo-subtle"
                            : "bg-red-950 text-red-400"
                      }`}
                    >
                      {result.score === null ? "unscored" : result.score === 1 ? "correct" : "incorrect"}
                    </span>
                  </div>
                  <Text variant="mono-secondary">
                    {Math.round(result.latencyMs)}ms · {formatCost(result.cost ?? 0)}
                  </Text>
                </div>

                <div className="mb-3 space-y-1">
                  <Text variant="secondary" size="sm">
                    Prompt
                  </Text>
                  <Text size="sm">{result.input}</Text>
                </div>

                {result.error ? (
                  <div className="space-y-1">
                    <Text variant="secondary" size="sm">
                      Error
                    </Text>
                    <span className="text-red-400">
                      <Text size="sm">{result.error}</Text>
                    </span>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Text variant="secondary" size="sm">
                        Output
                      </Text>
                      <span className="font-mono">
                        <Text size="sm">{result.output || "—"}</Text>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Text variant="secondary" size="sm">
                        Extracted
                      </Text>
                      <span className="font-mono">
                        <Text size="sm">{result.extracted ?? "—"}</Text>
                      </span>
                    </div>
                  </div>
                )}
              </Surface>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

function formatLatency(latency: number): string {
  return `${Math.round(latency).toLocaleString()}ms`;
}
