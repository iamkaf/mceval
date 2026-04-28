import { describe, expect, it } from "vitest";

import { includesAnyScorer } from "./scorer";

describe("includesAny scorer", () => {
  it("accepts aliases from sample metadata", () => {
    const result = includesAnyScorer.score({
      sample: {
        id: "knowledge-001",
        input: "Which Minecraft update added the Nether?",
        target: "Alpha 1.2.0",
        metadata: { acceptedTargets: ["Halloween Update", "Minecraft Alpha 1.2.0"] },
      },
      output: "Halloween Update",
    });

    expect(result).toMatchObject({
      name: "includesAny",
      score: 1,
      extracted: "halloween update",
    });
  });
});
