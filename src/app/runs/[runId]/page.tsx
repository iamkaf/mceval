import { notFound } from "next/navigation";

import { ExportLinks } from "../export-links";
import { getBenchmarkRunDetail } from "@/server/db/benchmarks";
import { getMcevalRuntimeEnv } from "@/server/runtime/cloudflare";
import { RunDetailView } from "@/app/dashboard/_components/run-detail-view";

const logout = { action: "/", body: "returnTo=/" };

export const dynamic = "force-dynamic";

export default async function PublicRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const env = getMcevalRuntimeEnv();
  if (!env.DB) {
    notFound();
  }
  const detail = await getBenchmarkRunDetail(env.DB, decodeURIComponent(runId));
  if (!detail) {
    notFound();
  }

  return (
    <>
      <div className="px-5 pt-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl"><ExportLinks runId={detail.run.id} /></div>
      </div>
      <RunDetailView detail={detail} logout={logout} />
    </>
  );
}
