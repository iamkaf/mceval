import { DashboardView } from "./_components/dashboard-view";
import { requireDashboardAccess } from "./_lib/auth";
import { getBenchmarkRunDetail, listLatestLeaderboard, listRecentBenchmarkRuns } from "@/server/db/benchmarks";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { auth, logout, runtimeEnv } = await requireDashboardAccess("/dashboard");

  let runs: Awaited<ReturnType<typeof listRecentBenchmarkRuns>> = [];
  let leaderboard: Awaited<ReturnType<typeof listLatestLeaderboard>> = { run: null, entries: [] };
  let latestRunDetail: Awaited<ReturnType<typeof getBenchmarkRunDetail>> = null;

  if (runtimeEnv.DB) {
    runs = await listRecentBenchmarkRuns(runtimeEnv.DB);
    leaderboard = await listLatestLeaderboard(runtimeEnv.DB);
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
    />
  );
}
