import packageJson from "../package.json";

import { buildBenchmarkRunSummary } from "../src/eval/benchmark-summary";
import { minecraftCoreSuite } from "../src/eval/fixtures/minecraft-core";
import { parseEvalModels } from "../src/eval/model-config";
import { createRunLog } from "../src/eval/run-log";
import { writeRunLog } from "../src/eval/run-log-storage";
import { runEvalSuite } from "../src/eval/runner";
import { includesAnyScorer } from "../src/eval/scorer";
import { createSuiteProvenance } from "../src/eval/suite-provenance";
import {
  createOpenRouterClient,
  runOpenRouterChat,
} from "../src/server/openrouter/client";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is required to run benchmarks.");
    process.exit(1);
  }

  const models = parseEvalModels({
    MODEL_IDS: process.env.MODEL_IDS,
    MODEL_ID: process.env.MODEL_ID,
    MODEL_PROVIDER: process.env.MODEL_PROVIDER,
    MODEL_NAME: process.env.MODEL_NAME,
    TEMPERATURE: process.env.TEMPERATURE,
    MAX_TOKENS: process.env.MAX_TOKENS,
  });
  const client = createOpenRouterClient({ apiKey });
  const runId = `benchmark_${Date.now()}`;
  const startedAt = new Date().toISOString();

  const results = await runEvalSuite({
    suite: minecraftCoreSuite,
    models,
    runId,
    scorer: includesAnyScorer,
    callModel: async ({ prompt, model: evalModel }) =>
      runOpenRouterChat({
        client,
        model: evalModel.modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: evalModel.temperature,
        maxTokens: evalModel.maxTokens,
      }),
  });

  const completedAt = new Date().toISOString();
  const suiteProvenance = createSuiteProvenance({
    suite: minecraftCoreSuite,
    sourcePath: "src/eval/fixtures/minecraft-core.ts",
    version: process.env.SUITE_VERSION ?? "core-v1",
  });
  const log = createRunLog({
    runId,
    suite: minecraftCoreSuite,
    models,
    results,
    startedAt,
    completedAt,
    suiteProvenance,
    harnessVersion: process.env.HARNESS_VERSION ?? packageJson.version,
  });

  const logPath = await writeRunLog(log);
  console.log(JSON.stringify(buildBenchmarkRunSummary(log, logPath), null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
