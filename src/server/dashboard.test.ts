import { describe, expect, it } from "vitest";

import { renderDashboardHtml } from "./dashboard";

const auth = {
  result: {
    authenticated: true as const,
    user: {
      userId: "discord-user-1",
      displayName: "Kaf",
      username: "kaf",
      avatarUrl: null,
    },
    session: {
      sessionId: "session-1",
      tokenFamilyId: "family-1",
      issuedAt: 100,
      idleExpiresAt: 200,
      absoluteExpiresAt: 300,
    },
  },
};

describe("dashboard rendering", () => {
  it("renders the authenticated user and Uriel logout form", () => {
    const html = renderDashboardHtml({
      auth,
      logout: {
        action: "https://auth.kaf.sh/logout",
        body: "returnTo=https%3A%2F%2Fmceval.kaf.sh%2F",
      },
    });

    expect(html).toContain("MCEval Dashboard");
    expect(html).toContain("Kaf");
    expect(html).toContain('action="https://auth.kaf.sh/logout"');
    expect(html).toContain('name="returnTo"');
    expect(html).toContain('value="https://mceval.kaf.sh/"');
  });
});
