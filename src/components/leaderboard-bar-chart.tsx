import { ModelIcon } from "@/components/model-icon";
import type { EvaluatedModel } from "@/data/models";
import type { LeaderboardEntry } from "@/server/db/benchmarks";

const PALETTE = [
  "#1a1a1a",
  "#c17848",
  "#3b82f6",
  "#1a1a1a",
  "#3b82f6",
  "#f43f5e",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#22c55e",
];

function getModelColor(modelId: string, models: EvaluatedModel[]): string {
  const index = models.findIndex((m) => m.modelId === modelId);
  return PALETTE[Math.max(0, index) % PALETTE.length];
}

export function LeaderboardBarChart({
  entries,
  models,
}: {
  entries: LeaderboardEntry[];
  models: EvaluatedModel[];
}) {
  const items = entries
    .map((entry) => {
      const model = models.find((m) => m.modelId === entry.modelId);
      if (!model) return null;
      return {
        slug: model.slug,
        displayName: model.displayName,
        icon: model.icon,
        iconAlt: model.iconAlt,
        score: entry.accuracy ?? 0,
        color: getModelColor(entry.modelId, models),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));

  const maxScore = Math.max(...items.map((i) => i?.score ?? 0), 0.01);

  return (
    <div className="mb-10">
      <div className="flex items-end gap-1.5 h-64 px-2">
        {items.map((item) => {
          if (!item) return null;
          const heightPct = (item.score / maxScore) * 100;
          const displayScore = Math.round(item.score * 100);
          return (
            <div key={item.slug} className="flex flex-col items-center flex-1 min-w-0 group relative">
              <div className="relative w-full flex items-end" style={{ height: "200px" }}>
                <div
                  className="w-full rounded-t-md flex items-center justify-center text-white text-sm font-semibold transition hover:opacity-90"
                  style={{
                    height: `${Math.max(heightPct, 4)}%`,
                    backgroundColor: item.color,
                    minHeight: "24px",
                  }}
                  title={`${item.displayName}: ${displayScore}`}
                >
                  {displayScore}
                </div>
              </div>
              <div className="mt-2">
                <ModelIcon icon={item.icon} iconAlt={item.iconAlt} />
              </div>
              <div className="mt-1.5 text-center">
                <span className="text-[11px] text-kumo-subtle leading-tight block truncate max-w-full" title={item.displayName}>
                  {item.displayName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
