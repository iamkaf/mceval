import { DashboardView } from "./_components/dashboard-view";
import { requireDashboardAccess } from "./_lib/auth";
import { listSuiteDrafts, listSuiteSummaries, listSuiteVersions } from "@/server/db/cloud-suites";
import { getBenchmarkRunDetail, listLatestLeaderboard, listRecentBenchmarkRuns } from "@/server/db/benchmarks";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { auth, logout, runtimeEnv } = await requireDashboardAccess("/dashboard");

  let runs: Awaited<ReturnType<typeof listRecentBenchmarkRuns>> = [];
  let leaderboard: Awaited<ReturnType<typeof listLatestLeaderboard>> = { run: null, entries: [] };
  let latestRunDetail: Awaited<ReturnType<typeof getBenchmarkRunDetail>> = null;
  let suites: Awaited<ReturnType<typeof listSuiteSummaries>> = [];
  let suiteVersions: Awaited<ReturnType<typeof listSuiteVersions>> = [];
  let suiteDrafts: Awaited<ReturnType<typeof listSuiteDrafts>> = [];

  if (runtimeEnv.DB) {
    runs = await listRecentBenchmarkRuns(runtimeEnv.DB);
    leaderboard = await listLatestLeaderboard(runtimeEnv.DB);
    suites = await listSuiteSummaries(runtimeEnv.DB);
    suiteVersions = await listSuiteVersions(runtimeEnv.DB);
    suiteDrafts = await listSuiteDrafts(runtimeEnv.DB);
    if (leaderboard.run) {
      latestRunDetail = await getBenchmarkRunDetail(runtimeEnv.DB, leaderboard.run.id);
    }
  }

  return (
    <DashboardView
      auth={{ result: auth.result }}
      logout={logout}
      runs={runs}
      leaderboard={leaderboard.entries}
      latestRunDetail={latestRunDetail}
      suites={suites}
      suiteVersions={suiteVersions}
      suiteDrafts={suiteDrafts}
    />
  );
}
