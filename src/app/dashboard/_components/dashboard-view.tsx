import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import type { AuthenticatedSessionResult } from "@iamkaf/uriel";

import type { BenchmarkRunSummary } from "@/server/db/benchmarks";

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
};

function parseReturnTo(body: string): string {
  return new URLSearchParams(body).get("returnTo") ?? "/";
}

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}ms`;
}

function LogoutFormView({ logout }: { logout: LogoutForm }) {
  return (
    <form action={logout.action} method="post">
      <input type="hidden" name="returnTo" value={parseReturnTo(logout.body)} />
      <Button type="submit">Log out</Button>
    </form>
  );
}

function EmptyRunsState() {
  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <div className="space-y-3">
        <Text as="h2" variant="heading3">
          No benchmark runs imported yet
        </Text>
        <Text variant="secondary">Run a benchmark from the CLI, then import the run log into D1.</Text>
        <pre className="overflow-x-auto rounded-lg border border-kumo-hairline bg-kumo-canvas p-3 text-sm text-kumo-subtle">
          corepack pnpm run eval:import-run .mceval/runs/&lt;runId&gt;.json
        </pre>
      </div>
    </Surface>
  );
}

function RunsTable({ runs }: { runs: BenchmarkRunSummary[] }) {
  if (runs.length === 0) {
    return <EmptyRunsState />;
  }

  return (
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
                <td className="px-5 py-4 text-kumo-subtle">{formatAccuracy(run.accuracy)}</td>
                <td className="px-5 py-4 text-kumo-subtle">{formatCost(run.totalCost)}</td>
                <td className="px-5 py-4 text-kumo-subtle">{formatLatency(run.meanLatencyMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function DashboardView({ auth, logout, runs }: DashboardViewProps) {
  const user = auth.result.user;

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

        <RunsTable runs={runs} />
      </div>
    </main>
  );
}
