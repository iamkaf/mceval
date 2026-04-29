import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { evaluatedModels } from "../src/data/models";

const secretPatterns = [
  /sk-or-[A-Za-z0-9_-]+/,
  /ghp_[A-Za-z0-9_]+/,
];
const secretEnvKeys = ["URIEL_SESSION_API_TOKEN", "OPENROUTER_API_KEY"];

const ignoredParts = new Set([".git", "node_modules", ".next", ".open-next", ".wrangler", ".mceval", ".hermes"]);
const ignoredFiles = new Set(["pnpm-lock.yaml", "tsconfig.tsbuildinfo", "cloudflare-env.d.ts"]);

async function main() {
  checkIcons();
  await checkSecrets(process.cwd());
  console.log("quality checks passed");
}

function checkIcons() {
  for (const model of evaluatedModels) {
    if (!model.icon.startsWith("/")) {
      throw new Error(`${model.modelId} icon must be a checked-in public asset.`);
    }
    const path = join(process.cwd(), "public", model.icon);
    if (!existsSync(path)) {
      throw new Error(`${model.modelId} icon does not exist: ${path}`);
    }
  }
}

async function checkSecrets(root: string) {
  const files: string[] = [];
  for await (const file of walk(root)) {
    files.push(file);
  }
  for (const file of files) {
    const text = await readFile(file, "utf8").catch(() => "");
    for (const pattern of secretPatterns) {
      if (pattern.test(text)) {
        throw new Error(`Potential secret pattern in ${file}`);
      }
    }
    for (const key of secretEnvKeys) {
      const match = new RegExp(`${key}\\s*=\\s*([^\\s]+)`).exec(text);
      const value = match?.[1];
      if (value && !value.startsWith("***") && value !== "..." && value !== "[REDACTED]") {
        throw new Error(`Potential ${key} value in ${file}`);
      }
    }
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignoredParts.has(entry.name) || ignoredFiles.has(entry.name) || entry.name.startsWith(".env")) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
