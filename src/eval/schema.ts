import { z } from "zod";

export const usageSchema = z.object({
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  upstreamInferenceCost: z.number().nonnegative().optional(),
  upstreamInferencePromptCost: z.number().nonnegative().optional(),
  upstreamInferenceCompletionsCost: z.number().nonnegative().optional(),
});

export const evalSampleSchema = z.object({
  id: z.string().min(1),
  input: z.string().min(1),
  target: z.string().min(1).optional(),
  choices: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const benchmarkSuiteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  samples: z.array(evalSampleSchema).min(1),
});

export const evalModelSchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0),
  maxTokens: z.number().int().positive().default(512),
});

export const scoreResultSchema = z.object({
  name: z.string().min(1),
  score: z.number().min(0).max(1).nullable(),
  extracted: z.string().optional(),
  explanation: z.string().optional(),
});

export const evalRunStatusSchema = z.enum([
  "queued",
  "running",
  "complete",
  "failed",
]);

export const evalRunSchema = z.object({
  id: z.string().min(1),
  suiteId: z.string().min(1),
  modelId: z.string().min(1),
  status: evalRunStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  error: z.string().optional(),
});

export const evalResultSchema = z.object({
  runId: z.string().min(1),
  modelId: z.string().min(1),
  sampleId: z.string().min(1),
  output: z.string(),
  extracted: z.string().optional(),
  latencyMs: z.number().nonnegative(),
  usage: usageSchema.optional(),
  score: scoreResultSchema,
  raw: z.unknown().optional(),
  error: z.string().optional(),
});

export type TokenUsage = z.infer<typeof usageSchema>;
export type EvalSample = z.infer<typeof evalSampleSchema>;
export type BenchmarkCase = EvalSample;
export type BenchmarkSuite = z.infer<typeof benchmarkSuiteSchema>;
export type EvalModel = z.infer<typeof evalModelSchema>;
export type ScoreResult = z.infer<typeof scoreResultSchema>;
export type EvalRunStatus = z.infer<typeof evalRunStatusSchema>;
export type EvalRun = z.infer<typeof evalRunSchema>;
export type EvalResult = z.infer<typeof evalResultSchema>;
