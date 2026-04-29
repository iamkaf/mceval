import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { listSuiteDrafts, listSuiteSummaries, listSuiteVersions } from "@/server/db/cloud-suites";
import { requireDashboardAccess } from "../_lib/auth";
import { SuitesView } from "../_components/suites-view";

export const dynamic = "force-dynamic";

export default async function SuitesPage() {
  await requireDashboardAccess("/dashboard/suites");
  const env = getMcevalRuntimeEnv();
  if (!env.DB) throw new Error("DB binding is required.");

  const suites = await listSuiteSummaries(env.DB);
  const versions = await listSuiteVersions(env.DB);
  const drafts = await listSuiteDrafts(env.DB);

  return <SuitesView suites={suites} versions={versions} drafts={drafts} />;
}
