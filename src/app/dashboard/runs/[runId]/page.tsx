import { getBenchmarkRunDetail } from "@/server/db/benchmarks";

import { MissingRunView, RunDetailView } from "../../_components/run-detail-view";
import { requireDashboardAccess } from "../../_lib/auth";

export const dynamic = "force-dynamic";

type RunPageProps = {
  params: Promise<{ runId: string }>;
};

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params;
  const { runtimeEnv } = await requireDashboardAccess(`/dashboard/runs/${encodeURIComponent(runId)}`);
  const detail = runtimeEnv.DB ? await getBenchmarkRunDetail(runtimeEnv.DB, runId) : null;

  return detail ? <RunDetailView detail={detail} /> : <MissingRunView runId={runId} />;
}
