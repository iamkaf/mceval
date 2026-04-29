import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluatedModels, findModelBySlug, getEvaluatedModelSet, getModelSlug } from "./models";

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
    expect(getEvaluatedModelSet("default")).toEqual(evaluatedModels);
    expect(getEvaluatedModelSet("all")).toEqual(evaluatedModels);
  });

  it("has unique slugs derived from model ids", () => {
    const slugs = evaluatedModels.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const model of evaluatedModels) {
      expect(model.slug).toBe(model.modelId.split("/").pop());
    }
  });

  it("looks up models by slug", () => {
    expect(findModelBySlug("kimi-k2.6")?.displayName).toBe("Kimi K2.6");
    expect(findModelBySlug("nonexistent")).toBeUndefined();
  });

  it("looks up slugs by model id", () => {
    expect(getModelSlug("moonshotai/kimi-k2.6")).toBe("kimi-k2.6");
    expect(getModelSlug("nonexistent")).toBeUndefined();
  });
});
