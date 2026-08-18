import { BYE_SEASON } from "./byeWeeks";

/** The season the app is configured for. */
export const CURRENT_SEASON = BYE_SEASON;

/** The three most recent completed seasons, newest last. */
export const STATS_SEASONS: string[] = (() => {
  const year = Number(CURRENT_SEASON);
  return [year - 3, year - 2, year - 1].map(String);
})();
