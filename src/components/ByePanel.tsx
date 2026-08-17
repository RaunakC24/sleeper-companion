"use client";

import type { ByeAnalysis } from "@/lib/byeAnalysis";
import { BYE_CLUSTER_THRESHOLD } from "@/lib/byeAnalysis";
import { BYE_SEASON } from "@/lib/byeWeeks";
import { positionStyle, sortPositions } from "@/lib/positions";
import type { DraftedPlayer } from "@/lib/types";

interface Props {
  analysis: ByeAnalysis;
  players: DraftedPlayer[];
  hasTeamSelected: boolean;
}

export default function ByePanel({
  analysis,
  players,
  hasTeamSelected,
}: Props) {
  const { buckets, clusters, unknown, maxInAnyWeek } = analysis;
  const hasCluster = clusters.length > 0;

  if (!hasTeamSelected) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <Header hasCluster={false} />
        <p className="mt-4 text-sm text-zinc-500">
          Select your team above to see your bye-week distribution.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border p-5 transition-colors ${
        hasCluster
          ? "border-rose-500/50 bg-rose-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <Header hasCluster={hasCluster} />

      {players.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          You haven&apos;t drafted anyone yet.
        </p>
      ) : (
        <>
          {hasCluster ? (
            <ul className="mt-4 space-y-2">
              {clusters.map((bucket) => (
                <li
                  key={bucket.week}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3"
                >
                  <p className="text-sm font-semibold text-rose-200">
                    ⚠ Week {bucket.week} — {bucket.players.length} players on bye
                  </p>
                  <p className="mt-1 text-xs text-rose-300/70">
                    {bucket.players
                      .map((p) => `${p.name} (${p.position})`)
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              No bye clusters — nothing at {BYE_CLUSTER_THRESHOLD}+ players yet.
            </p>
          )}

          <div className="mt-5">
            <p className="text-[11px] tracking-wide text-zinc-600 uppercase">
              Distribution
            </p>
            <div className="mt-2 flex items-end gap-1.5">
              {buckets.map((bucket) => {
                const height =
                  maxInAnyWeek > 0
                    ? Math.round((bucket.players.length / maxInAnyWeek) * 100)
                    : 0;
                return (
                  <div
                    key={bucket.week}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={
                      bucket.players.length
                        ? `Week ${bucket.week}: ${bucket.players
                            .map((p) => p.name)
                            .join(", ")}`
                        : `Week ${bucket.week}: no players`
                    }
                  >
                    <span className="font-mono text-[10px] text-zinc-500">
                      {bucket.players.length || ""}
                    </span>
                    <div className="flex h-16 w-full items-end rounded-sm bg-zinc-800/50">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          bucket.isCluster ? "bg-rose-400" : "bg-emerald-400/70"
                        }`}
                        style={{
                          height: `${bucket.players.length ? Math.max(height, 8) : 0}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] ${
                        bucket.isCluster
                          ? "font-semibold text-rose-300"
                          : "text-zinc-600"
                      }`}
                    >
                      {bucket.week}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-800 pt-3">
            <p className="text-[11px] tracking-wide text-zinc-600 uppercase">
              Your roster ({players.length})
            </p>
            <ul className="mt-2 divide-y divide-zinc-800/70">
              {players.map((player) => {
                const bucket = buckets.find((b) =>
                  b.players.some((p) => p.pickNo === player.pickNo),
                );
                return (
                  <li
                    key={player.pickNo}
                    className="flex items-center gap-3 py-1.5 text-sm"
                  >
                    <span className="w-9 shrink-0 font-mono text-xs text-zinc-600">
                      #{player.pickNo}
                    </span>
                    <span
                      className={`w-11 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ring-1 ring-inset ${positionStyle(player.position)}`}
                    >
                      {player.position}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-zinc-200">
                      {player.name}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-600">
                      {player.team ?? "FA"}
                    </span>
                    <span
                      className={`w-14 shrink-0 text-right text-xs ${
                        bucket?.isCluster
                          ? "font-semibold text-rose-300"
                          : "text-zinc-500"
                      }`}
                    >
                      {bucket ? `Bye ${bucket.week}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {unknown.length > 0 ? (
            <p className="mt-3 text-xs text-zinc-600">
              No bye on file for {unknown.length}{" "}
              {unknown.length === 1 ? "player" : "players"}:{" "}
              {unknown.map((p) => p.name).join(", ")}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {sortPositions(
              countByPosition(players).map(([position, count]) => ({
                position,
                count,
              })),
            ).map(({ position, count }) => (
              <span
                key={position}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${positionStyle(position)}`}
              >
                {position}
                <span className="font-mono opacity-70">{count}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Header({ hasCluster }: { hasCluster: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
          Bye weeks
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {BYE_CLUSTER_THRESHOLD}+ players sharing a bye is flagged
        </p>
      </div>
      <span className="rounded-md border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
        {BYE_SEASON} byes
      </span>
      {hasCluster ? <span className="sr-only">Cluster detected</span> : null}
    </div>
  );
}

function countByPosition(players: DraftedPlayer[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const player of players) {
    counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  }
  return [...counts.entries()];
}
