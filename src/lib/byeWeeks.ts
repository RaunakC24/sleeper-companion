/**
 * Static bye-week table for the 2026 NFL regular season.
 *
 * Verified 2026-08-16 against two independent sources that agree on all 32 teams:
 *   - https://www.nfl.com/news/2026-nfl-schedule-release-every-team-bye-week
 *   - https://fantasyfootballcalculator.com/nfl-bye-weeks
 *
 * Sanity checks that hold for 2026: byes span Weeks 5-14, there are no byes in
 * Week 12 (Thanksgiving), Week 11 is the heaviest with six teams, and every
 * team appears exactly once.
 *
 * Keys are Sleeper's team abbreviations (`metadata.team` on a draft pick).
 * To roll this table to a new season, replace BYE_WEEKS and bump BYE_SEASON.
 */

export const BYE_SEASON = "2026";

export const BYE_WEEKS: Record<string, number> = {
  ARI: 14,
  ATL: 11,
  BAL: 13,
  BUF: 7,
  CAR: 5,
  CHI: 10,
  CIN: 6,
  CLE: 11,
  DAL: 14,
  DEN: 10,
  DET: 6,
  GB: 11,
  HOU: 8,
  IND: 13,
  JAX: 7,
  KC: 5,
  LAC: 7,
  LAR: 11,
  LV: 13,
  MIA: 6,
  MIN: 6,
  NE: 11,
  NO: 8,
  NYG: 8,
  NYJ: 13,
  PHI: 10,
  PIT: 9,
  SEA: 11,
  SF: 8,
  TB: 10,
  TEN: 9,
  WAS: 7,
};

/** Relocated/renamed franchises, so historical drafts still resolve. */
const TEAM_ALIASES: Record<string, string> = {
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
  JAC: "JAX",
  WSH: "WAS",
  LA: "LAR",
};

/** Every week that has at least one bye, ascending. */
export const BYE_WEEK_RANGE: number[] = Array.from(
  new Set(Object.values(BYE_WEEKS)),
).sort((a, b) => a - b);

export function normalizeTeam(team: string | null | undefined): string | null {
  if (!team) return null;
  const key = team.trim().toUpperCase();
  if (!key) return null;
  return TEAM_ALIASES[key] ?? key;
}

/** Bye week for a team abbreviation, or null if unknown (e.g. a free agent). */
export function getByeWeek(team: string | null | undefined): number | null {
  const key = normalizeTeam(team);
  if (!key) return null;
  return BYE_WEEKS[key] ?? null;
}
