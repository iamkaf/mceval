import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { Button } from "@cloudflare/kumo/components/button";

import type { BenchmarkRunDetail } from "@/server/db/benchmarks";
import type { EvalJobSummary, RunJobProgress } from "@/server/db/cloud-runs";

const EMPTY_JOBS: EvalJobSummary[] = [];

export type RunDetailViewProps = {
  detail: BenchmarkRunDetail;
  progress?: RunJobProgress | null;
  jobs?: EvalJobSummary[];
};

function formatAccuracy(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(6)}`;
}

export function RunDetailView({ detail, progress = null, jobs = EMPTY_JOBS }: RunDetailViewProps) {
  const { run, results } = detail;
  const suiteProgress = summarizeJobs(jobs, (job) => job.suite_version_id, (job) => job.suite_human_name);
  const modelProgress = summarizeJobs(jobs, (job) => job.model_id, (job) => job.model_id);

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
            {run.status} · {run.suiteName} · {run.suiteVersion} · {run.suiteSampleCount} samples
          </Text>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={`/dashboard/runs/${encodeURIComponent(run.id)}/cancel`} method="post">
              <Button type="submit">Cancel run</Button>
            </form>
            <form action={`/dashboard/runs/${encodeURIComponent(run.id)}/retry-failed`} method="post">
              <Button type="submit">Retry all failed</Button>
            </form>
            <a className="rounded-lg border border-kumo-hairline px-3 py-2 text-sm" href={`/api/runs/${encodeURIComponent(run.id)}.json`}>JSON export</a>
            <a className="rounded-lg border border-kumo-hairline px-3 py-2 text-sm" href={`/api/runs/${encodeURIComponent(run.id)}.csv`}>CSV export</a>
          </div>
        </header>

        {progress ? (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <ProgressCard label="Total" value={progress.total} />
            <ProgressCard label="Queued" value={progress.queued} />
            <ProgressCard label="Running" value={progress.running} />
            <ProgressCard label="Completed" value={progress.completed} />
            <ProgressCard label="Failed" value={progress.failed} />
            <ProgressCard label="Cancelled" value={progress.cancelled} />
          </div>
        ) : null}

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

        {suiteProgress.length > 0 || modelProgress.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ProgressTable
              title="Suite progress"
              rows={suiteProgress}
              retryField="suiteVersionId"
              runId={run.id}
            />
            <ProgressTable
              title="Model progress"
              rows={modelProgress}
              retryField="modelId"
              runId={run.id}
            />
          </div>
        ) : null}

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
                  <th className="px-5 py-3 font-medium">Actions</th>
                  <th className="px-5 py-3 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr className="border-b border-kumo-hairline last:border-0" key={result.id}>
                    <td className="px-5 py-4">{result.modelId}</td>
                    <td className="px-5 py-4">{result.sampleStableId ?? result.sampleId}</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {result.score === null ? "—" : result.score.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-kumo-subtle">{result.extracted ?? "—"}</td>
                    <td className="px-5 py-4 text-kumo-subtle">{Math.round(result.latencyMs)}ms</td>
                    <td className="px-5 py-4 text-kumo-subtle">
                      {formatCost(result.cost ?? result.upstreamInferenceCost)}
                    </td>
                    <td className="px-5 py-4">
                      {result.jobId && (result.error || result.score === null) ? (
                        <form action={`/dashboard/jobs/${encodeURIComponent(result.jobId)}/retry`} method="post">
                          <input type="hidden" name="returnTo" value={`/dashboard/runs/${encodeURIComponent(run.id)}`} />
                          <Button type="submit">Retry</Button>
                        </form>
                      ) : (
                        <Text variant="secondary" size="sm">—</Text>
                      )}
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

        {jobs.length > 0 ? (
          <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
            <div className="border-b border-kumo-hairline px-5 py-4">
              <Text as="h2" variant="heading3">Jobs</Text>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b border-kumo-hairline text-kumo-subtle">
                  <tr>
                    <th className="px-5 py-3 font-medium">Suite</th>
                    <th className="px-5 py-3 font-medium">Model</th>
                    <th className="px-5 py-3 font-medium">Sample</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Attempts</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr className="border-b border-kumo-hairline last:border-0" key={job.id}>
                      <td className="px-5 py-4">{job.suite_human_name}</td>
                      <td className="px-5 py-4">{job.model_id}</td>
                      <td className="px-5 py-4">{job.sample_stable_id}</td>
                      <td className="px-5 py-4 text-kumo-subtle">{job.status}</td>
                      <td className="px-5 py-4 text-kumo-subtle">{job.attempts}</td>
                      <td className="px-5 py-4">
                        {job.status === "failed" ? (
                          <form action={`/dashboard/jobs/${encodeURIComponent(job.id)}/retry`} method="post">
                            <input type="hidden" name="returnTo" value={`/dashboard/runs/${encodeURIComponent(run.id)}`} />
                            <Button type="submit">Retry</Button>
                          </form>
                        ) : <Text variant="secondary" size="sm">—</Text>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        ) : null}
      </div>
    </main>
  );
}

function ProgressCard({ label, value }: { label: string; value: number }) {
  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <Text variant="secondary" size="sm">{label}</Text>
      <Text variant="heading2">{value}</Text>
    </Surface>
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
              No benchmark run matched {runId}.
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

type ProgressRow = {
  id: string;
  label: string;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
};

function summarizeJobs(jobs: EvalJobSummary[], keyFor: (job: EvalJobSummary) => string, labelFor: (job: EvalJobSummary) => string): ProgressRow[] {
  const rows = new Map<string, ProgressRow>();
  for (const job of jobs) {
    const id = keyFor(job);
    const row = rows.get(id) ?? { id, label: labelFor(job), queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    row[job.status] += 1;
    rows.set(id, row);
  }
  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function ProgressTable({ title, rows, retryField, runId }: { title: string; rows: ProgressRow[]; retryField: "suiteVersionId" | "modelId"; runId: string }) {
  return (
    <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
      <div className="border-b border-kumo-hairline px-5 py-4">
        <Text as="h2" variant="heading3">{title}</Text>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead className="border-b border-kumo-hairline text-kumo-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Queued</th>
              <th className="px-5 py-3 font-medium">Running</th>
              <th className="px-5 py-3 font-medium">Done</th>
              <th className="px-5 py-3 font-medium">Failed</th>
              <th className="px-5 py-3 font-medium">Cancelled</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-kumo-hairline last:border-0" key={row.id}>
                <td className="px-5 py-4">{row.label}</td>
                <td className="px-5 py-4 text-kumo-subtle">{row.queued}</td>
                <td className="px-5 py-4 text-kumo-subtle">{row.running}</td>
                <td className="px-5 py-4 text-kumo-subtle">{row.completed}</td>
                <td className="px-5 py-4 text-kumo-subtle">{row.failed}</td>
                <td className="px-5 py-4 text-kumo-subtle">{row.cancelled}</td>
                <td className="px-5 py-4">
                  {row.failed > 0 ? (
                    <form action={`/dashboard/runs/${encodeURIComponent(runId)}/retry-failed`} method="post">
                      <input type="hidden" name={retryField} value={row.id} />
                      <Button type="submit">Retry failed</Button>
                    </form>
                  ) : <Text variant="secondary" size="sm">—</Text>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
