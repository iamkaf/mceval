import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { buildRunLogImportSql } from "../src/eval/run-log-import";
import type { RunLog } from "../src/eval/run-log";

const execFileAsync = promisify(execFile);

type ImportArgs = {
  runLogPath: string;
  remote: boolean;
  dryRun: boolean;
  verify: boolean;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.runLogPath) {
    console.error("Usage: pnpm eval:import-run [--remote] [--dry-run] [--no-verify] .mceval/runs/<runId>.json");
    process.exit(1);
  }

  const result = await importRunLog(args);
  console.log(JSON.stringify(result, null, 2));
}

export async function importRunLog(args: ImportArgs) {
  const absoluteRunLogPath = resolve(args.runLogPath);
  const rawLog = await readFile(absoluteRunLogPath, "utf8");
  const log = JSON.parse(rawLog) as RunLog;
  const sql = buildRunLogImportSql(log);
  const sqlPath = resolve(".mceval", "imports", `${log.id}.sql`);

  await mkdir(dirname(sqlPath), { recursive: true });
  await writeFile(sqlPath, sql);

  if (args.dryRun) {
    return {
      runId: log.id,
      sqlPath,
      mode: args.remote ? "remote" : "local",
      dryRun: true,
      importedResults: 0,
      expectedResults: log.results.length,
      verified: false,
    };
  }

  const modeFlag = args.remote ? "--remote" : "--local";
  const execute = await execWrangler(["d1", "execute", "mceval", modeFlag, "--file", sqlPath]);
  const verification = args.verify ? await verifyImport(log, modeFlag) : null;

  return {
    runId: log.id,
    sqlPath,
    mode: args.remote ? "remote" : "local",
    dryRun: false,
    importedResults: verification?.importedResults ?? log.results.length,
    expectedResults: log.results.length,
    verified: verification?.ok ?? false,
    wrangler: execute.stdout.trim(),
  };
}

function parseArgs(argv: string[]): ImportArgs {
  const positional: string[] = [];
  let remote = false;
  let dryRun = false;
  let verify = true;

  for (const arg of argv) {
    if (arg === "--remote") {
      remote = true;
    } else if (arg === "--local") {
      remote = false;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--no-verify") {
      verify = false;
    } else {
      positional.push(arg);
    }
  }

  return { runLogPath: positional[0] ?? "", remote, dryRun, verify };
}

async function verifyImport(log: RunLog, modeFlag: "--local" | "--remote") {
  const command = `SELECT COUNT(*) AS imported_results FROM eval_results WHERE run_id = '${escapeSql(log.id)}';`;
  const { stdout } = await execWrangler(["d1", "execute", "mceval", modeFlag, "--command", command]);
  const match = stdout.match(/"imported_results"\s*:\s*(\d+)/) ?? stdout.match(/imported_results[^\d]*(\d+)/i);
  const importedResults = match ? Number(match[1]) : 0;

  if (importedResults !== log.results.length) {
    throw new Error(`Import verification failed for ${log.id}: expected ${log.results.length}, got ${importedResults}.`);
  }

  return { ok: true, importedResults };
}

function escapeSql(value: string): string {
  return value.replaceAll("'", "''");
}

async function execWrangler(args: string[]) {
  const { stdout, stderr } = await execFileAsync("corepack", ["pnpm", "exec", "wrangler", ...args], {
    maxBuffer: 1024 * 1024 * 10,
  });

  if (stderr.trim()) {
    console.error(stderr.trim());
  }

  return { stdout, stderr };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
