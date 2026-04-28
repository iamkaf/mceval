import { describe, expect, it } from "vitest";

import { flagshipModels } from "./models";

describe("flagship models", () => {
  it("uses Alibaba Qwen instead of Meta", () => {
    expect(flagshipModels.some((entry) => entry.provider === "Meta")).toBe(false);
    expect(flagshipModels).toContainEqual(
      expect.objectContaining({
        provider: "Alibaba",
        model: expect.stringContaining("Qwen"),
      }),
    );
  });
});
