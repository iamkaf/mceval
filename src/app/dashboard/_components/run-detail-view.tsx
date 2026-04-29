import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";

import type { BenchmarkRunDetail } from "@/server/db/benchmarks";

export type RunDetailViewProps = {
  detail: BenchmarkRunDetail;
};

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(6)}`;
}

export function RunDetailView({ detail }: RunDetailViewProps) {
  const { run, results } = detail;

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
            {run.id}
          </Text>
          <Text variant="secondary">
            {run.suiteName} · {run.suiteVersion} · {run.suiteSampleCount} samples
          </Text>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Accuracy</Text>
            <Text variant="heading2">{formatAccuracy(run.accuracy)}</Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Models</Text>
            <Text variant="heading2">{run.modelCount}</Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Results</Text>
            <Text variant="heading2">
              {run.scoredCount}/{run.resultCount}
            </Text>
          </Surface>
          <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
            <Text variant="secondary" size="sm">Cost</Text>
            <Text variant="heading2">{formatCost(run.totalCost)}</Text>
          </Surface>
        </div>

        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="border-b border-kumo-hairline px-5 py-4">
            <Text as="h2" variant="heading3">
              Results
            </Text>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="border-b border-kumo-hairline text-kumo-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 font-medium">Sample</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Extracted</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                  <th className="px-5 py-3 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr className="border-b border-kumo-hairline last:border-0" key={result.id}>
                    <td className="px-5 py-4">{result.modelId}</td>
                    <td className="px-5 py-4">{result.sampleId}</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {result.score === null ? "—" : result.score.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-kumo-subtle">{result.extracted ?? "—"}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{Math.round(result.latencyMs)}ms</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {formatCost(result.cost ?? result.upstreamInferenceCost)}
                    </td>
                    <td className="max-w-sm px-5 py-4 text-kumo-subtle">
                      <code className="whitespace-pre-wrap break-words">
                        {result.error ?? result.output}
                      </code>
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

export function MissingRunView({ runId }: { runId: string }) {
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
            Run not found
          </Text>
        </header>
        <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
          <div className="space-y-3">
            <Text as="h2" variant="heading3">
              No imported benchmark run matched {runId}.
            </Text>
            <Text variant="mono-secondary">
              <a className="transition hover:text-kumo-default" href="/dashboard">
                Back to dashboard
              </a>
            </Text>
          </div>
        </Surface>
      </div>
    </main>
  );
}
