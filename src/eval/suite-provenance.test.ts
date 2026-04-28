import { describe, expect, it } from "vitest";

import { minecraftCoreSuite } from "./fixtures/minecraft-core";
import { createSuiteProvenance } from "./suite-provenance";

describe("suite provenance", () => {
  it("records source path, version, sample count, and a stable sample hash", () => {
    const provenance = createSuiteProvenance({
      suite: minecraftCoreSuite,
      sourcePath: "src/eval/fixtures/minecraft-core.ts",
      version: "core-v1",
    });

    expect(provenance).toMatchObject({
      sourcePath: "src/eval/fixtures/minecraft-core.ts",
      version: "core-v1",
      sampleCount: 4,
    });
    expect(provenance.sampleHash).toMatch(/^[a-f0-9]{64}$/);

    const again = createSuiteProvenance({
      suite: minecraftCoreSuite,
      sourcePath: "src/eval/fixtures/minecraft-core.ts",
      version: "core-v1",
    });
    expect(again.sampleHash).toBe(provenance.sampleHash);
  });
});
