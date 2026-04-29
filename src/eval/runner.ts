import { includesAnyScorer, type Scorer } from "./scorer";
import type {
  BenchmarkSuite,
  EvalModel,
  EvalResult,
  EvalSample,
  TokenUsage,
} from "./schema";

export type ModelCallInput = {
  prompt: string;
  sample: EvalSample;
  model: EvalModel;
  suiteId: string;
  runId: string;
};

export type ModelCallResult = {
  text: string;
  latencyMs: number;
  modelId: string;
  usage?: TokenUsage;
  raw?: unknown;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
};

export type ModelCaller = (input: ModelCallInput) => Promise<ModelCallResult>;

export async function runEvalCase({
  sample,
  model,
  callModel,
  runId,
  scorer = includesAnyScorer,
  suiteId = "",
}: {
  sample: EvalSample;
  model: EvalModel;
  callModel: ModelCaller;
  runId: string;
  scorer?: Scorer;
  suiteId?: string;
}): Promise<EvalResult> {
  try {
    const response = await callModel({
      prompt: sample.input,
      sample,
      model,
      suiteId,
      runId,
    });
    const score = scorer.score({ sample, output: response.text });

    return {
      runId,
      modelId: model.modelId,
      sampleId: sample.id,
      output: response.text,
      extracted: score.extracted,
      latencyMs: response.latencyMs,
      usage: response.usage,
      score,
      raw: response.raw,
    };
  } catch (error) {
    return {
      runId,
      modelId: model.modelId,
      sampleId: sample.id,
      output: "",
      latencyMs: 0,
      score: { name: scorer.name, score: null },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runEvalSuite({
  suite,
  models,
  callModel,
  runId,
  scorer = includesAnyScorer,
}: {
  suite: BenchmarkSuite;
  models: EvalModel[];
  callModel: ModelCaller;
  runId: string;
  scorer?: Scorer;
}): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const model of models) {
    for (const sample of suite.samples) {
      results.push(
        await runEvalCase({
          sample,
          model,
          callModel,
          runId,
          scorer,
          suiteId: suite.id,
        }),
      );
    }
  }

  return results;
}
