import type { EvalResult } from "./schema";

export type AggregateMetrics = {
  count: number;
  scoredCount: number;
  errorCount: number;
  accuracy: number | null;
  meanScore: number | null;
  meanLatencyMs: number | null;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  upstreamInferenceCost: number;
};

export function aggregateMetrics(results: EvalResult[]): AggregateMetrics {
  const scored = results.filter((result) => result.score.score !== null);
  const latencies = results
    .filter((result) => !result.error && result.latencyMs > 0)
    .map((result) => result.latencyMs);

  const scoreSum = scored.reduce((sum, result) => sum + (result.score.score ?? 0), 0);

  return {
    count: results.length,
    scoredCount: scored.length,
    errorCount: results.filter((result) => result.error).length,
    accuracy: scored.length > 0 ? scoreSum / scored.length : null,
    meanScore: scored.length > 0 ? scoreSum / scored.length : null,
    meanLatencyMs: latencies.length > 0 ? mean(latencies) : null,
    totalTokens: sumUsage(results, "totalTokens"),
    promptTokens: sumUsage(results, "promptTokens"),
    completionTokens: sumUsage(results, "completionTokens"),
    totalCost: sumUsage(results, "cost"),
    upstreamInferenceCost: sumUsage(results, "upstreamInferenceCost"),
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sumUsage(
  results: EvalResult[],
  key:
    | "totalTokens"
    | "promptTokens"
    | "completionTokens"
    | "cost"
    | "upstreamInferenceCost",
): number {
  return results.reduce((sum, result) => sum + (result.usage?.[key] ?? 0), 0);
}
