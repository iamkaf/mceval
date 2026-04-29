import type { BenchmarkRunDetail } from "@/server/db/benchmarks";

export function runDetailToJson(detail: BenchmarkRunDetail): string {
  return JSON.stringify(detail, null, 2);
}

export function runDetailToCsv(detail: BenchmarkRunDetail): string {
  const header = [
    "run_id",
    "suite_id",
    "suite_version",
    "sample_id",
    "sample_stable_id",
    "prompt",
    "target",
    "model_id",
    "score",
    "error",
    "latency_ms",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "cost",
    "extracted",
    "output",
  ];
  const rows = detail.results.map((result) => [
    result.runId,
    result.suiteId,
    result.suiteVersionName ?? detail.run.suiteVersion,
    result.sampleId,
    result.sampleStableId ?? result.sampleId,
    result.input ?? "",
    result.target ?? "",
    result.modelId,
    result.score ?? "",
    result.error ?? "",
    result.latencyMs,
    result.promptTokens ?? "",
    result.completionTokens ?? "",
    result.totalTokens ?? "",
    result.cost ?? result.upstreamInferenceCost ?? "",
    result.extracted ?? "",
    result.output,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
