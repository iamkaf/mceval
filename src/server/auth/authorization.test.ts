import { describe, expect, it } from "vitest";

import { authorizeDashboardUser, isMcevalAdmin } from "./authorization";

describe("MCEval dashboard authorization", () => {
  it("allows authenticated users when no allowlist is configured", () => {
    expect(isMcevalAdmin("discord-user-1", undefined)).toBe(true);
  });

  it("allows only configured user ids when allowlist is configured", () => {
    expect(isMcevalAdmin("discord-user-1", " discord-user-1,discord-user-2 ")).toBe(true);
    expect(isMcevalAdmin("discord-user-3", " discord-user-1,discord-user-2 ")).toBe(false);
  });

  it("returns a 403 response for authenticated non-admins", () => {
    const response = authorizeDashboardUser("discord-user-3", "discord-user-1");

    expect(response?.status).toBe(403);
  });

  it("returns null for authorized users", () => {
    expect(authorizeDashboardUser("discord-user-1", "discord-user-1")).toBeNull();
  });
});
