/**
 * A recognizable identity color per NFL team, used for the depth-chart team
 * chips on hover.
 *
 * Where a team's literal primary is near-black (Raiders, Steelers, Bears), the
 * secondary that people actually identify the team by is used instead. The UI
 * mixes these toward white at render time, so navy and purple stay legible on
 * the dark background without losing their hue.
 */
export const TEAM_COLORS: Record<string, string> = {
  ARI: "#97233F",
  ATL: "#A71930",
  BAL: "#241773",
  BUF: "#00338D",
  CAR: "#0085CA",
  CHI: "#C83803",
  CIN: "#FB4F14",
  CLE: "#FF3C00",
  DAL: "#003594",
  DEN: "#FB4F14",
  DET: "#0076B6",
  GB: "#FFB612",
  HOU: "#A71930",
  IND: "#002C5F",
  JAX: "#006778",
  KC: "#E31837",
  LAC: "#0080C6",
  LAR: "#003594",
  LV: "#A5ACAF",
  MIA: "#008E97",
  MIN: "#4F2683",
  NE: "#002244",
  NO: "#D3BC8D",
  NYG: "#0B2265",
  NYJ: "#125740",
  PHI: "#004C54",
  PIT: "#FFB612",
  SEA: "#69BE28",
  SF: "#AA0000",
  TB: "#D50A0A",
  TEN: "#4B92DB",
  WAS: "#5A1414",
};

export function teamColor(team: string): string {
  return TEAM_COLORS[team] ?? "#71717a";
}
