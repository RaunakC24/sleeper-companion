import type { GameLogSeason, GameLogWeek } from "./gamelog";
import type { NflPlayer } from "./players";

export const MAX_COMPARE = 4;

export type ScoringKey = "ptsPpr" | "ptsHalfPpr" | "ptsStd";

export interface CompareSeasonRow {
  season: string;
  games: number;
  total: number;
  perGame: number | null;
}

export interface ComparedPlayer {
  player: NflPlayer;
  /** Game log after any "without X" filter is applied. */
  seasons: GameLogSeason[];
  rows: CompareSeasonRow[];
  overall: CompareSeasonRow;
  hasLog: boolean;
}

const key = (season: string, week: number) => `${season}:${week}`;

/**
 * Weeks a player actually appeared in.
 *
 * Sleeper returns a null entry for weeks a player missed, so a points value of
 * null means "did not play" while 0 means "played and scored nothing".
 */
export function weeksPlayed(
  log: GameLogSeason[],
  scoring: ScoringKey,
): Set<string> {
  const played = new Set<string>();
  for (const season of log) {
    for (const week of season.weeks) {
      if (week[scoring] != null) played.add(key(season.season, week.week));
    }
  }
  return played;
}

function summarize(
  season: string,
  weeks: GameLogWeek[],
  scoring: ScoringKey,
): CompareSeasonRow {
  const played = weeks.filter((week) => week[scoring] != null);
  const total = played.reduce((sum, week) => sum + (week[scoring] ?? 0), 0);
  return {
    season,
    games: played.length,
    total: Math.round(total * 10) / 10,
    perGame:
      played.length > 0 ? Math.round((total / played.length) * 10) / 10 : null,
  };
}

/**
 * Build the side-by-side comparison.
 *
 * When `excludeLog` is supplied, each player's weeks are narrowed to games that
 * player appeared in *and* the excluded player did not — the "how did he do
 * without the starter" question. Because the intersection requires the compared
 * player to have played, team byes drop out naturally rather than counting as
 * absences.
 */
export function buildComparison(
  players: NflPlayer[],
  logs: Map<string, GameLogSeason[]>,
  scoring: ScoringKey,
  excludeLog: GameLogSeason[] | null,
): ComparedPlayer[] {
  const excluded = excludeLog ? weeksPlayed(excludeLog, scoring) : null;

  return players.map((player) => {
    const log = logs.get(player.id) ?? [];
    const seasons: GameLogSeason[] = log.map((season) => ({
      season: season.season,
      weeks: excluded
        ? season.weeks.filter(
            (week) => !excluded.has(key(season.season, week.week)),
          )
        : season.weeks,
    }));

    const rows = seasons.map((season) =>
      summarize(season.season, season.weeks, scoring),
    );
    const allWeeks = seasons.flatMap((season) => season.weeks);

    return {
      player,
      seasons,
      rows,
      overall: summarize("all", allWeeks, scoring),
      hasLog: log.length > 0,
    };
  });
}

/** How many of a player's games survive the filter, for the summary line. */
export function filterImpact(
  logs: Map<string, GameLogSeason[]>,
  playerIds: string[],
  scoring: ScoringKey,
  excludeLog: GameLogSeason[] | null,
): { kept: number; total: number } {
  const excluded = excludeLog ? weeksPlayed(excludeLog, scoring) : null;
  let kept = 0;
  let total = 0;

  for (const id of playerIds) {
    for (const season of logs.get(id) ?? []) {
      for (const week of season.weeks) {
        if (week[scoring] == null) continue;
        total += 1;
        if (!excluded || !excluded.has(key(season.season, week.week))) {
          kept += 1;
        }
      }
    }
  }

  return { kept, total };
}
