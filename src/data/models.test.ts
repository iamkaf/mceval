import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { flagshipModels } from "./models";

describe("flagship models", () => {
  it("uses Alibaba Qwen instead of Meta", () => {
    expect(flagshipModels.some((entry) => entry.provider === "Meta")).toBe(false);
    expect(flagshipModels).toContainEqual(
      expect.objectContaining({
        provider: "Alibaba",
        model: "Qwen3.6 Max Preview",
        modelId: "qwen/qwen3.6-max-preview",
        icon: "/icons/providers/qwen.svg",
        iconAlt: "Qwen",
      }),
    );
  });

  it("uses checked-in icons for every flagship provider", () => {
    expect(flagshipModels).toHaveLength(10);
    for (const entry of flagshipModels) {
      expect(entry).toHaveProperty("icon");
      expect(entry).toHaveProperty("iconAlt");
      expect(entry).not.toHaveProperty("initials");

      if ("icon" in entry) {
        const iconPath = entry.icon.replace(/^\//, "");
        expect(existsSync(join(process.cwd(), "public", iconPath))).toBe(true);
      }
    }
  });
});
