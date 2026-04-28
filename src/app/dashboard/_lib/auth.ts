import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import type { AuthenticatedSessionResult } from "@iamkaf/uriel";

import { authorizeDashboardUser } from "@/server/auth/authorization";
import { createMcevalUrielClient } from "@/server/auth/uriel";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export async function requireDashboardAccess(pathname: string) {
  const runtimeEnv = getMcevalRuntimeEnv();
  const client = createMcevalUrielClient(runtimeEnv);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "mceval.kaf.sh";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${protocol}://${host}${pathname}`;

  const auth = await client.requireSession({
    cookieHeader: requestHeaders.get("cookie"),
    currentUrl,
  });

  if (auth.ok === false) {
    redirect(auth.redirectTo);
  }

  if (!auth.result.authenticated) {
    redirect(`${runtimeEnv.AUTH_ORIGIN}/login?returnTo=${encodeURIComponent(currentUrl)}`);
  }

  const authenticatedResult = auth.result as AuthenticatedSessionResult;
  const authorization = authorizeDashboardUser(authenticatedResult.user.userId, runtimeEnv.MCEVAL_ADMIN_USER_IDS);
  if (authorization) {
    forbidden();
  }

  const logout = client.buildLogoutRequest?.(`${protocol}://${host}/`) ?? {
    action: `${runtimeEnv.AUTH_ORIGIN}/logout`,
    body: `returnTo=${encodeURIComponent(`${protocol}://${host}/`)}`,
  };

  return {
    auth: {
      ...auth,
      result: authenticatedResult,
    },
    logout,
    runtimeEnv,
  };
}
