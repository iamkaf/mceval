import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("D1 eval schema migration", () => {
  it("creates runs, samples, and results tables with cost fields", async () => {
    const migration = await readFile("db/migrations/0002_eval_runs.sql", "utf8");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS eval_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS eval_samples");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS eval_results");
    expect(migration).toContain("total_cost REAL NOT NULL DEFAULT 0");
    expect(migration).toContain("cost REAL");
    expect(migration).toContain("raw_json TEXT");
  });
});
