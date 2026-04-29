import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluatedModels, getEvaluatedModelSet } from "./models";

describe("evaluated model registry", () => {
  it("uses cost-balanced evaluated models instead of flagship terminology", () => {
    expect(evaluatedModels.some((entry) => entry.provider === "Meta")).toBe(false);
    expect(evaluatedModels).toContainEqual(
      expect.objectContaining({
        provider: "Alibaba",
        displayName: "Qwen3.6 Max Preview",
        modelId: "qwen/qwen3.6-max-preview",
        icon: "/icons/providers/qwen.svg",
        iconAlt: "Qwen",
      }),
    );
  });

  it("uses checked-in icons for every evaluated model", () => {
    expect(evaluatedModels).toHaveLength(10);
    for (const entry of evaluatedModels) {
      expect(entry.icon).toBeTruthy();
      expect(entry.iconAlt).toBeTruthy();
      expect(entry).not.toHaveProperty("initials");

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
