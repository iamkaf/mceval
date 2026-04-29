import type { D1DatabaseLike } from "./types";

export type BenchmarkRunSummary = {
  id: string;
  suiteId: string;
  suiteName: string;
  startedAt: string;
  completedAt: string;
  modelCount: number;
  resultCount: number;
  errorCount: number;
  accuracy: number | null;
  totalCost: number;
  meanLatencyMs: number | null;
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

type EvalRunRow = {
  id: string;
  suite_id: string;
  suite_name: string;
  started_at: string;
  completed_at: string;
  model_count: number;
  result_count: number;
  error_count: number;
  accuracy: number | null;
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
      SELECT id, suite_id, suite_name, started_at, completed_at, model_count,
             result_count, error_count, accuracy, total_cost, mean_latency_ms, models_json
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
      SELECT id, suite_id, suite_name, started_at, completed_at, model_count,
             result_count, error_count, accuracy, total_cost, mean_latency_ms, models_json
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

export function mapEvalRunRow(row: EvalRunRow): BenchmarkRunSummary {
  return {
    id: row.id,
    suiteId: row.suite_id,
    suiteName: row.suite_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    modelCount: row.model_count,
    resultCount: row.result_count,
    errorCount: row.error_count,
    accuracy: row.accuracy,
    totalCost: row.total_cost ?? 0,
    meanLatencyMs: row.mean_latency_ms,
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
