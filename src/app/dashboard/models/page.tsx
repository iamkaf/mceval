import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { listLatestLeaderboard } from "@/server/db/benchmarks";
import { requireDashboardAccess } from "../_lib/auth";
import { ModelsView } from "../_components/models-view";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  await requireDashboardAccess("/dashboard/models");
  const env = getMcevalRuntimeEnv();

  let leaderboard: Awaited<ReturnType<typeof listLatestLeaderboard>> = { run: null, entries: [] };

  if (env.DB) {
    leaderboard = await listLatestLeaderboard(env.DB);
  }

  return <ModelsView leaderboard={leaderboard.entries} />;
}
