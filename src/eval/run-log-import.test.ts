import { describe, expect, it } from "vitest";

import type { RunLog } from "./run-log";
import { buildRunLogImportSql } from "./run-log-import";

const log: RunLog = {
  id: "run_1",
  suite: {
    id: "minecraft-core",
    name: "Minecraft Core Bench",
    sampleCount: 1,
    samples: [
      {
        id: "knowledge-001",
        input: "Which Minecraft update added the Nether?",
        target: "Alpha 1.2.0",
        metadata: { acceptedTargets: ["Halloween Update"] },
      },
    ],
    provenance: {
      sourcePath: "src/eval/fixtures/minecraft-core.ts",
      version: "core-v1",
      sampleCount: 1,
      sampleHash: "abc123",
    },
  },
  models: [
    {
      provider: "OpenRouter",
      modelId: "openai/gpt-5.4-mini",
      displayName: "openai/gpt-5.4-mini",
      temperature: 0,
      maxTokens: 512,
    },
  ],
  startedAt: "2026-04-28T00:00:00.000Z",
  completedAt: "2026-04-28T00:00:01.000Z",
  harnessVersion: "0.1.0",
  metrics: {
    count: 1,
    scoredCount: 1,
    errorCount: 0,
    accuracy: 1,
    meanScore: 1,
    meanLatencyMs: 100,
    totalTokens: 10,
    promptTokens: 4,
    completionTokens: 6,
    totalCost: 0.01,
    upstreamInferenceCost: 0.008,
  },
  results: [
    {
      runId: "run_1",
      modelId: "openai/gpt-5.4-mini-20260317",
      sampleId: "knowledge-001",
      output: "Halloween Update",
      extracted: "halloween update",
      latencyMs: 100,
      usage: {
        promptTokens: 4,
        completionTokens: 6,
        totalTokens: 10,
        cost: 0.01,
        upstreamInferenceCost: 0.008,
      },
      score: { name: "includesAny", score: 1, extracted: "halloween update" },
      raw: { id: "raw-1" },
    },
  ],
};

describe("run-log D1 import SQL", () => {
  it("builds transactional upserts for runs and results with cost fields", () => {
    const sql = buildRunLogImportSql(log);

    expect(sql).toContain("BEGIN TRANSACTION;");
    expect(sql).toContain("INSERT OR REPLACE INTO eval_runs");
    expect(sql).toContain("INSERT OR REPLACE INTO eval_results");
    expect(sql).toContain("0.01");
    expect(sql).toContain("Halloween Update");
    expect(sql).toContain("COMMIT;");
  });

  it("requires provenance so imported artifacts are reproducible", () => {
    expect(() => buildRunLogImportSql({ ...log, suite: { ...log.suite, provenance: undefined } })).toThrow(
      /provenance/i,
    );
  });

  it("rejects results that reference samples missing from the run log", () => {
    expect(() =>
      buildRunLogImportSql({
        ...log,
        suite: { ...log.suite, samples: [{ ...log.suite.samples![0], id: "other-sample" }] },
        results: [{ ...log.results[0], sampleId: "missing-sample" }],
      }),
    ).toThrow(/missing sample/i);
  });
});
