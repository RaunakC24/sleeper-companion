"use client";

import { useEffect } from "react";
import { getByeWeek } from "@/lib/byeWeeks";
import type { NflPlayer } from "@/lib/players";
import { positionStyle } from "@/lib/positions";
import { scoringFor, type SeasonStatLine } from "@/lib/stats";
import type { DraftedPlayer } from "@/lib/types";

interface Props {
  player: NflPlayer;
  /** Fantasy position used for coloring (receivers come from LWR/RWR/SWR). */
  fantasyPosition: string;
  drafted: DraftedPlayer | null;
  isMine: boolean;
  lines: SeasonStatLine[] | null;
  seasons: string[];
  scoringType: string | undefined;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

interface Column {
  key: keyof SeasonStatLine;
  label: string;
}

function columnsFor(position: string): Column[] {
  if (position === "QB") {
    return [
      { key: "passCmp", label: "CMP" },
      { key: "passAtt", label: "ATT" },
      { key: "passYd", label: "PYDS" },
      { key: "passTd", label: "PTD" },
      { key: "passInt", label: "INT" },
      { key: "rushYd", label: "RYDS" },
      { key: "rushTd", label: "RTD" },
    ];
  }
  if (position === "RB" || position === "FB") {
    return [
      { key: "rushAtt", label: "ATT" },
      { key: "rushYd", label: "RYDS" },
      { key: "rushTd", label: "RTD" },
      { key: "rec", label: "REC" },
      { key: "recYd", label: "YDS" },
      { key: "recTd", label: "TD" },
    ];
  }
  if (position === "WR" || position === "TE") {
    return [
      { key: "recTgt", label: "TGT" },
      { key: "rec", label: "REC" },
      { key: "recYd", label: "YDS" },
      { key: "recTd", label: "TD" },
    ];
  }
  return [];
}

export default function PlayerStatsModal({
  player,
  fantasyPosition,
  drafted,
  isMine,
  lines,
  seasons,
  scoringType,
  isLoading,
  error,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const scoring = scoringFor(scoringType);
  const columns = columnsFor(player.position);
  const bye = getByeWeek(player.team);
  const bySeason = new Map((lines ?? []).map((line) => [line.season, line]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} stats`}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${positionStyle(fantasyPosition)}`}
              >
                {player.position}
                {player.depthOrder != null ? player.depthOrder : ""}
              </span>
              <h2 className="truncate text-xl font-semibold text-zinc-100">
                {player.name}
              </h2>
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {player.team} · bye {bye ?? "—"}
              {player.yearsExp != null
                ? ` · ${player.yearsExp === 0 ? "rookie" : `${player.yearsExp} yr exp`}`
                : ""}
              {player.injuryStatus ? ` · ${player.injuryStatus}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="border-b border-zinc-800 px-5 py-3">
          {drafted ? (
            <p className="text-sm text-zinc-400">
              Drafted{" "}
              <span className="font-mono text-zinc-200">#{drafted.pickNo}</span>
              {isMine ? (
                <span className="ml-2 text-xs font-semibold tracking-wide text-[#3FE0CE] uppercase">
                  your pick
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[#3FE0CE]">
              Still available
            </p>
          )}
        </div>

        <div className="p-5">
          {error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : isLoading ? (
            <p className="text-sm text-zinc-500">Loading stats…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="text-[10px] tracking-wide text-zinc-500 uppercase">
                      <th className="py-1 pr-3 text-left font-medium">Season</th>
                      <th className="px-2 py-1 text-right font-medium">GP</th>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className="px-2 py-1 text-right font-medium"
                        >
                          {column.label}
                        </th>
                      ))}
                      <th className="px-2 py-1 text-right font-medium">
                        {scoring.label}
                      </th>
                      <th className="py-1 pl-2 text-right font-medium">/G</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {seasons.map((season) => {
                      const line = bySeason.get(season);
                      const points = line?.[scoring.key];
                      const perGame =
                        points != null && line?.gp
                          ? Math.round((points / line.gp) * 10) / 10
                          : null;
                      return (
                        <tr key={season}>
                          <td className="py-1.5 pr-3 font-mono text-zinc-400">
                            {season}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-zinc-400">
                            {line?.gp ?? "—"}
                          </td>
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              className="px-2 py-1.5 text-right font-mono text-zinc-300"
                            >
                              {line?.[column.key] ?? "—"}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-zinc-100">
                            {points ?? "—"}
                          </td>
                          <td className="py-1.5 pl-2 text-right font-mono text-zinc-400">
                            {perGame ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {bySeason.size === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  No fantasy stats on file for the last {seasons.length}{" "}
                  seasons — typically a rookie or a deep-bench player.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
