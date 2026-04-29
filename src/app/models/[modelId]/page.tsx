import { notFound } from "next/navigation";

import { ModelDetailView } from "./model-detail-view";
import { getModelBenchmarkHistory } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const decodedModelId = decodeURIComponent(modelId);
  const env = getMcevalRuntimeEnv();
  if (!env.DB) {
    notFound();
  }

  const history = await getModelBenchmarkHistory(env.DB, decodedModelId);
  if (history.runs.length === 0) {
    notFound();
  }

  return <ModelDetailView history={history} />;
}
