import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { listRecentBenchmarkRuns, listLatestLeaderboard } from "@/server/db/benchmarks";
import { listSuiteVersions } from "@/server/db/cloud-suites";
import { requireDashboardAccess } from "../_lib/auth";
import { RunsView } from "../_components/runs-view";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  await requireDashboardAccess("/dashboard/runs");
  const env = getMcevalRuntimeEnv();

  let runs: Awaited<ReturnType<typeof listRecentBenchmarkRuns>> = [];
  let suiteVersions: Awaited<ReturnType<typeof listSuiteVersions>> = [];
  let leaderboard: Awaited<ReturnType<typeof listLatestLeaderboard>> = { run: null, entries: [] };

  if (env.DB) {
    runs = await listRecentBenchmarkRuns(env.DB);
    suiteVersions = await listSuiteVersions(env.DB);
    leaderboard = await listLatestLeaderboard(env.DB);
  }

  const runnableVersions = suiteVersions.filter((v) => v.status === "ready" || v.status === "published");

  return (
    <RunsView
      runs={runs}
      suiteVersions={runnableVersions}
      latestAccuracy={leaderboard.run?.accuracy ?? null}
    />
  );
}
