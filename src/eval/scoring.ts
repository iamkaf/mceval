import { includesScorer } from "./scorer";
import type { EvalSample } from "./schema";

export function scoreCaseOutput(
  testCase: EvalSample,
  output: string,
): number | null {
  return includesScorer.score({ sample: testCase, output }).score;
}
