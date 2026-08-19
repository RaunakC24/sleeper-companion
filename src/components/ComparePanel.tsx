"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import GameLog from "./GameLog";
import { buildComparison, filterImpact, type ScoringKey } from "@/lib/compare";
import { fantasyPositionFor } from "@/lib/depthChart";
import type { GameLogSeason } from "@/lib/gamelog";
import type { NflPlayer } from "@/lib/players";
import { positionBarHex, positionStyle } from "@/lib/positions";
import type { DraftedPlayer } from "@/lib/types";

interface Props {
  players: NflPlayer[];
  logs: Map<string, GameLogSeason[]>;
  draftedById: Map<string, DraftedPlayer>;
  myPickNos: Set<number>;
  scoringKey: ScoringKey;
  scoringLabel: string;
  /** Teammates offered in the "without" dropdown. */
  filterCandidates: NflPlayer[];
  excludeId: string | null;
  onExcludeChange: (playerId: string | null) => void;
  onRemove: (playerId: string) => void;
  onClose: () => void;
  loadingIds: Set<string>;
  spansTeams: boolean;
}

type Mode = "head" | "without";

export default function ComparePanel({
  players,
  logs,
  draftedById,
  myPickNos,
  scoringKey,
  scoringLabel,
  filterCandidates,
  excludeId,
  onExcludeChange,
  onRemove,
  onClose,
  loadingIds,
  spansTeams,
}: Props) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("head");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Head-to-head ignores any staged filter, so the two modes never interfere.
  const activeExcludeId = mode === "without" ? excludeId : null;
  const excludeLog = activeExcludeId ? (logs.get(activeExcludeId) ?? null) : null;
  const excludePlayer = filterCandidates.find(
    (candidate) => candidate.id === activeExcludeId,
  );
  const excludeLoading =
    activeExcludeId != null && loadingIds.has(activeExcludeId);

  const compared = useMemo(
    () => buildComparison(players, logs, scoringKey, excludeLog),
    [players, logs, scoringKey, excludeLog],
  );

  const impact = useMemo(
    () =>
      filterImpact(
        logs,
        players.map((player) => player.id),
        scoringKey,
        excludeLog,
      ),
    [logs, players, scoringKey, excludeLog],
  );

  const seasons = useMemo(() => {
    const all = new Set<string>();
    for (const entry of compared) {
      for (const row of entry.rows) all.add(row.season);
    }
    return [...all].sort((a, b) => Number(b) - Number(a));
  }, [compared]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare players"
        onClick={(event) => event.stopPropagation()}
        className="mx-auto w-full max-w-5xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">
            Compare · {players.length} players
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="border-b border-zinc-800 px-5 py-3">
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-1">
            <ModeButton
              active={mode === "head"}
              onClick={() => {
                setMode("head");
                onExcludeChange(null);
              }}
              label="Head to head"
              hint="Straight comparison, any teams"
            />
            <ModeButton
              active={mode === "without"}
              onClick={() => setMode("without")}
              label="Without a teammate"
              hint="Only games one teammate missed"
            />
          </div>

          {mode === "without" ? (
            <div className="mt-3">
              <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                Only games without
                <select
                  value={excludeId ?? ""}
                  onChange={(event) =>
                    onExcludeChange(event.target.value || null)
                  }
                  className="max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 focus:border-[#00CEB8] focus:outline-none"
                >
                  <option value="">choose a teammate…</option>
                  {filterCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.team}
                      {candidate.depthPosition
                        ? ` ${candidate.depthPosition}${candidate.depthOrder ?? ""}`
                        : ""}
                      )
                    </option>
                  ))}
                </select>
              </label>

              {activeExcludeId ? (
                <p className="mt-2 text-xs text-[#3FE0CE]">
                  {excludeLoading
                    ? "Loading that player's log…"
                    : `${impact.kept} of ${impact.total} games remain — those played without ${excludePlayer?.name ?? "him"}.`}
                </p>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  Starters and immediate backups only — a team&apos;s deep bench,
                  kicker and defense are left out because their absence explains
                  nothing.
                </p>
              )}

              {spansTeams ? (
                <p className="mt-2 text-xs text-amber-300/80">
                  These players are on different teams, so one absence won&apos;t
                  explain all of them. Head to head is usually the right mode
                  here.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto p-5">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${players.length}, minmax(15rem, 1fr))`,
            }}
          >
            {compared.map((entry) => {
              const fantasyPosition = fantasyPositionFor(
                entry.player.depthPosition ?? entry.player.position,
              );
              const drafted = draftedById.get(entry.player.id) ?? null;
              const isMine =
                drafted != null && myPickNos.has(drafted.pickNo);
              const loading = loadingIds.has(entry.player.id);
              // Filtering "without X" empties X's own column by definition.
              const isExcluded = activeExcludeId === entry.player.id;

              return (
                <div
                  key={entry.player.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                >
                  <div className="flex items-start gap-3">
                    {failedImages.has(entry.player.id) ? null : (
                      <Image
                        src={`https://sleepercdn.com/content/nfl/players/${entry.player.id}.jpg`}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        onError={() =>
                          setFailedImages((prev) =>
                            new Set(prev).add(entry.player.id),
                          )
                        }
                        className="h-11 w-11 shrink-0 rounded-full bg-zinc-800 object-cover object-top"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {entry.player.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`rounded px-1 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${positionStyle(fantasyPosition)}`}
                        >
                          {entry.player.depthPosition ?? entry.player.position}
                          {entry.player.depthOrder ?? ""}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {entry.player.team}
                        </span>
                        <span
                          className={`font-mono text-[10px] ${drafted ? "text-zinc-600" : "text-[#3FE0CE]"}`}
                        >
                          {drafted
                            ? isMine
                              ? "you"
                              : `#${drafted.pickNo}`
                            : "open"}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(entry.player.id)}
                      aria-label={`Remove ${entry.player.name}`}
                      className="shrink-0 rounded border border-zinc-800 px-1.5 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      ×
                    </button>
                  </div>

                  {loading ? (
                    <p className="mt-3 text-xs text-zinc-500">Loading…</p>
                  ) : isExcluded ? (
                    <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-xs text-zinc-500">
                      This is the player being filtered out, so none of his
                      games can remain. Pick a different name above to compare
                      him directly.
                    </p>
                  ) : (
                    <>
                      <table className="mt-3 w-full text-xs">
                        <thead>
                          <tr className="text-[9px] tracking-wide text-zinc-600 uppercase">
                            <th className="text-left font-medium">Season</th>
                            <th className="text-right font-medium">G</th>
                            <th className="text-right font-medium">
                              {scoringLabel}
                            </th>
                            <th className="text-right font-medium">/G</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70">
                          {seasons.map((season) => {
                            const row = entry.rows.find(
                              (candidate) => candidate.season === season,
                            );
                            return (
                              <tr key={season}>
                                <td className="py-1 font-mono text-zinc-500">
                                  {season}
                                </td>
                                <td className="py-1 text-right font-mono text-zinc-400">
                                  {row?.games ?? 0}
                                </td>
                                <td className="py-1 text-right font-mono text-zinc-200">
                                  {row && row.games > 0 ? row.total : "—"}
                                </td>
                                <td className="py-1 text-right font-mono font-semibold text-zinc-100">
                                  {row?.perGame ?? "—"}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t border-zinc-700">
                            <td className="py-1 text-zinc-400">All</td>
                            <td className="py-1 text-right font-mono text-zinc-300">
                              {entry.overall.games}
                            </td>
                            <td className="py-1 text-right font-mono text-zinc-200">
                              {entry.overall.games > 0
                                ? entry.overall.total
                                : "—"}
                            </td>
                            <td className="py-1 text-right font-mono font-semibold text-[#3FE0CE]">
                              {entry.overall.perGame ?? "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-3 border-t border-zinc-800 pt-3">
                        <GameLog
                          seasons={entry.seasons}
                          scoringKey={scoringKey}
                          scoringLabel={scoringLabel}
                          accent={positionBarHex(fantasyPosition)}
                          isLoading={false}
                          error={null}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-600">
          Per-game averages are the fair comparison when the filter is on — a
          backup will always trail on totals simply by playing fewer games.
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`flex-1 rounded-md px-3 py-1.5 text-left transition ${
        active
          ? "bg-zinc-100 text-zinc-900"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span
        className={`block text-[10px] ${active ? "text-zinc-600" : "text-zinc-600"}`}
      >
        {hint}
      </span>
    </button>
  );
}
