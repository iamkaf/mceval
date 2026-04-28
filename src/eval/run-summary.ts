import type { RunLog } from "./run-log";
import type { EvalResult } from "./schema";

export type ModelComparisonSummary = {
  modelId: string;
  accuracy: number | null;
  cost: number;
  meanLatencyMs: number | null;
  failedSampleIds: string[];
};

export function summarizeModelComparisons(log: RunLog): ModelComparisonSummary[] {
  return log.models.map((model) => {
    const results = log.results.filter((result) => result.modelId === model.modelId || result.modelId.startsWith(`${model.modelId}-`));
    const scored = results.filter((result) => result.score.score !== null);
    const correct = scored.filter((result) => result.score.score === 1).length;
    const totalLatency = results.reduce((sum, result) => sum + result.latencyMs, 0);

    return {
      modelId: model.modelId,
      accuracy: scored.length > 0 ? correct / scored.length : null,
      cost: sumResultCost(results),
      meanLatencyMs: results.length > 0 ? totalLatency / results.length : null,
      failedSampleIds: scored.filter((result) => result.score.score !== 1).map((result) => result.sampleId),
    };
  });
}

function sumResultCost(results: EvalResult[]): number {
  return results.reduce((sum, result) => sum + (result.usage?.cost ?? result.usage?.upstreamInferenceCost ?? 0), 0);
}
