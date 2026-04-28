import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { RunLog } from "./run-log";
import { writeRunLog } from "./run-log-storage";

const log: RunLog = {
  id: "run_123",
  suite: {
    id: "minecraft-core",
    name: "Minecraft Core Bench",
    sampleCount: 1,
    provenance: {
      sourcePath: "src/eval/fixtures/minecraft-core.ts",
      version: "core-v1",
      sampleCount: 1,
      sampleHash: "a".repeat(64),
    },
  },
  models: [
    {
      provider: "OpenRouter",
      modelId: "openai/gpt-5.4-mini",
      displayName: "GPT-5.4 Mini",
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
    upstreamInferenceCost: 0.01,
  },
  results: [],
};

describe("run log storage", () => {
  it("writes run logs under .mceval/runs by run id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mceval-runs-"));
    try {
      const written = await writeRunLog(log, { rootDir: dir });
      expect(written).toBe(join(dir, ".mceval", "runs", "run_123.json"));

      const parsed = JSON.parse(await readFile(written, "utf8")) as RunLog;
      expect(parsed.id).toBe("run_123");
      expect(parsed.metrics.totalCost).toBe(0.01);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
