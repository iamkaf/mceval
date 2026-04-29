import { notFound } from "next/navigation";

import { runDetailToCsv, runDetailToJson } from "../export";
import { getBenchmarkRunDetail } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ runId?: string }> }) {
  const encodedRunId = (await params).runId;
  if (!encodedRunId) {
    notFound();
  }

  const { runId, format } = parseExportRunId(decodeURIComponent(encodedRunId));
  const env = getMcevalRuntimeEnv();
  if (!env.DB || !runId || !format) {
    notFound();
  }

  const detail = await getBenchmarkRunDetail(env.DB, runId);
  if (!detail) {
    notFound();
  }

  if (format === "json") {
    return new Response(runDetailToJson(detail), {
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  return new Response(runDetailToCsv(detail), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${detail.run.id}.csv"`,
    },
  });
}

function parseExportRunId(value: string): { runId: string; format: "json" | "csv" | null } {
  if (value.endsWith(".json")) {
    return { runId: value.slice(0, -".json".length), format: "json" };
  }
  if (value.endsWith(".csv")) {
    return { runId: value.slice(0, -".csv".length), format: "csv" };
  }
  return { runId: value, format: null };
}
