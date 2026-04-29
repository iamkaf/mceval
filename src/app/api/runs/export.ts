import type { BenchmarkRunDetail } from "@/server/db/benchmarks";

export function runDetailToJson(detail: BenchmarkRunDetail): string {
  return JSON.stringify(detail, null, 2);
}

export function runDetailToCsv(detail: BenchmarkRunDetail): string {
  const header = [
    "run_id",
    "suite_id",
    "sample_id",
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
    result.sampleId,
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
