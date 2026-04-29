import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { evaluatedModels } from "../src/data/models";
import { minecraftCoreSuite } from "../src/eval/fixtures/minecraft-core";

const execFileAsync = promisify(execFile);

type CliOptions = {
  command: string;
  modelIds: string[];
  modelSet: "default" | "all";
  remote: boolean;
  dryRun: boolean;
  runLogPath?: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === "--")));

  switch (options.command) {
    case "models":
      listModels();
      break;
    case "samples":
      validateSamples();
      break;
    case "run":
      console.log(JSON.stringify(await runBenchmark(options), null, 2));
      break;
    case "import":
      await importRun(options);
      break;
    case "leaderboard":
      await printLeaderboard(options);
      break;
    case "publish":
      await publish(options);
      break;
    default:
      printHelp();
      process.exit(options.command ? 1 : 0);
  }
}

function listModels() {
  console.log(
    JSON.stringify(
      evaluatedModels.map((model) => ({
        provider: model.provider,
        displayName: model.displayName,
        modelId: model.modelId,
        defaultEnabled: model.defaultEnabled,
      })),
      null,
      2,
    ),
  );
}

function validateSamples() {
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const sample of minecraftCoreSuite.samples ?? []) {
    if (ids.has(sample.id)) {
      duplicateIds.add(sample.id);
    }
    ids.add(sample.id);

    if (!sample.input.trim()) {
      throw new Error(`Sample ${sample.id} has empty input.`);
    }
    if (!sample.target?.trim()) {
      throw new Error(`Sample ${sample.id} has empty target.`);
    }

    validateStringArrayMetadata(sample.id, sample.metadata?.acceptedTargets, "acceptedTargets", false);
    validateStringArrayMetadata(sample.id, sample.metadata?.tags, "tags", true);
    if (typeof sample.metadata?.difficulty === "string" && !sample.metadata.difficulty.trim()) {
      throw new Error(`Sample ${sample.id} has empty difficulty metadata.`);
    }
  }

  if (duplicateIds.size > 0) {
    throw new Error(`Duplicate sample ids: ${Array.from(duplicateIds).join(", ")}`);
  }

  console.log(
    JSON.stringify(
      {
        suite: minecraftCoreSuite.id,
        samples: minecraftCoreSuite.samples.length,
        valid: true,
      },
      null,
      2,
    ),
  );
}

function validateStringArrayMetadata(sampleId: string, value: unknown, key: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new Error(`Sample ${sampleId} is missing ${key} metadata.`);
    }
    return;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Sample ${sampleId} metadata.${key} must be an array of non-empty strings.`);
  }
}

async function publish(options: CliOptions) {
  const run = await runBenchmark(options);
  const runLogPath = readRequiredString(run.logPath, "run log path");
  await runCommand(["tsx", "scripts/import-run-log.ts", options.remote ? "--remote" : "--local", runLogPath]);
  await printLeaderboard(options);
}

async function importRun(options: CliOptions) {
  if (!options.runLogPath) {
    throw new Error("import requires a run log path: pnpm mceval -- import .mceval/runs/<runId>.json");
  }

  const args = ["tsx", "scripts/import-run-log.ts", options.remote ? "--remote" : "--local"];
  if (options.dryRun) {
    args.push("--dry-run");
  }
  args.push(options.runLogPath);
  await runCommand(args);
}

async function runBenchmark(options: CliOptions): Promise<Record<string, unknown>> {
  const env = { ...process.env };
  if (options.modelIds.length > 0) {
    env.MODEL_IDS = options.modelIds.join(",");
    delete env.MODEL_SET;
  } else {
    env.MODEL_SET = options.modelSet;
    delete env.MODEL_IDS;
    delete env.MODEL_ID;
  }

  const { stdout } = await execFileAsync("corepack", ["pnpm", "exec", "tsx", "scripts/run-benchmark.ts"], {
    env,
    maxBuffer: 1024 * 1024 * 50,
  });

  return JSON.parse(stdout) as Record<string, unknown>;
}

async function printLeaderboard(options: CliOptions) {
  const modeFlag = options.remote ? "--remote" : "--local";
  const query = `SELECT model_id, COUNT(score) AS scored_count, AVG(score) AS accuracy, SUM(COALESCE(cost, 0)) AS total_cost FROM eval_results WHERE run_id = (SELECT id FROM eval_runs ORDER BY started_at DESC LIMIT 1) GROUP BY model_id ORDER BY accuracy DESC, total_cost ASC;`;
  await runCommand(["wrangler", "d1", "execute", "mceval", modeFlag, "--command", query]);
}

async function runCommand(args: string[]) {
  const { stdout, stderr } = await execFileAsync("corepack", ["pnpm", "exec", ...args], {
    maxBuffer: 1024 * 1024 * 50,
  });
  if (stdout.trim()) {
    console.log(stdout.trim());
  }
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${label} from benchmark summary.`);
  }
  return value;
}

function parseArgs(argv: string[]): CliOptions {
  const command = argv[0] ?? "";
  const modelIds: string[] = [];
  let modelSet: "default" | "all" = "default";
  let remote = false;
  let dryRun = false;
  let runLogPath: string | undefined;

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--model") {
      modelIds.push(requireNext(argv, ++index, "--model"));
    } else if (arg === "--model-set") {
      modelSet = parseModelSet(requireNext(argv, ++index, "--model-set"));
    } else if (arg === "--remote") {
      remote = true;
    } else if (arg === "--local") {
      remote = false;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!runLogPath) {
      runLogPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { command, modelIds, modelSet, remote, dryRun, runLogPath };
}

function parseModelSet(value: string): "default" | "all" {
  if (value === "default" || value === "all") {
    return value;
  }
  throw new Error(`Unknown model set: ${value}. Expected default or all.`);
}

function requireNext(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: pnpm mceval -- <command> [options]

Commands:
  models                         List evaluated model registry
  samples                        Validate benchmark samples
  run [--model <id>]             Run default evaluated model set, all models, or selected model(s)
  import [--remote] <run.json>   Import a run artifact into D1
  leaderboard [--remote]         Print latest leaderboard rows
  publish [--remote]             Run, import, verify, and print leaderboard

Options:
  --model <id>                   Add an explicit OpenRouter model id; repeatable
  --model-set default|all         Choose evaluated model set when --model is omitted
  --local                        Use local D1, default
  --remote                       Use remote D1
  --dry-run                      Write SQL without importing, where supported
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
