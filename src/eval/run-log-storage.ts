import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { RunLog } from "./run-log";

export async function writeRunLog(
  log: RunLog,
  { rootDir = process.cwd() }: { rootDir?: string } = {},
): Promise<string> {
  const runsDir = join(rootDir, ".mceval", "runs");
  await mkdir(runsDir, { recursive: true });

  const path = join(runsDir, `${log.id}.json`);
  await writeFile(path, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return path;
}
