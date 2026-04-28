import type { RunLog } from "./run-log";
import { summarizeModelComparisons } from "./run-summary";

export function buildBenchmarkRunSummary(log: RunLog, logPath: string) {
  return {
    runId: log.id,
    logPath,
    suite: log.suite.id,
    suiteVersion: log.suite.provenance?.version,
    sampleHash: log.suite.provenance?.sampleHash,
    models: log.models.map((model) => model.modelId),
    samples: log.suite.samples?.length ?? log.suite.sampleCount,
    results: log.metrics.count,
    errors: log.metrics.errorCount,
    accuracy: log.metrics.accuracy,
    meanLatencyMs: log.metrics.meanLatencyMs,
    totalTokens: log.metrics.totalTokens,
    totalCost: log.metrics.totalCost,
    comparisons: summarizeModelComparisons(log),
  };
}
