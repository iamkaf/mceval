import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("server boundary", () => {
  it("keeps HTML rendering out of src/server", () => {
    expect(existsSync(new URL("./dashboard.ts", import.meta.url))).toBe(false);
    expect(existsSync(new URL("./run-detail.ts", import.meta.url))).toBe(false);
  });
});
