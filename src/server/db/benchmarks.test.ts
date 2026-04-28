import { describe, expect, it } from "vitest";

import {
  getBenchmarkRunDetail,
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
          const key = normalized.includes("FROM eval_results") ? `results:${bound[0]}` : "runs";
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
  error_count: 0,
  accuracy: 0.875,
  total_cost: 0.0063,
  mean_latency_ms: 1200,
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
      errorCount: 0,
      accuracy: 0.875,
      totalCost: 0.0063,
      meanLatencyMs: 1200,
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
});
