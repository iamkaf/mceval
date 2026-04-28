import { createHash } from "node:crypto";

import type { RunLog } from "./run-log";
import type { EvalResult, EvalSample } from "./schema";

export function buildRunLogImportSql(log: RunLog): string {
  if (!log.suite.provenance) {
    throw new Error("Run log suite provenance is required for D1 import.");
  }

  if (!log.suite.samples || log.suite.samples.length === 0) {
    throw new Error("Run log suite samples are required for D1 import.");
  }

  const provenance = log.suite.provenance;
  const samplesById = new Set(log.suite.samples.map((sample) => sample.id));
  const missingSampleIds = Array.from(new Set(log.results.map((result) => result.sampleId))).filter(
    (sampleId) => !samplesById.has(sampleId),
  );

  if (missingSampleIds.length > 0) {
    throw new Error(`Run log results reference missing sample definitions: ${missingSampleIds.join(", ")}`);
  }

  const statements = [
    "BEGIN TRANSACTION;",
    `INSERT OR REPLACE INTO eval_runs (${[
      "id",
      "suite_id",
      "suite_name",
      "suite_description",
      "suite_version",
      "suite_source_path",
      "suite_sample_count",
      "suite_sample_hash",
      "harness_version",
      "started_at",
      "completed_at",
      "model_count",
      "result_count",
      "scored_count",
      "error_count",
      "accuracy",
      "mean_score",
      "mean_latency_ms",
      "total_tokens",
      "prompt_tokens",
      "completion_tokens",
      "total_cost",
      "upstream_inference_cost",
      "models_json",
      "metrics_json",
    ].join(", ")}) VALUES (${[
      sqlString(log.id),
      sqlString(log.suite.id),
      sqlString(log.suite.name),
      sqlNullableString(log.suite.description),
      sqlString(provenance.version),
      sqlString(provenance.sourcePath),
      log.suite.sampleCount,
      sqlString(provenance.sampleHash),
      sqlString(log.harnessVersion),
      sqlString(log.startedAt),
      sqlString(log.completedAt),
      log.models.length,
      log.results.length,
      log.metrics.scoredCount,
      log.metrics.errorCount,
      sqlNullableNumber(log.metrics.accuracy),
      sqlNullableNumber(log.metrics.meanScore),
      sqlNullableNumber(log.metrics.meanLatencyMs),
      log.metrics.totalTokens ?? 0,
      log.metrics.promptTokens ?? 0,
      log.metrics.completionTokens ?? 0,
      log.metrics.totalCost ?? 0,
      log.metrics.upstreamInferenceCost ?? 0,
      sqlJson(log.models),
      sqlJson(log.metrics),
    ].join(", ")});`,
    ...log.suite.samples.map((sample) => buildSampleInsert(log, sample, provenance.version)),
    ...log.results.map((result) => buildResultInsert(log, result)),
    "COMMIT;",
  ];

  return `${statements.join("\n")}\n`;
}

function buildSampleInsert(log: RunLog, sample: EvalSample, suiteVersion: string): string {
  return `INSERT OR REPLACE INTO eval_samples (suite_id, suite_version, sample_id, input, target, choices_json, metadata_json, sample_hash) VALUES (${[
    sqlString(log.suite.id),
    sqlString(suiteVersion),
    sqlString(sample.id),
    sqlString(sample.input),
    sqlNullableString(sample.target),
    sample.choices ? sqlJson(sample.choices) : "NULL",
    sample.metadata ? sqlJson(sample.metadata) : "NULL",
    sqlString(hashJson({ id: sample.id, input: sample.input, target: sample.target, choices: sample.choices, metadata: sample.metadata })),
  ].join(", ")});`;
}

function buildResultInsert(log: RunLog, result: EvalResult): string {
  return `INSERT OR REPLACE INTO eval_results (${[
    "id",
    "run_id",
    "suite_id",
    "sample_id",
    "model_id",
    "output",
    "extracted",
    "score_name",
    "score",
    "score_explanation",
    "error",
    "latency_ms",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "cost",
    "upstream_inference_cost",
    "raw_json",
  ].join(", ")}) VALUES (${[
    sqlString(`${log.id}:${result.modelId}:${result.sampleId}`),
    sqlString(log.id),
    sqlString(log.suite.id),
    sqlString(result.sampleId),
    sqlString(result.modelId),
    sqlString(result.output),
    sqlNullableString(result.extracted),
    sqlString(result.score.name),
    sqlNullableNumber(result.score.score),
    sqlNullableString(result.score.explanation),
    sqlNullableString(result.error),
    result.latencyMs,
    sqlNullableNumber(result.usage?.promptTokens),
    sqlNullableNumber(result.usage?.completionTokens),
    sqlNullableNumber(result.usage?.totalTokens),
    sqlNullableNumber(result.usage?.cost),
    sqlNullableNumber(result.usage?.upstreamInferenceCost),
    result.raw === undefined ? "NULL" : sqlJson(result.raw),
  ].join(", ")});`;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNullableString(value: string | undefined): string {
  return value === undefined ? "NULL" : sqlString(value);
}

function sqlNullableNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "NULL" : String(value);
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
