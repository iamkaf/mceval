import type { EvalSample } from "../schema";

export const sampleTemplate = [
  {
    id: "category-topic-001",
    input: "Ask one deterministic Minecraft question here.",
    target: "Canonical answer",
    metadata: {
      acceptedTargets: ["Optional alias"],
      tags: ["vanilla", "versions"],
      difficulty: "easy",
      rationale: "Why this sample belongs in the benchmark.",
    },
  },
] satisfies EvalSample[];
