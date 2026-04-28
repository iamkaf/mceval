import { DashboardView } from "./_components/dashboard-view";
import { requireDashboardAccess } from "./_lib/auth";
import { listRecentBenchmarkRuns } from "@/server/db/benchmarks";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { auth, logout, runtimeEnv } = await requireDashboardAccess("/dashboard");
  const runs = runtimeEnv.DB ? await listRecentBenchmarkRuns(runtimeEnv.DB) : [];

  return <DashboardView auth={{ result: auth.result }} logout={logout} runs={runs} />;
}
