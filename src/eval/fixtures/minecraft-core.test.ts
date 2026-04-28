import { describe, expect, it } from "vitest";

import { minecraftCoreSuite } from "./minecraft-core";

describe("minecraft core fixture", () => {
  it("contains benchmark samples for all planned evaluation areas", () => {
    expect(minecraftCoreSuite.id).toBe("minecraft-core");
    expect(minecraftCoreSuite.name).toBe("Minecraft Core Bench");
    expect(minecraftCoreSuite.samples.map((testCase) => testCase.metadata?.category)).toEqual([
      "knowledge",
      "code",
      "platforms",
      "ecosystem",
    ]);
  });
});
