import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";

import type { ModelBenchmarkHistory } from "@/server/db/benchmarks";

export function ModelDetailView({ history }: { history: ModelBenchmarkHistory }) {
  const badResults = history.results.filter((result) => result.error || result.score === null || result.score < 1);

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border-b border-kumo-hairline pb-6">
          <Text as="h1" variant="heading1">{history.modelId}</Text>
          <Text variant="secondary">Model run history, quality signals, and low-score output inspection.</Text>
        </header>
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
          <Text as="h2" variant="heading3">Runs</Text>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {history.runs.map((run) => (
              <div className="rounded-lg border border-kumo-hairline p-4" key={run.id}>
                <Text variant="mono-secondary">{run.id}</Text>
                <Text>{formatPercent(run.accuracy)} accuracy</Text>
                <Text variant="secondary" size="sm">{formatCost(run.totalCost)} · {formatLatency(run.meanLatencyMs)} · {run.suiteSampleHash}</Text>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="border-b border-kumo-hairline px-5 py-4">
            <Text as="h2" variant="heading3">Failure inspection</Text>
            <Text variant="secondary" size="sm">Errors, unscorable answers, and non-perfect deterministic scores.</Text>
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
                    <td className="px-5 py-4 text-kumo-subtle">{result.score === null ? "—" : result.score.toFixed(2)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{result.error ?? result.scoreExplanation ?? "No explanation"}</td>
                    <td className="max-w-md px-5 py-4 text-kumo-subtle"><code className="whitespace-pre-wrap break-words">{result.output}</code></td>
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

function formatPercent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number) {
  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number | null) {
  return value === null ? "—" : `${Math.round(value).toLocaleString()}ms`;
}
