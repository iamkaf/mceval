import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { listPublishedSuiteSamples } from "@/server/db/cloud-suites";
import { requireDashboardAccess } from "../_lib/auth";
import { SamplesView } from "../_components/samples-view";

export const dynamic = "force-dynamic";

type SamplesPageProps = {
  searchParams: Promise<{ suite?: string }>;
};

export default async function SamplesPage({ searchParams }: SamplesPageProps) {
  await requireDashboardAccess("/dashboard/samples");
  const env = getMcevalRuntimeEnv();
  const sp = await searchParams;

  let samples: Awaited<ReturnType<typeof listPublishedSuiteSamples>> = [];

  if (env.DB) {
    samples = await listPublishedSuiteSamples(env.DB);
  }

  const suiteKeys = Array.from(new Set(samples.map((s) => s.suiteKey)));
  const selectedSuite = sp.suite ?? suiteKeys[0] ?? "";
  const filtered = selectedSuite ? samples.filter((s) => s.suiteKey === selectedSuite) : samples;

  return <SamplesView samples={filtered} suiteKeys={suiteKeys} selectedSuite={selectedSuite} />;
}
