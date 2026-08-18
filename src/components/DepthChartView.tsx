"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerStatsModal from "./PlayerStatsModal";
import { getByeWeek } from "@/lib/byeWeeks";
import {
  buildTeamDepthChart,
  fantasyPositionFor,
  NFL_TEAMS,
} from "@/lib/depthChart";
import type { NflPlayer } from "@/lib/players";
import { positionStyle, positionText } from "@/lib/positions";
import { fetchStats, type StatsPayload } from "@/lib/stats";
import type { DraftedPlayer } from "@/lib/types";

interface Props {
  players: NflPlayer[];
  draftedById: Map<string, DraftedPlayer>;
  myPickNos: Set<number>;
  isLoading: boolean;
  error: string | null;
  scoringType: string | undefined;
}

interface Selection {
  player: NflPlayer;
  fantasyPosition: string;
}

export default function DepthChartView({
  players,
  draftedById,
  myPickNos,
  isLoading,
  error,
  scoringType,
}: Props) {
  const [team, setTeam] = useState<string>("ARI");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Season stats are only worth their ~500KB once someone actually opens a
  // player, so they load on the first click rather than with the tab.
  useEffect(() => {
    if (!selected || stats || statsError) return;
    const controller = new AbortController();
    fetchStats(controller.signal)
      .then(setStats)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatsError(
          err instanceof Error ? err.message : "Could not load stats.",
        );
      });
    return () => controller.abort();
  }, [selected, stats, statsError]);

  const groups = useMemo(
    () => buildTeamDepthChart(players, team, draftedById),
    [players, team, draftedById],
  );

  const totals = useMemo(() => {
    let drafted = 0;
    let total = 0;
    for (const group of groups) {
      for (const slot of group.slots) {
        total += 1;
        if (slot.drafted) drafted += 1;
      }
    }
    return { drafted, total };
  }, [groups]);

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-5">
        <p className="text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-10 text-center">
        <p className="text-sm text-zinc-500">Loading NFL depth charts…</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Team
          </h2>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
              className="h-3.5 w-3.5 accent-[#00CEB8]"
            />
            Available only
          </label>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {NFL_TEAMS.map((abbr) => (
            <button
              key={abbr}
              type="button"
              onClick={() => setTeam(abbr)}
              className={`rounded-md border px-2 py-1.5 font-mono text-xs transition ${
                abbr === team
                  ? "border-zinc-400 bg-zinc-100 font-semibold text-zinc-900"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"
              }`}
            >
              {abbr}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-100">
            {team} depth chart
          </h2>
          <p className="font-mono text-xs text-zinc-500">
            bye {getByeWeek(team) ?? "—"} · {totals.drafted}/{totals.total}{" "}
            drafted
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No depth chart on file for {team}.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const slots = availableOnly
                ? group.slots.filter((slot) => !slot.drafted)
                : group.slots;
              if (slots.length === 0) return null;
              const fantasyPosition = fantasyPositionFor(group.depthPosition);
              return (
                <div
                  key={group.depthPosition}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                >
                  <p
                    className={`text-xs font-semibold tracking-wide uppercase ${positionText(fantasyPosition)}`}
                  >
                    {group.depthPosition}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {slots.map((slot) => {
                      const isMine =
                        slot.drafted != null &&
                        myPickNos.has(slot.drafted.pickNo);
                      return (
                        <li key={slot.player.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                player: slot.player,
                                fantasyPosition,
                              })
                            }
                            className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition hover:bg-zinc-800/70 ${
                              isMine
                                ? "bg-[#00CEB8]/10 ring-1 ring-[#00CEB8]/30 ring-inset"
                                : ""
                            }`}
                          >
                            <span
                              className={`w-6 shrink-0 rounded text-center text-[10px] font-semibold ring-1 ring-inset ${positionStyle(fantasyPosition)}`}
                            >
                              {slot.player.depthOrder}
                            </span>
                            <span
                              className={`min-w-0 flex-1 truncate ${
                                slot.drafted ? "text-zinc-500" : "text-zinc-100"
                              }`}
                            >
                              {slot.player.name}
                            </span>
                            {slot.drafted ? (
                              <span className="shrink-0 font-mono text-[10px] text-zinc-600">
                                {isMine ? "you" : `#${slot.drafted.pickNo}`}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[#3FE0CE] uppercase">
                                open
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-600">
          Click any player for their recent stats. Depth order comes from
          Sleeper; receivers are split by alignment — LWR, RWR and SWR (slot) —
          rather than WR1/2/3.
        </p>
      </section>

      {selected ? (
        <PlayerStatsModal
          player={selected.player}
          fantasyPosition={selected.fantasyPosition}
          drafted={draftedById.get(selected.player.id) ?? null}
          isMine={(() => {
            const pick = draftedById.get(selected.player.id);
            return pick != null && myPickNos.has(pick.pickNo);
          })()}
          lines={stats?.stats[selected.player.id] ?? null}
          seasons={stats?.seasons ?? []}
          scoringType={scoringType}
          isLoading={stats === null && statsError === null}
          error={statsError}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
