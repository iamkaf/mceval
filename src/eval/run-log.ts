import { aggregateMetrics, type AggregateMetrics } from "./metrics";
import type { BenchmarkSuite, EvalModel, EvalResult, EvalSample } from "./schema";
import type { SuiteProvenance } from "./suite-provenance";

export type RunLog = {
  id: string;
  suite: {
    id: string;
    name: string;
    description?: string;
    sampleCount: number;
    samples?: EvalSample[];
    provenance?: SuiteProvenance;
  };
  models: EvalModel[];
  startedAt: string;
  completedAt: string;
  harnessVersion: string;
  metrics: AggregateMetrics;
  results: EvalResult[];
};

export function createRunLog({
  runId,
  suite,
  models,
  results,
  startedAt,
  completedAt,
  harnessVersion,
  suiteProvenance,
}: {
  runId: string;
  suite: BenchmarkSuite;
  models: EvalModel[];
  results: EvalResult[];
  startedAt: string;
  completedAt: string;
  harnessVersion: string;
  suiteProvenance?: SuiteProvenance;
}): RunLog {
  return {
    id: runId,
    suite: {
      id: suite.id,
      name: suite.name,
      description: suite.description,
      sampleCount: suite.samples.length,
      samples: suite.samples,
      provenance: suiteProvenance,
    },
    models,
    startedAt,
    completedAt,
    harnessVersion,
    metrics: aggregateMetrics(results),
    results,
  };
}
