import { createHash } from "node:crypto";

import type { BenchmarkSuite } from "./schema";

export type SuiteProvenance = {
  sourcePath: string;
  version: string;
  sampleCount: number;
  sampleHash: string;
};

export function createSuiteProvenance({
  suite,
  sourcePath,
  version,
}: {
  suite: BenchmarkSuite;
  sourcePath: string;
  version: string;
}): SuiteProvenance {
  const hashInput = suite.samples.map((sample) => ({
    id: sample.id,
    input: sample.input,
    target: sample.target,
    choices: sample.choices ?? [],
    metadata: sample.metadata ?? {},
  }));

  return {
    sourcePath,
    version,
    sampleCount: suite.samples.length,
    sampleHash: createHash("sha256")
      .update(stableJson(hashInput))
      .digest("hex"),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }

  return value;
}
