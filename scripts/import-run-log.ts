import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { buildRunLogImportSql } from "../src/eval/run-log-import";
import type { RunLog } from "../src/eval/run-log";

const execFileAsync = promisify(execFile);

async function main() {
  const runLogPath = process.argv[2];

  if (!runLogPath) {
    console.error("Usage: pnpm eval:import-run .mceval/runs/<runId>.json");
    process.exit(1);
  }

  const absoluteRunLogPath = resolve(runLogPath);
  const rawLog = await readFile(absoluteRunLogPath, "utf8");
  const log = JSON.parse(rawLog) as RunLog;
  const sql = buildRunLogImportSql(log);
  const sqlPath = resolve(".mceval", "imports", `${log.id}.sql`);

  await mkdir(dirname(sqlPath), { recursive: true });
  await writeFile(sqlPath, sql);

  const { stdout, stderr } = await execFileAsync(
    "corepack",
    ["pnpm", "exec", "wrangler", "d1", "execute", "mceval", "--local", "--file", sqlPath],
    { maxBuffer: 1024 * 1024 * 10 },
  );

  if (stderr.trim()) {
    console.error(stderr.trim());
  }

  console.log(
    JSON.stringify(
      {
        runId: log.id,
        sqlPath,
        importedResults: log.results.length,
        wrangler: stdout.trim(),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
