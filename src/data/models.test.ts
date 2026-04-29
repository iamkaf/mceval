import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluatedModels, getEvaluatedModelSet } from "./models";

describe("evaluated model registry", () => {
  it("uses checked-in icons for evaluated models", () => {
    for (const entry of evaluatedModels) {
      expect(entry.icon).toBeTruthy();
      expect(entry.iconAlt).toBeTruthy();

      const iconPath = entry.icon.replace(/^\//, "");
      expect(existsSync(join(process.cwd(), "public", iconPath))).toBe(true);
    }
  });

  it("exposes named model sets for benchmark operations", () => {
    expect(getEvaluatedModelSet("default").map((model) => model.modelId)).toEqual(
      evaluatedModels.filter((model) => model.defaultEnabled).map((model) => model.modelId),
    );
    expect(getEvaluatedModelSet("all")).toEqual(evaluatedModels);
  });
});
