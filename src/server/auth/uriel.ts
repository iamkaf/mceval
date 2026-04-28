import { createUrielClient, type SessionIntrospectionResult } from "@iamkaf/uriel";

export type UrielConfig = {
  authOrigin: string;
  internalToken: string;
};

type EnvLike = {
  AUTH_ORIGIN?: string | undefined;
  URIEL_SESSION_API_TOKEN?: string | undefined;
};

type RequireSessionResult =
  | {
      ok: true;
      result: SessionIntrospectionResult;
      setCookieHeader: string | null;
    }
  | {
      ok: false;
      redirectTo: string;
    };

export type UrielSessionClient = {
  requireSession(options: { cookieHeader: string | null; currentUrl: string }): Promise<RequireSessionResult>;
  buildLogoutRequest?(returnTo: string): { action: string; body: string };
};

export type ProtectedResponseOptions = {
  request: Request;
  client: UrielSessionClient;
  render(options: { auth: Extract<RequireSessionResult, { ok: true }> }): Response | Promise<Response>;
};

export function getUrielConfig(env?: EnvLike): UrielConfig {
  const source = env ?? process.env;
  const authOrigin = source.AUTH_ORIGIN?.trim();
  const internalToken = source.URIEL_SESSION_API_TOKEN?.trim();

  if (!authOrigin) {
    throw new Error("AUTH_ORIGIN is required for Uriel auth.");
  }

  if (!internalToken) {
    throw new Error("URIEL_SESSION_API_TOKEN is required for Uriel auth.");
  }

  return { authOrigin, internalToken };
}

export function createMcevalUrielClient(env?: EnvLike): UrielSessionClient {
  return createUrielClient(getUrielConfig(env));
}

export async function createProtectedResponse(options: ProtectedResponseOptions): Promise<Response> {
  const auth = await options.client.requireSession({
    cookieHeader: options.request.headers.get("cookie"),
    currentUrl: options.request.url,
  });

  if (auth.ok === false) {
    return Response.redirect(auth.redirectTo, 302);
  }

  const response = await options.render({ auth });

  if (auth.setCookieHeader) {
    response.headers.append("Set-Cookie", auth.setCookieHeader);
  }

  return response;
}
