import { notFound } from "next/navigation";

import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { findEvaluatedModel } from "@/data/models";
import { getModelBenchmarkHistory } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const dynamic = "force-dynamic";

export default async function DashboardModelPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const decodedModelId = decodeURIComponent(modelId);
  const env = getMcevalRuntimeEnv();
  if (!env.DB) {
    notFound();
  }

  const history = await getModelBenchmarkHistory(env.DB, decodedModelId);
  if (history.runs.length === 0) {
    notFound();
  }

  const model = findEvaluatedModel(decodedModelId);
  const badResults = history.results.filter((result) => result.error || result.score === null || result.score < 1);

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border-b border-kumo-hairline pb-6">
          <span className="mb-2 block">
            <Text variant="mono-secondary">
              <a className="transition hover:text-kumo-default" href="/dashboard">
                ← Dashboard
              </a>
            </Text>
          </span>
          <Text as="h1" variant="heading1">
            {model?.displayName ?? decodedModelId}
          </Text>
          <Text variant="secondary">
            {model?.provider ?? "Unknown"} · {decodedModelId}
          </Text>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Runs</Text>
            <Text variant="heading2">{history.runs.length}</Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Results</Text>
            <Text variant="heading2">{history.results.length}</Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Failures</Text>
            <Text variant="heading2">{badResults.length}</Text>
          </Surface>
        </div>

        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="border-b border-kumo-hairline px-5 py-4">
            <Text as="h2" variant="heading3">Run history</Text>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead className="border-b border-kumo-hairline text-kumo-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Run</th>
                  <th className="px-5 py-3 font-medium">Suite</th>
                  <th className="px-5 py-3 font-medium">Accuracy</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">Samples</th>
                  <th className="px-5 py-3 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody>
                {history.runs.map((run) => (
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
                    <td className="px-5 py-4 text-kumo-subtle">{formatAccuracy(run.accuracy)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatCost(run.totalCost)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatLatency(run.meanLatencyMs)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{run.suiteSampleCount}</td>
                    <td className="px-5 py-4 font-mono text-xs text-kumo-subtle">{run.suiteSampleHash.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="border-b border-kumo-hairline px-5 py-4">
            <Text as="h2" variant="heading3">Failure inspection</Text>
            <Text variant="secondary" size="sm">
              Errors, unscorable answers, and non-perfect deterministic scores.
            </Text>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="border-b border-kumo-hairline text-kumo-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Run</th>
                  <th className="px-5 py-3 font-medium">Sample</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {badResults.map((result) => (
                  <tr className="border-b border-kumo-hairline last:border-0" key={result.id}>
                    <td className="px-5 py-4 font-mono text-xs">{result.runId}</td>
                    <td className="px-5 py-4">{result.sampleId}</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {result.score === null ? "—" : result.score.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {result.error ?? result.scoreExplanation ?? "No explanation"}
                    </td>
                    <td className="max-w-md px-5 py-4 text-kumo-subtle">
                      <code className="whitespace-pre-wrap break-words">{result.output}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>
    </main>
  );
}

function formatAccuracy(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number) {
  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number | null) {
  return value === null ? "—" : `${Math.round(value).toLocaleString()}ms`;
}
