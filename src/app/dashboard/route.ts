import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createProtectedResponse, createMcevalUrielClient } from "@/server/auth/uriel";
import { renderDashboardHtml } from "@/server/dashboard";

type UrielRuntimeEnv = {
  AUTH_ORIGIN?: string;
  URIEL_SESSION_API_TOKEN?: string;
};

export const dynamic = "force-dynamic";

function getUrielRuntimeEnv(): UrielRuntimeEnv {
  try {
    const { env } = getCloudflareContext();
    return env as UrielRuntimeEnv;
  } catch {
    return process.env as UrielRuntimeEnv;
  }
}

export async function GET(request: Request) {
  const runtimeEnv = getUrielRuntimeEnv();
  const client = createMcevalUrielClient(runtimeEnv);

  return createProtectedResponse({
    request,
    client,
    render: ({ auth }) => {
      if (!auth.result.authenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const logout = client.buildLogoutRequest?.(new URL("/", request.url).toString()) ?? {
        action: `${process.env.AUTH_ORIGIN}/logout`,
        body: `returnTo=${encodeURIComponent(new URL("/", request.url).toString())}`,
      };

      return new Response(renderDashboardHtml({ auth: { result: auth.result }, logout }), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  });
}
