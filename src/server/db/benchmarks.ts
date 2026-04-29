import type { D1DatabaseLike } from "./types";

export type BenchmarkRunSummary = {
  id: string;
  suiteId: string;
  suiteName: string;
  startedAt: string;
  completedAt: string;
  modelCount: number;
  resultCount: number;
  scoredCount: number;
  errorCount: number;
  accuracy: number | null;
  meanScore: number | null;
  totalCost: number;
  totalTokens: number;
  meanLatencyMs: number | null;
  suiteVersion: string;
  suiteSampleCount: number;
  suiteSampleHash: string;
  suiteSourcePath: string;
  harnessVersion: string;
  models: unknown[];
};

export type BenchmarkResultSummary = {
  id: string;
  runId: string;
  suiteId: string;
  sampleId: string;
  modelId: string;
  output: string;
  extracted: string | null;
  scoreName: string;
  score: number | null;
  scoreExplanation: string | null;
  error: string | null;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
  upstreamInferenceCost: number | null;
  raw: unknown;
};

export type BenchmarkRunDetail = {
  run: BenchmarkRunSummary;
  results: BenchmarkResultSummary[];
};

export type LeaderboardEntry = {
  modelId: string;
  scoredCount: number;
  errorCount: number;
  meanScore: number | null;
  accuracy: number | null;
  meanLatencyMs: number | null;
  totalCost: number;
};

export type PublicLeaderboard = {
  run: BenchmarkRunSummary | null;
  entries: LeaderboardEntry[];
};

export type ModelBenchmarkHistory = {
  modelId: string;
  runs: BenchmarkRunSummary[];
  results: BenchmarkResultSummary[];
};

export type CategoryAccuracy = {
  modelId: string;
  category: string;
  accuracy: number | null;
};

export type ModelLatestResult = BenchmarkResultSummary & {
  input: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
};

type EvalRunRow = {
  id: string;
  suite_id: string;
  suite_name: string;
  suite_version: string;
  suite_source_path: string;
  suite_sample_count: number;
  suite_sample_hash: string;
  harness_version: string;
  started_at: string;
  completed_at: string;
  model_count: number;
  result_count: number;
  scored_count: number;
  error_count: number;
  accuracy: number | null;
  mean_score: number | null;
  total_tokens: number | null;
  total_cost: number | null;
  mean_latency_ms: number | null;
  models_json: string;
};


type LeaderboardRow = {
  model_id: string;
  scored_count: number;
  error_count: number;
  mean_score: number | null;
  accuracy: number | null;
  mean_latency_ms: number | null;
  total_cost: number | null;
};

type EvalResultRow = {
  id: string;
  run_id: string;
  suite_id: string;
  sample_id: string;
  model_id: string;
  output: string;
  extracted: string | null;
  score_name: string;
  score: number | null;
  score_explanation: string | null;
  error: string | null;
  latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost: number | null;
  upstream_inference_cost: number | null;
  raw_json: string | null;
};

export async function listRecentBenchmarkRuns(db: D1DatabaseLike, limit = 20): Promise<BenchmarkRunSummary[]> {
  const { results = [] } = await db
    .prepare(`
      SELECT id, suite_id, suite_name, suite_version, suite_source_path, suite_sample_count,
             suite_sample_hash, harness_version, started_at, completed_at, model_count,
             result_count, scored_count, error_count, accuracy, mean_score, total_tokens,
             total_cost, mean_latency_ms, models_json
      FROM eval_runs
      ORDER BY started_at DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<EvalRunRow>();

  return results.map(mapEvalRunRow);
}

export async function getBenchmarkRunDetail(db: D1DatabaseLike, runId: string): Promise<BenchmarkRunDetail | null> {
  const runRow = await db
    .prepare(`
      SELECT id, suite_id, suite_name, suite_version, suite_source_path, suite_sample_count,
             suite_sample_hash, harness_version, started_at, completed_at, model_count,
             result_count, scored_count, error_count, accuracy, mean_score, total_tokens,
             total_cost, mean_latency_ms, models_json
      FROM eval_runs
      WHERE id = ?
    `)
    .bind(runId)
    .first<EvalRunRow>();

  if (!runRow) {
    return null;
  }

  const { results = [] } = await db
    .prepare(`
      SELECT id, run_id, suite_id, sample_id, model_id, output, extracted,
             score_name, score, score_explanation, error, latency_ms,
             prompt_tokens, completion_tokens, total_tokens, cost,
             upstream_inference_cost, raw_json
      FROM eval_results
      WHERE run_id = ?
      ORDER BY model_id, sample_id
    `)
    .bind(runId)
    .all<EvalResultRow>();

  return {
    run: mapEvalRunRow(runRow),
    results: results.map(mapEvalResultRow),
  };
}

export async function listLatestLeaderboard(db: D1DatabaseLike): Promise<PublicLeaderboard> {
  const runs = await listRecentBenchmarkRuns(db, 1);
  const run = runs[0] ?? null;

  if (!run) {
    return { run: null, entries: [] };
  }

  const { results = [] } = await db
    .prepare(`
      SELECT model_id,
             COUNT(score) AS scored_count,
             SUM(CASE WHEN error IS NULL THEN 0 ELSE 1 END) AS error_count,
             AVG(score) AS mean_score,
             AVG(score) AS accuracy,
             AVG(latency_ms) AS mean_latency_ms,
             SUM(COALESCE(cost, 0)) AS total_cost
      FROM eval_results
      WHERE run_id = ?
      GROUP BY model_id
      ORDER BY accuracy DESC, total_cost ASC, model_id ASC
    `)
    .bind(run.id)
    .all<LeaderboardRow>();

  return {
    run,
    entries: results.map(mapLeaderboardRow),
  };
}

export async function listLatestLeaderboardByCategory(db: D1DatabaseLike): Promise<CategoryAccuracy[]> {
  const runs = await listRecentBenchmarkRuns(db, 1);
  const run = runs[0];

  if (!run) {
    return [];
  }

  const { results = [] } = await db
    .prepare(`
      SELECT
        er.model_id,
        COALESCE(json_extract(es.metadata_json, '$.category'), 'unknown') AS category,
        AVG(er.score) AS accuracy
      FROM eval_results er
      INNER JOIN eval_samples es
        ON es.suite_id = ? AND es.suite_version = ? AND es.sample_id = er.sample_id
      WHERE er.run_id = ?
      GROUP BY er.model_id, category
    `)
    .bind(run.suiteId, run.suiteVersion, run.id)
    .all<{ model_id: string; category: string; accuracy: number | null }>();

  return results.map((row) => ({
    modelId: row.model_id,
    category: row.category,
    accuracy: row.accuracy,
  }));
}

export async function getModelLatestResults(db: D1DatabaseLike, modelId: string): Promise<ModelLatestResult[]> {
  const runs = await listRecentBenchmarkRuns(db, 1);
  const run = runs[0];

  if (!run) {
    return [];
  }

  const { results = [] } = await db
    .prepare(`
      SELECT
        er.id, er.run_id, er.suite_id, er.sample_id, er.model_id,
        er.output, er.extracted, er.score_name, er.score,
        er.score_explanation, er.error, er.latency_ms,
        er.prompt_tokens, er.completion_tokens, er.total_tokens,
        er.cost, er.upstream_inference_cost, er.raw_json,
        es.input, es.target, es.metadata_json
      FROM eval_results er
      INNER JOIN eval_samples es
        ON es.suite_id = ? AND es.suite_version = ? AND es.sample_id = er.sample_id
      WHERE er.run_id = ? AND er.model_id = ?
      ORDER BY er.sample_id
    `)
    .bind(run.suiteId, run.suiteVersion, run.id, modelId)
    .all<{
      id: string;
      run_id: string;
      suite_id: string;
      sample_id: string;
      model_id: string;
      output: string;
      extracted: string | null;
      score_name: string;
      score: number | null;
      score_explanation: string | null;
      error: string | null;
      latency_ms: number;
      prompt_tokens: number | null;
      completion_tokens: number | null;
      total_tokens: number | null;
      cost: number | null;
      upstream_inference_cost: number | null;
      raw_json: string | null;
      input: string;
      target: string | null;
      metadata_json: string | null;
    }>();

  return results.map((row) => ({
    ...mapEvalResultRow(row),
    input: row.input,
    target: row.target,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  }));
}

export async function getModelBenchmarkHistory(
  db: D1DatabaseLike,
  modelId: string,
  limit = 20,
): Promise<ModelBenchmarkHistory> {
  const { results: runRows = [] } = await db
    .prepare(`
      SELECT DISTINCT r.id, r.suite_id, r.suite_name, r.suite_version, r.suite_source_path,
             r.suite_sample_count, r.suite_sample_hash, r.harness_version, r.started_at,
             r.completed_at, r.model_count, r.result_count, r.scored_count, r.error_count,
             r.accuracy, r.mean_score, r.total_tokens, r.total_cost, r.mean_latency_ms,
             r.models_json
      FROM eval_runs r
      INNER JOIN eval_results er ON er.run_id = r.id
      WHERE er.model_id = ?
      ORDER BY r.started_at DESC
      LIMIT ?
    `)
    .bind(modelId, limit)
    .all<EvalRunRow>();

  const { results: resultRows = [] } = await db
    .prepare(`
      SELECT id, run_id, suite_id, sample_id, model_id, output, extracted,
             score_name, score, score_explanation, error, latency_ms,
             prompt_tokens, completion_tokens, total_tokens, cost,
             upstream_inference_cost, raw_json
      FROM eval_results
      WHERE model_id = ?
      ORDER BY run_id DESC, score ASC, sample_id ASC
      LIMIT ?
    `)
    .bind(modelId, limit * 25)
    .all<EvalResultRow>();

  return {
    modelId,
    runs: runRows.map(mapEvalRunRow),
    results: resultRows.map(mapEvalResultRow),
  };
}

export function mapEvalRunRow(row: EvalRunRow): BenchmarkRunSummary {
  return {
    id: row.id,
    suiteId: row.suite_id,
    suiteName: row.suite_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    modelCount: row.model_count,
    resultCount: row.result_count,
    scoredCount: row.scored_count,
    errorCount: row.error_count,
    accuracy: row.accuracy,
    meanScore: row.mean_score,
    totalCost: row.total_cost ?? 0,
    totalTokens: row.total_tokens ?? 0,
    meanLatencyMs: row.mean_latency_ms,
    suiteVersion: row.suite_version,
    suiteSampleCount: row.suite_sample_count,
    suiteSampleHash: row.suite_sample_hash,
    suiteSourcePath: row.suite_source_path,
    harnessVersion: row.harness_version,
    models: parseJsonArray(row.models_json),
  };
}

export function mapEvalResultRow(row: EvalResultRow): BenchmarkResultSummary {
  return {
    id: row.id,
    runId: row.run_id,
    suiteId: row.suite_id,
    sampleId: row.sample_id,
    modelId: row.model_id,
    output: row.output,
    extracted: row.extracted,
    scoreName: row.score_name,
    score: row.score,
    scoreExplanation: row.score_explanation,
    error: row.error,
    latencyMs: row.latency_ms,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    cost: row.cost,
    upstreamInferenceCost: row.upstream_inference_cost,
    raw: row.raw_json ? JSON.parse(row.raw_json) : null,
  };
}

function mapLeaderboardRow(row: LeaderboardRow): LeaderboardEntry {
  return {
    modelId: row.model_id,
    scoredCount: row.scored_count,
    errorCount: row.error_count,
    meanScore: row.mean_score,
    accuracy: row.accuracy,
    meanLatencyMs: row.mean_latency_ms,
    totalCost: row.total_cost ?? 0,
  };
}

function parseJsonArray(value: string): unknown[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}
