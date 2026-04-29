import { notFound } from "next/navigation";

import { Surface } from "@cloudflare/kumo/components/surface";
import { Table } from "@cloudflare/kumo/components/table";
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
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-kumo-subtle">
        <a className="transition hover:text-kumo-default" href="/dashboard/models">Models</a>
        <span>/</span>
        <span className="text-kumo-default">{model?.displayName ?? decodedModelId}</span>
      </nav>

      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">{model?.displayName ?? decodedModelId}</Text>
        <Text variant="secondary">{model?.provider ?? "Unknown"} · {decodedModelId}</Text>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Runs" value={String(history.runs.length)} />
        <MetricCard label="Results" value={String(history.results.length)} />
        <MetricCard label="Failures" value={String(badResults.length)} />
      </div>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">Run history</Text>
        </div>
        <div className="overflow-x-auto">
          <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>Run</Table.Head>
                <Table.Head>Suite</Table.Head>
                <Table.Head>Accuracy</Table.Head>
                <Table.Head>Cost</Table.Head>
                <Table.Head>Latency</Table.Head>
                <Table.Head>Samples</Table.Head>
                <Table.Head>Hash</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {history.runs.map((run) => (
                <Table.Row key={run.id}>
                  <Table.Cell>
                    <a
                      className="font-mono text-xs text-kumo-brand transition hover:text-kumo-default"
                      href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                    >
                      {run.id}
                    </a>
                  </Table.Cell>
                  <Table.Cell>{run.suiteName}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{formatAccuracy(run.accuracy)}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{formatCost(run.totalCost)}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{formatLatency(run.meanLatencyMs)}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{run.suiteSampleCount}</Table.Cell>
                  <Table.Cell className="font-mono text-xs text-kumo-subtle">{run.suiteSampleHash.slice(0, 8)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Surface>

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Text as="h2" variant="heading3">Failure inspection</Text>
          <Text variant="secondary" size="sm">Errors, unscorable answers, and non-perfect deterministic scores.</Text>
        </div>
        <div className="overflow-x-auto">
          <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>Run</Table.Head>
                <Table.Head>Sample</Table.Head>
                <Table.Head>Score</Table.Head>
                <Table.Head>Reason</Table.Head>
                <Table.Head>Output</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {badResults.map((result) => (
                <Table.Row key={result.id}>
                  <Table.Cell className="font-mono text-xs">{result.runId}</Table.Cell>
                  <Table.Cell>{result.sampleId}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">
                    {result.score === null ? "—" : result.score.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell className="text-kumo-subtle">
                    {result.error ?? result.scoreExplanation ?? "No explanation"}
                  </Table.Cell>
                  <Table.Cell className="max-w-md text-kumo-subtle">
                    <code className="whitespace-pre-wrap break-words">{result.output}</code>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Surface>
    </div>
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

function formatAccuracy(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatCost(value: number) {
  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number | null) {
  return value === null ? "—" : `${Math.round(value).toLocaleString()}ms`;
}
