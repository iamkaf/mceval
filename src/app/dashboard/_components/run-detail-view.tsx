import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";

import type { BenchmarkRunDetail } from "@/server/db/benchmarks";

import type { LogoutForm } from "./dashboard-view";

export type RunDetailViewProps = {
  detail: BenchmarkRunDetail;
  logout: LogoutForm;
};

function parseReturnTo(body: string): string {
  return new URLSearchParams(body).get("returnTo") ?? "/";
}

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(6)}`;
}

function LogoutFormView({ logout }: { logout: LogoutForm }) {
  return (
    <form action={logout.action} method="post">
      <input type="hidden" name="returnTo" value={parseReturnTo(logout.body)} />
      <Button type="submit">Log out</Button>
    </form>
  );
}

function RunLayout({ children, logout }: { children: React.ReactNode; logout: LogoutForm }) {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-kumo-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Text variant="mono-secondary">
              <a className="transition hover:text-kumo-default" href="/dashboard">
                ← Dashboard
              </a>
            </Text>
            <Text as="h1" variant="heading1">
              Benchmark run
            </Text>
          </div>
          <LogoutFormView logout={logout} />
        </header>
        {children}
      </div>
    </main>
  );
}

export function RunDetailView({ detail, logout }: RunDetailViewProps) {
  const { run, results } = detail;

  return (
    <RunLayout logout={logout}>
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
        <div className="space-y-3">
          <Text as="h2" variant="heading3">
            {run.id}
          </Text>
          <Text variant="secondary">{run.suiteName}</Text>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-kumo-subtle">Accuracy</dt>
              <dd>{formatAccuracy(run.accuracy)}</dd>
            </div>
            <div>
              <dt className="text-kumo-subtle">Models</dt>
              <dd>{run.modelCount}</dd>
            </div>
            <div>
              <dt className="text-kumo-subtle">Results</dt>
              <dd>{run.resultCount}</dd>
            </div>
            <div>
              <dt className="text-kumo-subtle">Cost</dt>
              <dd>{formatCost(run.totalCost)}</dd>
            </div>
          </dl>
        </div>
      </Surface>

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
                  <td className="px-5 py-4 text-kumo-subtle">{result.score === null ? "—" : result.score.toFixed(2)}</td>
                  <td className="px-5 py-4 text-kumo-subtle">{result.extracted ?? "—"}</td>
                  <td className="px-5 py-4 text-kumo-subtle">{Math.round(result.latencyMs)}ms</td>
                  <td className="px-5 py-4 text-kumo-subtle">{formatCost(result.cost ?? result.upstreamInferenceCost)}</td>
                  <td className="max-w-sm px-5 py-4 text-kumo-subtle">
                    <code className="whitespace-pre-wrap break-words">{result.error ?? result.output}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </RunLayout>
  );
}

export function MissingRunView({ runId, logout }: { runId: string; logout: LogoutForm }) {
  return (
    <RunLayout logout={logout}>
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
        <div className="space-y-3">
          <Text as="h2" variant="heading3">
            Run not found
          </Text>
          <Text variant="secondary">No imported benchmark run matched {runId}.</Text>
          <Text variant="mono-secondary">
            <a className="transition hover:text-kumo-default" href="/dashboard">
              Back to dashboard
            </a>
          </Text>
        </div>
      </Surface>
    </RunLayout>
  );
}
