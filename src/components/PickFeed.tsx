"use client";

import { getByeWeek } from "@/lib/byeWeeks";
import { positionStyle } from "@/lib/positions";
import type { PickValue } from "@/lib/tiers";
import type { DraftedPlayer } from "@/lib/types";

interface Props {
  players: DraftedPlayer[];
  myPickNos: Set<number>;
  freshPickNos: Set<number>;
  teams: number | null;
  /** Empty when no rankings CSV is loaded. */
  values: Map<number, PickValue>;
}

export default function PickFeed({
  players,
  myPickNos,
  freshPickNos,
  teams,
  values,
}: Props) {
  const newest = [...players].reverse();

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-baseline justify-between border-b border-zinc-800 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
          Picks
        </h2>
        <span className="font-mono text-xs text-zinc-500">
          {players.length} made
        </span>
      </div>

      {newest.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">
          No picks yet. This list updates as they come in.
        </p>
      ) : (
        <ul className="max-h-[32rem] divide-y divide-zinc-800/70 overflow-y-auto">
          {newest.map((player) => {
            const isMine = myPickNos.has(player.pickNo);
            const bye = getByeWeek(player.team);
            const value = values.get(player.pickNo);
            return (
              <li
                key={player.pickNo}
                className={`flex items-center gap-3 px-5 py-2.5 ${
                  freshPickNos.has(player.pickNo) ? "pick-flash" : ""
                } ${isMine ? "border-l-2 border-l-emerald-400" : ""}`}
              >
                <span className="w-14 shrink-0 font-mono text-xs text-zinc-600">
                  {formatSlot(player, teams)}
                </span>
                <span
                  className={`w-11 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ring-1 ring-inset ${positionStyle(player.position)}`}
                >
                  {player.position}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                  {player.name}
                  {isMine ? (
                    <span className="ml-2 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
                      you
                    </span>
                  ) : null}
                  {player.isKeeper ? (
                    <span className="ml-2 text-[10px] tracking-wide text-zinc-500 uppercase">
                      keeper
                    </span>
                  ) : null}
                </span>
                {value && value.verdict !== "even" ? (
                  <span
                    title={`Ranked #${value.rank}, taken at #${value.pickNo}`}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      value.verdict === "value"
                        ? "bg-[#00CEB8]/15 text-[#3FE0CE]"
                        : "bg-[#FF2A6D]/15 text-[#FF6D9B]"
                    }`}
                  >
                    {value.verdict === "value" ? "+" : ""}
                    {value.delta}
                  </span>
                ) : null}
                <span className="shrink-0 text-xs text-zinc-500">
                  {player.team ?? "FA"}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-zinc-600">
                  {bye ? `bye ${bye}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** "3.07" when we know the team count, otherwise the raw overall pick number. */
function formatSlot(player: DraftedPlayer, teams: number | null): string {
  if (!teams || teams <= 0) return `#${player.pickNo}`;
  return `${player.round}.${String(player.draftSlot).padStart(2, "0")}`;
}
