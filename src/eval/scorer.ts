import type { EvalSample, ScoreResult } from "./schema";

export type ScorerInput = {
  sample: EvalSample;
  output: string;
};

export type Scorer = {
  name: string;
  score: (input: ScorerInput) => ScoreResult;
};

export const exactScorer: Scorer = {
  name: "exact",
  score({ sample, output }) {
    const extracted = normalizeAnswer(output);
    const target = normalizeTarget(sample);

    if (!target) {
      return { name: "exact", score: null, extracted };
    }

    return {
      name: "exact",
      score: extracted === target ? 1 : 0,
      extracted,
      explanation: "normalized exact match",
    };
  },
};

export const includesScorer: Scorer = {
  name: "includes",
  score({ sample, output }) {
    const extracted = normalizeAnswer(output);
    const target = normalizeTarget(sample);

    if (!target) {
      return { name: "includes", score: null, extracted };
    }

    return {
      name: "includes",
      score: extracted.includes(target) ? 1 : 0,
      extracted,
      explanation: "normalized substring match",
    };
  },
};

export const includesAnyScorer: Scorer = {
  name: "includesAny",
  score({ sample, output }) {
    const extracted = normalizeAnswer(output);
    const targets = normalizeTargets(sample);

    if (targets.length === 0) {
      return { name: "includesAny", score: null, extracted };
    }

    return {
      name: "includesAny",
      score: targets.some((target) => extracted.includes(target)) ? 1 : 0,
      extracted,
      explanation: "normalized substring match against target aliases",
    };
  },
};

export function regexScorer(pattern: RegExp): Scorer {
  return {
    name: "regex",
    score({ sample, output }) {
      const match = output.match(pattern);
      const extracted = normalizeAnswer(match?.[1] ?? match?.[0] ?? output);
      const target = normalizeTarget(sample);

      if (!target) {
        return { name: "regex", score: null, extracted };
      }

      return {
        name: "regex",
        score: extracted === target ? 1 : 0,
        extracted,
        explanation: "regex extraction followed by normalized exact match",
      };
    },
  };
}

export const answerPatternScorer = regexScorer(/Answer:\s*([^\n]+)/i);

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^answer:\s*/i, "")
    .replace(/^the\s+/i, "")
    .replace(/["'`]/g, "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTarget(sample: EvalSample): string | null {
  return sample.target ? normalizeAnswer(sample.target) : null;
}

function normalizeTargets(sample: EvalSample): string[] {
  const targets = new Set<string>();

  if (sample.target) {
    targets.add(normalizeAnswer(sample.target));
  }

  const acceptedTargets = sample.metadata?.acceptedTargets;
  if (Array.isArray(acceptedTargets)) {
    for (const target of acceptedTargets) {
      if (typeof target === "string" && target.trim()) {
        targets.add(normalizeAnswer(target));
      }
    }
  }

  return Array.from(targets);
}
