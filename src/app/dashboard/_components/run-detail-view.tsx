"use client";

import { useState, useTransition } from "react";

import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Table } from "@cloudflare/kumo/components/table";
import { Text } from "@cloudflare/kumo/components/text";

import type { BenchmarkRunDetail } from "@/server/db/benchmarks";
import type { EvalJobSummary, RunJobProgress } from "@/server/db/cloud-runs";
import { cancelRun, retryFailed } from "../_actions/runs";
import { retryJob } from "../_actions/jobs";
import { ConfirmDialog } from "./confirm-dialog";

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
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const suiteProgress = summarizeJobs(jobs, (job) => job.suite_version_id, (job) => job.suite_human_name);
  const modelProgress = summarizeJobs(jobs, (job) => job.model_id, (job) => job.model_id);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-kumo-subtle">
        <a className="transition hover:text-kumo-default" href="/dashboard/runs">Runs</a>
        <span>/</span>
        <span className="text-kumo-default">{run.id}</span>
      </nav>

      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">{run.id}</Text>
        <Text variant="secondary">
          {run.status} · {run.suiteName} · {run.suiteVersion} · {run.suiteSampleCount} samples
        </Text>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary-destructive"
            onClick={() => setCancelOpen(true)}
            disabled={pending || run.status === "cancelled" || run.status === "completed"}
          >
            Cancel run
          </Button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(() => retryFailed(fd));
            }}
          >
            <input type="hidden" name="runId" value={run.id} />
            <Button
              type="submit"
              variant="secondary"
              disabled={pending}
            >
              Retry all failed
            </Button>
          </form>
          <a
            className="inline-flex items-center rounded-lg border border-kumo-hairline px-3 py-2 text-sm transition hover:bg-kumo-base"
            href={`/api/runs/${encodeURIComponent(run.id)}.json`}
          >
            JSON export
          </a>
          <a
            className="inline-flex items-center rounded-lg border border-kumo-hairline px-3 py-2 text-sm transition hover:bg-kumo-base"
            href={`/api/runs/${encodeURIComponent(run.id)}.csv`}
          >
            CSV export
          </a>
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
        <MetricCard label="Accuracy" value={formatAccuracy(run.accuracy)} />
        <MetricCard label="Models" value={String(run.modelCount)} />
        <MetricCard label="Results" value={`${run.scoredCount}/${run.resultCount}`} />
        <MetricCard label="Cost" value={formatCost(run.totalCost)} />
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
          <Text as="h2" variant="heading3">Results</Text>
        </div>
        <div className="overflow-x-auto">
          <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>Model</Table.Head>
                <Table.Head>Sample</Table.Head>
                <Table.Head>Score</Table.Head>
                <Table.Head>Extracted</Table.Head>
                <Table.Head>Latency</Table.Head>
                <Table.Head>Cost</Table.Head>
                <Table.Head>Actions</Table.Head>
                <Table.Head>Output</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {results.map((result) => (
                <Table.Row key={result.id}>
                  <Table.Cell>{result.modelId}</Table.Cell>
                  <Table.Cell>{result.sampleStableId ?? result.sampleId}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">
                    {result.score === null ? "—" : result.score.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{result.extracted ?? "—"}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{Math.round(result.latencyMs)}ms</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">
                    {formatCost(result.cost ?? result.upstreamInferenceCost)}
                  </Table.Cell>
                  <Table.Cell>
                    {result.jobId && (result.error || result.score === null) ? (
                      <RetryJobButton jobId={result.jobId} runId={run.id} />
                    ) : (
                      <Text variant="secondary" size="sm">—</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell className="max-w-sm text-kumo-subtle">
                    <code className="whitespace-pre-wrap break-words">
                      {result.error ?? result.output}
                    </code>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Surface>

      {jobs.length > 0 ? (
        <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
          <div className="border-b border-kumo-hairline px-5 py-4">
            <Text as="h2" variant="heading3">Jobs</Text>
          </div>
          <div className="overflow-x-auto">
            <Table layout="auto">
              <Table.Header>
                <Table.Row>
                  <Table.Head>Suite</Table.Head>
                  <Table.Head>Model</Table.Head>
                  <Table.Head>Sample</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Attempts</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {jobs.map((job) => (
                  <Table.Row key={job.id}>
                    <Table.Cell>{job.suite_human_name}</Table.Cell>
                    <Table.Cell>{job.model_id}</Table.Cell>
                    <Table.Cell>{job.sample_stable_id}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{job.status}</Table.Cell>
                    <Table.Cell className="text-kumo-subtle">{job.attempts}</Table.Cell>
                    <Table.Cell>
                      {job.status === "failed" ? (
                        <RetryJobButton jobId={job.id} runId={run.id} />
                      ) : (
                        <Text variant="secondary" size="sm">—</Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Surface>
      ) : null}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel run"
        description="This will stop all pending and running jobs. Cancelled runs do not update leaderboard data. Continue?"
        confirmLabel="Cancel run"
        destructive
        onConfirm={() => {
          startTransition(() => cancelRun(run.id));
          setCancelOpen(false);
        }}
      />
    </div>
  );
}

function RetryJobButton({ jobId, runId }: { jobId: string; runId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => retryJob(jobId, runId))}
    >
      {pending ? "..." : "Retry"}
    </Button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
      <Text variant="secondary" size="sm">{label}</Text>
      <Text variant="heading2">{value}</Text>
    </Surface>
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
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-kumo-subtle">
        <a className="transition hover:text-kumo-default" href="/dashboard/runs">Runs</a>
        <span>/</span>
        <span className="text-kumo-default">Not found</span>
      </nav>
      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">Run not found</Text>
      </header>
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
        <div className="space-y-3">
          <Text as="h2" variant="heading3">No benchmark run matched {runId}.</Text>
          <a className="text-kumo-brand transition hover:text-kumo-default" href="/dashboard/runs">
            Back to runs
          </a>
        </div>
      </Surface>
    </div>
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

function summarizeJobs(
  jobs: EvalJobSummary[],
  keyFor: (job: EvalJobSummary) => string,
  labelFor: (job: EvalJobSummary) => string
): ProgressRow[] {
  const rows = new Map<string, ProgressRow>();
  for (const job of jobs) {
    const id = keyFor(job);
    const row = rows.get(id) ?? { id, label: labelFor(job), queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    row[job.status] += 1;
    rows.set(id, row);
  }
  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function ProgressTable({
  title,
  rows,
  retryField,
  runId,
}: {
  title: string;
  rows: ProgressRow[];
  retryField: "suiteVersionId" | "modelId";
  runId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
      <div className="border-b border-kumo-hairline px-5 py-4">
        <Text as="h2" variant="heading3">{title}</Text>
      </div>
      <div className="overflow-x-auto">
        <Table layout="auto">
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Queued</Table.Head>
              <Table.Head>Running</Table.Head>
              <Table.Head>Done</Table.Head>
              <Table.Head>Failed</Table.Head>
              <Table.Head>Cancelled</Table.Head>
              <Table.Head>Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.label}</Table.Cell>
                <Table.Cell className="text-kumo-subtle">{row.queued}</Table.Cell>
                <Table.Cell className="text-kumo-subtle">{row.running}</Table.Cell>
                <Table.Cell className="text-kumo-subtle">{row.completed}</Table.Cell>
                <Table.Cell className="text-kumo-subtle">{row.failed}</Table.Cell>
                <Table.Cell className="text-kumo-subtle">{row.cancelled}</Table.Cell>
                <Table.Cell>
                  {row.failed > 0 ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        startTransition(() => retryFailed(fd));
                      }}
                    >
                      <input type="hidden" name="runId" value={runId} />
                      <input type="hidden" name={retryField} value={row.id} />
                      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                        {pending ? "..." : "Retry failed"}
                      </Button>
                    </form>
                  ) : (
                    <Text variant="secondary" size="sm">—</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Surface>
  );
}
