export function ExportLinks({ runId }: { runId: string }) {
  const encoded = encodeURIComponent(runId);
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      <a className="text-kumo-brand transition hover:text-kumo-default" href={`/api/runs/${encoded}.json`}>JSON export</a>
      <a className="text-kumo-brand transition hover:text-kumo-default" href={`/api/runs/${encoded}.csv`}>CSV export</a>
    </nav>
  );
}
