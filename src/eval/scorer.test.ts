import { describe, expect, it } from "vitest";

import {
  answerPatternScorer,
  exactScorer,
  includesScorer,
  regexScorer,
} from "./scorer";
import type { EvalSample } from "./schema";

const sample: EvalSample = {
  id: "sample-1",
  input: "Which update added the Nether?",
  target: "Alpha 1.2.0",
};

describe("scorers", () => {
  it("scores normalized exact matches", () => {
    const score = exactScorer.score({ sample, output: " alpha 1.2.0 " });

    expect(score).toEqual({
      name: "exact",
      score: 1,
      extracted: "alpha 1.2.0",
      explanation: "normalized exact match",
    });
  });

  it("scores includes matches", () => {
    const score = includesScorer.score({
      sample,
      output: "The Nether was added in Alpha 1.2.0.",
    });

    expect(score.score).toBe(1);
    expect(score.extracted).toBe("nether was added in alpha 1.2.0");
  });

  it("strips common wrappers from answer text before scoring", () => {
    const score = includesScorer.score({
      sample: { ...sample, target: "Halloween Update" },
      output: '```\nAnswer: The "Halloween Update."\n```',
    });

    expect(score.score).toBe(1);
    expect(score.extracted).toBe("halloween update");
  });

  it("extracts regex captures before scoring", () => {
    const scorer = regexScorer(/Answer:\s*(.+)$/i);
    const score = scorer.score({ sample, output: "Reasoning...\nAnswer: Alpha 1.2.0" });

    expect(score).toMatchObject({
      name: "regex",
      score: 1,
      extracted: "alpha 1.2.0",
    });
  });

  it("extracts Answer-prefixed completions", () => {
    const score = answerPatternScorer.score({
      sample,
      output: "I checked release history.\nAnswer: Alpha 1.2.0",
    });

    expect(score.score).toBe(1);
    expect(score.extracted).toBe("alpha 1.2.0");
  });

  it("returns null when a sample has no target", () => {
    const score = includesScorer.score({
      sample: { id: "open", input: "Explain loaders." },
      output: "Fabric and Forge are loaders.",
    });

    expect(score.score).toBeNull();
  });
});
