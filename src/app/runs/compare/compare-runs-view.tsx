import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";

import type { BenchmarkRunSummary } from "@/server/db/benchmarks";

export function CompareRunsView({ runs }: { runs: BenchmarkRunSummary[] }) {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border-b border-kumo-hairline pb-6">
          <Text as="h1" variant="heading1">Run comparison</Text>
          <Text variant="secondary">Public quality signals and suite provenance for imported benchmark runs.</Text>
        </header>
        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="border-b border-kumo-hairline text-kumo-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Run</th>
                  <th className="px-5 py-3 font-medium">Suite</th>
                  <th className="px-5 py-3 font-medium">Accuracy</th>
                  <th className="px-5 py-3 font-medium">Scored</th>
                  <th className="px-5 py-3 font-medium">Errors</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">Provenance</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr className="border-b border-kumo-hairline last:border-0" key={run.id}>
                    <td className="px-5 py-4 font-mono text-xs"><a href={`/runs/${encodeURIComponent(run.id)}`}>{run.id}</a></td>
                    <td className="px-5 py-4">{run.suiteName}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatPercent(run.accuracy)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{run.scoredCount}/{run.resultCount}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{run.errorCount}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatCost(run.totalCost)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{run.totalTokens.toLocaleString()}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{formatLatency(run.meanLatencyMs)}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{run.suiteVersion} · {run.suiteSampleCount} samples · {run.suiteSampleHash}</td>
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
