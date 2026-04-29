import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { getBenchmarkRunDetail, listRecentBenchmarkRuns } from "@/server/db/benchmarks";
import { requireDashboardAccess } from "../_lib/auth";
import { QualityView } from "../_components/quality-view";

export const dynamic = "force-dynamic";

type QualityPageProps = {
  searchParams: Promise<{ run?: string }>;
};

export default async function QualityPage({ searchParams }: QualityPageProps) {
  await requireDashboardAccess("/dashboard/quality");
  const env = getMcevalRuntimeEnv();
  const sp = await searchParams;

  let runs: Awaited<ReturnType<typeof listRecentBenchmarkRuns>> = [];
  let runDetail: Awaited<ReturnType<typeof getBenchmarkRunDetail>> = null;

  if (env.DB) {
    runs = await listRecentBenchmarkRuns(env.DB);
    const selectedRunId = sp.run ?? runs[0]?.id;
    if (selectedRunId) {
      runDetail = await getBenchmarkRunDetail(env.DB, selectedRunId);
    }
  }

  return <QualityView runs={runs} runDetail={runDetail} />;
}
