import { CompareRunsView } from "./compare-runs-view";
import { listRecentBenchmarkRuns } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const dynamic = "force-dynamic";

export default async function CompareRunsPage() {
  const env = getMcevalRuntimeEnv();
  const runs = env.DB ? await listRecentBenchmarkRuns(env.DB, 50) : [];
  return <CompareRunsView runs={runs} />;
}
