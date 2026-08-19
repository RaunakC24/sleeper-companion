"use client";

import type { GameLogSeason } from "@/lib/gamelog";
import { peakWeek } from "@/lib/gamelog";

interface Props {
  seasons: GameLogSeason[];
  scoringKey: "ptsPpr" | "ptsHalfPpr" | "ptsStd";
  scoringLabel: string;
  accent: string;
  isLoading: boolean;
  error: string | null;
}

export default function GameLog({
  seasons,
  scoringKey,
  scoringLabel,
  accent,
  isLoading,
  error,
}: Props) {
  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading game log…</p>;
  }

  const withGames = seasons.filter((season) =>
    season.weeks.some((week) => week[scoringKey] != null),
  );

  if (withGames.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No weekly game log for these seasons.
      </p>
    );
  }

  const peak = peakWeek(withGames, scoringKey) || 1;

  return (
    <div className="space-y-4">
      {withGames.map((season) => {
        const played = season.weeks.filter(
          (week) => week[scoringKey] != null,
        );
        const total = played.reduce(
          (sum, week) => sum + (week[scoringKey] ?? 0),
          0,
        );
        const best = played.reduce(
          (max, week) => Math.max(max, week[scoringKey] ?? 0),
          0,
        );

        return (
          <div key={season.season}>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs text-zinc-400">{season.season}</p>
              <p className="font-mono text-[10px] text-zinc-600">
                {played.length} games · best {Math.round(best * 10) / 10}
              </p>
            </div>

            <div className="mt-1.5 flex items-end gap-[3px]">
              {season.weeks.map((week) => {
                const points = week[scoringKey];
                const height =
                  points != null ? Math.max((points / peak) * 100, 3) : 0;
                const title =
                  points != null
                    ? `Week ${week.week} ${week.isAway ? "@" : "vs"} ${week.opponent ?? "—"} · ${points} ${scoringLabel}`
                    : `Week ${week.week} · did not play`;
                return (
                  <div
                    key={week.week}
                    title={title}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="font-mono text-[8px] leading-none text-zinc-500">
                      {points != null ? Math.round(points) : ""}
                    </span>
                    <div className="flex h-14 w-full items-end rounded-sm bg-zinc-800/60">
                      {points != null ? (
                        <div
                          className="w-full rounded-sm"
                          style={{
                            height: `${height}%`,
                            backgroundColor: accent,
                          }}
                        />
                      ) : (
                        <div className="h-[2px] w-full rounded-sm bg-zinc-700" />
                      )}
                    </div>
                    <span className="font-mono text-[8px] leading-none text-zinc-600">
                      {week.week}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-1 font-mono text-[10px] text-zinc-600">
              {Math.round(total * 10) / 10} {scoringLabel} total
            </p>
          </div>
        );
      })}
    </div>
  );
}
