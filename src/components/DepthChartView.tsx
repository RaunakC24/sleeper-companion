"use client";

import { useEffect, useMemo, useState } from "react";
import ComparePanel from "./ComparePanel";
import PlayerStatsModal from "./PlayerStatsModal";
import { getByeWeek } from "@/lib/byeWeeks";
import { teamColor } from "@/lib/teamColors";
import {
  buildTeamDepthChart,
  fantasyPositionFor,
  isFilterCandidate,
  NFL_TEAMS,
} from "@/lib/depthChart";
import type { NflPlayer } from "@/lib/players";
import { positionStyle, positionText } from "@/lib/positions";
import { fetchGameLog, type GameLogSeason } from "@/lib/gamelog";
import { MAX_COMPARE } from "@/lib/compare";
import { fetchStats, scoringFor, type StatsPayload } from "@/lib/stats";
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
  // Game logs are cached by id and shared between the single-player card and
  // the comparison panel, so re-opening a player costs nothing.
  const [logs, setLogs] = useState<Map<string, GameLogSeason[]>>(new Map());
  const [logErrors, setLogErrors] = useState<Map<string, string>>(new Map());

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [excludeId, setExcludeId] = useState<string | null>(null);

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

  const byId = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  // Everyone whose weekly log the UI currently needs: the open card, the
  // comparison set, and whoever the "without" filter is keyed to.
  const neededLogIds = useMemo(() => {
    const ids = new Set<string>();
    if (selected) ids.add(selected.player.id);
    for (const id of compareIds) ids.add(id);
    if (excludeId) ids.add(excludeId);
    return [...ids].sort().join(",");
  }, [selected, compareIds, excludeId]);

  useEffect(() => {
    const wanted = neededLogIds ? neededLogIds.split(",") : [];
    const missing = wanted.filter(
      (id) => id && !logs.has(id) && !logErrors.has(id),
    );
    if (missing.length === 0) return;

    const controller = new AbortController();
    for (const id of missing) {
      fetchGameLog(id, controller.signal)
        .then((payload) =>
          setLogs((prev) => new Map(prev).set(id, payload.seasons)),
        )
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setLogErrors((prev) =>
            new Map(prev).set(
              id,
              err instanceof Error ? err.message : "Could not load game log.",
            ),
          );
        });
    }
    return () => controller.abort();
  }, [neededLogIds, logs, logErrors]);

  const comparePlayers = useMemo(
    () =>
      compareIds
        .map((id) => byId.get(id))
        .filter((player): player is NflPlayer => player != null),
    [compareIds, byId],
  );

  const loadingLogIds = useMemo(() => {
    const pending = new Set<string>();
    for (const id of neededLogIds ? neededLogIds.split(",") : []) {
      if (id && !logs.has(id) && !logErrors.has(id)) pending.add(id);
    }
    return pending;
  }, [neededLogIds, logs, logErrors]);

  // Filter candidates are teammates whose absence could plausibly change a
  // compared player's role — starters and immediate backups only.
  const filterCandidates = useMemo(() => {
    const teams = new Set(comparePlayers.map((player) => player.team));
    if (teams.size === 0) return [];
    return players
      .filter(
        (player) =>
          teams.has(player.team) &&
          isFilterCandidate(
            player.depthPosition,
            player.depthOrder,
            player.position,
          ),
      )
      .sort(
        (a, b) =>
          a.team.localeCompare(b.team) ||
          (a.depthPosition ?? "").localeCompare(b.depthPosition ?? "") ||
          (a.depthOrder ?? 99) - (b.depthOrder ?? 99),
      );
  }, [players, comparePlayers]);

  /** True once the staged players span more than one NFL team. */
  const spansTeams = useMemo(
    () => new Set(comparePlayers.map((player) => player.team)).size > 1,
    [comparePlayers],
  );

  const toggleCompare = (playerId: string) => {
    setCompareIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, playerId],
    );
  };

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
      {comparePlayers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#00CEB8]/40 bg-[#00CEB8]/5 p-3">
            <span className="text-[11px] font-semibold tracking-wide text-[#3FE0CE] uppercase">
              Comparing
            </span>
            {comparePlayers.map((player) => (
              <span
                key={player.id}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-200"
              >
                {player.name}
                <button
                  type="button"
                  onClick={() => toggleCompare(player.id)}
                  aria-label={`Remove ${player.name}`}
                  className="text-zinc-500 transition hover:text-zinc-100"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              disabled={comparePlayers.length < 2}
              className="ml-auto rounded-lg bg-[#00CEB8] px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-[#3FE0CE] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {comparePlayers.length < 2
                ? "Add one more"
                : `Compare ${comparePlayers.length}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setCompareIds([]);
                setExcludeId(null);
              }}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              Clear
            </button>
          </div>
        ) : null}

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
              data-active={abbr === team}
              style={
                { "--team-color": teamColor(abbr) } as React.CSSProperties
              }
              className={`team-chip rounded-md border px-2 py-1.5 font-mono text-xs ${
                abbr === team
                  ? "font-semibold"
                  : "border-zinc-800 text-zinc-400"
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
          Click any player for their recent stats, then add them to a comparison. Depth order comes from
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
          gameLog={logs.get(selected.player.id) ?? null}
          gameLogLoading={loadingLogIds.has(selected.player.id)}
          gameLogError={logErrors.get(selected.player.id) ?? null}
          isCompared={compareIds.includes(selected.player.id)}
          compareFull={compareIds.length >= MAX_COMPARE}
          onCompare={() => {
            toggleCompare(selected.player.id);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {compareOpen && comparePlayers.length > 0 ? (
        <ComparePanel
          players={comparePlayers}
          logs={logs}
          draftedById={draftedById}
          myPickNos={myPickNos}
          scoringKey={scoringFor(scoringType).key}
          scoringLabel={scoringFor(scoringType).label}
          filterCandidates={filterCandidates}
          excludeId={excludeId}
          onExcludeChange={setExcludeId}
          spansTeams={spansTeams}
          onRemove={(id) => toggleCompare(id)}
          onClose={() => setCompareOpen(false)}
          loadingIds={loadingLogIds}
        />
      ) : null}
    </div>
  );
}
