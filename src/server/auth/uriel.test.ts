import { describe, expect, it, vi } from "vitest";

import { createProtectedResponse, getUrielConfig } from "./uriel";

const user = {
  userId: "discord-user-1",
  displayName: "Kaf",
  username: "kaf",
  avatarUrl: null,
};

describe("Uriel downstream auth", () => {
  it("reads required Uriel env without exposing token values", () => {
    expect(
      getUrielConfig({
        AUTH_ORIGIN: "https://auth.kaf.sh",
        URIEL_SESSION_API_TOKEN: "session-api-token",
      }),
    ).toEqual({
      authOrigin: "https://auth.kaf.sh",
      internalToken: "session-api-token",
    });
  });

  it("fails closed when Uriel env is incomplete", () => {
    expect(() => getUrielConfig({ AUTH_ORIGIN: "https://auth.kaf.sh" })).toThrow(
      /URIEL_SESSION_API_TOKEN is required/,
    );
  });

  it("redirects unauthenticated dashboard requests to Uriel", async () => {
    const requireSession = vi.fn().mockResolvedValue({
      ok: false,
      redirectTo: "https://auth.kaf.sh/login?returnTo=https%3A%2F%2Fmceval.kaf.sh%2Fdashboard",
    });

    const response = await createProtectedResponse({
      request: new Request("https://mceval.kaf.sh/dashboard", {
        headers: { cookie: "__Secure-uriel_session=v1.old" },
      }),
      client: { requireSession },
      render: () => new Response("should not render"),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://auth.kaf.sh/login?returnTo=https%3A%2F%2Fmceval.kaf.sh%2Fdashboard",
    );
    expect(requireSession).toHaveBeenCalledWith({
      cookieHeader: "__Secure-uriel_session=v1.old",
      currentUrl: "https://mceval.kaf.sh/dashboard",
    });
  });

  it("forwards Uriel Set-Cookie headers when authenticated", async () => {
    const requireSession = vi.fn().mockResolvedValue({
      ok: true,
      result: {
        authenticated: true,
        user,
        session: {
          sessionId: "session-1",
          tokenFamilyId: "family-1",
          issuedAt: 100,
          idleExpiresAt: 200,
          absoluteExpiresAt: 300,
        },
      },
      setCookieHeader: "__Secure-uriel_session=v1.rotated; Path=/; HttpOnly; SameSite=Lax",
    });

    const response = await createProtectedResponse({
      request: new Request("https://mceval.kaf.sh/dashboard"),
      client: { requireSession },
      render: ({ auth }) =>
        Response.json({
          user: auth.result.authenticated ? auth.result.user.displayName : null,
        }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: "Kaf" });
    expect(response.headers.get("set-cookie")).toContain("__Secure-uriel_session=v1.rotated");
  });
});
