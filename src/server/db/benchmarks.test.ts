import { describe, expect, it } from "vitest";

import {
  getBenchmarkRunDetail,
  getModelBenchmarkHistory,
  getModelLatestResults,
  listLatestLeaderboard,
  listLatestLeaderboardByCategory,
  listRecentBenchmarkRuns,
  mapEvalResultRow,
  mapEvalRunRow,
} from "./benchmarks";
import type { D1DatabaseLike } from "./types";

function createDb(rows: Record<string, unknown[]>): D1DatabaseLike {
  return {
    prepare(query: string) {
      const normalized = query.replaceAll(/\s+/g, " ").trim();
      let bound: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          bound = values;
          return this;
        },
        async all<T>() {
          let key = "runs";
          if (normalized.includes("INNER JOIN eval_results")) {
            key = "modelRuns";
          } else if (normalized.includes("FROM eval_results") && normalized.includes("GROUP BY model_id")) {
            key = "leaderboard";
          } else if (normalized.includes("json_extract") && normalized.includes("GROUP BY er.model_id")) {
            key = "categories";
          } else if (normalized.includes("FROM eval_results") && normalized.includes("es.input")) {
            key = `modelResults:${bound[3]}`;
          } else if (normalized.includes("FROM eval_results")) {
            key = `results:${bound[0]}`;
          }
          return { results: (rows[key] ?? []) as T[] };
        },
        async first<T>() {
          const key = normalized.includes("FROM eval_runs WHERE id") ? `run:${bound[0]}` : "unknown";
          return ((rows[key] ?? [null])[0] ?? null) as T | null;
        },
      };
    },
  };
}

const runRow = {
  id: "benchmark_1",
  suite_id: "minecraft-core",
  suite_name: "Minecraft Core Bench",
  started_at: "2026-04-28T00:00:00.000Z",
  completed_at: "2026-04-28T00:01:00.000Z",
  model_count: 2,
  result_count: 8,
  scored_count: 8,
  error_count: 0,
  accuracy: 0.875,
  mean_score: 0.875,
  total_tokens: 1200,
  total_cost: 0.0063,
  mean_latency_ms: 1200,
  suite_version: "0.1.0",
  suite_sample_count: 4,
  suite_sample_hash: "hash123",
  suite_source_path: "src/eval/fixtures/minecraft-core.ts",
  harness_version: "0.1.0",
  models_json: '[{"modelId":"openai/gpt-5.4-mini"}]',
};

const resultRow = {
  id: "benchmark_1:openai/gpt-5.4-mini:knowledge-001",
  run_id: "benchmark_1",
  suite_id: "minecraft-core",
  sample_id: "knowledge-001",
  model_id: "openai/gpt-5.4-mini",
  output: "The Halloween Update.",
  extracted: "Halloween Update",
  score_name: "includes-any",
  score: 1,
  score_explanation: "matched accepted target",
  error: null,
  latency_ms: 1100,
  prompt_tokens: 10,
  completion_tokens: 12,
  total_tokens: 22,
  cost: 0.0001,
  upstream_inference_cost: null,
  raw_json: '{"id":"raw"}',
};

describe("benchmark D1 queries", () => {
  it("maps eval run rows into dashboard summaries", () => {
    expect(mapEvalRunRow(runRow)).toEqual({
      id: "benchmark_1",
      suiteId: "minecraft-core",
      suiteName: "Minecraft Core Bench",
      startedAt: "2026-04-28T00:00:00.000Z",
      completedAt: "2026-04-28T00:01:00.000Z",
      modelCount: 2,
      resultCount: 8,
      scoredCount: 8,
      errorCount: 0,
      accuracy: 0.875,
      meanScore: 0.875,
      totalCost: 0.0063,
      totalTokens: 1200,
      meanLatencyMs: 1200,
      suiteVersion: "0.1.0",
      suiteSampleCount: 4,
      suiteSampleHash: "hash123",
      suiteSourcePath: "src/eval/fixtures/minecraft-core.ts",
      harnessVersion: "0.1.0",
      models: [{ modelId: "openai/gpt-5.4-mini" }],
    });
  });

  it("maps eval result rows into run detail results", () => {
    expect(mapEvalResultRow(resultRow)).toMatchObject({
      id: "benchmark_1:openai/gpt-5.4-mini:knowledge-001",
      runId: "benchmark_1",
      sampleId: "knowledge-001",
      modelId: "openai/gpt-5.4-mini",
      score: 1,
      cost: 0.0001,
      raw: { id: "raw" },
    });
  });

  it("lists recent benchmark runs", async () => {
    const db = createDb({ runs: [runRow] });
    await expect(listRecentBenchmarkRuns(db, 5)).resolves.toHaveLength(1);
  });

  it("returns run detail with results", async () => {
    const db = createDb({ "run:benchmark_1": [runRow], "results:benchmark_1": [resultRow] });
    await expect(getBenchmarkRunDetail(db, "benchmark_1")).resolves.toMatchObject({
      run: { id: "benchmark_1" },
      results: [{ sampleId: "knowledge-001" }],
    });
  });

  it("returns null for missing run detail", async () => {
    const db = createDb({});
    await expect(getBenchmarkRunDetail(db, "missing")).resolves.toBeNull();
  });

  it("aggregates the latest run into public leaderboard entries", async () => {
    const db = createDb({
      runs: [runRow],
      leaderboard: [
        {
          model_id: "qwen/qwen3.6-max-preview",
          scored_count: 4,
          error_count: 0,
          mean_score: 0.75,
          accuracy: 0.75,
          mean_latency_ms: 900,
          total_cost: 0.002,
        },
      ],
    });

    await expect(listLatestLeaderboard(db)).resolves.toEqual({
      run: expect.objectContaining({ id: "benchmark_1" }),
      entries: [
        {
          modelId: "qwen/qwen3.6-max-preview",
          scoredCount: 4,
          errorCount: 0,
          meanScore: 0.75,
          accuracy: 0.75,
          meanLatencyMs: 900,
          totalCost: 0.002,
        },
      ],
    });
  });

  it("loads model run history and bad outputs for public model pages", async () => {
    const db = createDb({ modelRuns: [runRow], "results:openai/gpt-5.4-mini": [resultRow] });

    await expect(getModelBenchmarkHistory(db, "openai/gpt-5.4-mini")).resolves.toMatchObject({
      modelId: "openai/gpt-5.4-mini",
      runs: [{ suiteSampleHash: "hash123" }],
      results: [{ sampleId: "knowledge-001" }],
    });
  });

  it("aggregates category accuracy for the latest run", async () => {
    const categoryRow = {
      model_id: "openai/gpt-5.4-mini",
      category: "knowledge",
      accuracy: 0.75,
    };
    const db = createDb({ runs: [runRow], categories: [categoryRow] });

    await expect(listLatestLeaderboardByCategory(db)).resolves.toEqual([
      { modelId: "openai/gpt-5.4-mini", category: "knowledge", accuracy: 0.75 },
    ]);
  });

  it("returns empty category leaderboard when no runs exist", async () => {
    const db = createDb({});
    await expect(listLatestLeaderboardByCategory(db)).resolves.toEqual([]);
  });

  it("loads latest per-sample results for a model", async () => {
    const modelResultRow = {
      ...resultRow,
      input: "Which Minecraft update added the Nether?",
      target: "Alpha 1.2.0",
      metadata_json: '{"category":"knowledge"}',
    };
    const db = createDb({ runs: [runRow], "modelResults:openai/gpt-5.4-mini": [modelResultRow] });

    const results = await getModelLatestResults(db, "openai/gpt-5.4-mini");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      modelId: "openai/gpt-5.4-mini",
      sampleId: "knowledge-001",
      input: "Which Minecraft update added the Nether?",
      target: "Alpha 1.2.0",
    });
    expect(results[0].metadata).toEqual({ category: "knowledge" });
  });

  it("returns empty model results when no runs exist", async () => {
    const db = createDb({});
    await expect(getModelLatestResults(db, "openai/gpt-5.4-mini")).resolves.toEqual([]);
  });
});
