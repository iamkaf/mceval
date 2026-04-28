import { authorizeDashboardUser } from "@/server/auth/authorization";
import { createProtectedResponse, createMcevalUrielClient } from "@/server/auth/uriel";
import { getBenchmarkRunDetail } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { renderMissingRunHtml, renderRunDetailHtml } from "@/server/run-detail";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const runtimeEnv = getMcevalRuntimeEnv();
  const client = createMcevalUrielClient(runtimeEnv);
  const { runId } = await context.params;

  return createProtectedResponse({
    request,
    client,
    render: async ({ auth }) => {
      if (!auth.result.authenticated) {
        return new Response("Unauthorized", { status: 401 });
      }

      const forbidden = authorizeDashboardUser(auth.result.user.userId, runtimeEnv.MCEVAL_ADMIN_USER_IDS);
      if (forbidden) {
        return forbidden;
      }

      const logout = client.buildLogoutRequest?.(new URL("/", request.url).toString()) ?? {
        action: `${runtimeEnv.AUTH_ORIGIN}/logout`,
        body: `returnTo=${encodeURIComponent(new URL("/", request.url).toString())}`,
      };

      const detail = runtimeEnv.DB ? await getBenchmarkRunDetail(runtimeEnv.DB, runId) : null;
      const html = detail ? renderRunDetailHtml({ detail, logout }) : renderMissingRunHtml(runId, logout);

      return new Response(html, {
        status: detail ? 200 : 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  });
}
