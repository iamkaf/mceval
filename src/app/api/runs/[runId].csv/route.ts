import { notFound } from "next/navigation";

import { runDetailToCsv } from "../export";
import { getBenchmarkRunDetail } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<Record<string, string>> }) {
  const runId = Object.values(await params)[0];
  const env = getMcevalRuntimeEnv();
  if (!env.DB || !runId) {
    notFound();
  }
  const detail = await getBenchmarkRunDetail(env.DB, decodeURIComponent(runId));
  if (!detail) {
    notFound();
  }

  return new Response(runDetailToCsv(detail), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${detail.run.id}.csv"`,
    },
  });
}
