export interface GameLogWeek {
  week: number;
  /** Null when the player didn't play that week (bye, inactive, injured). */
  ptsPpr: number | null;
  ptsHalfPpr: number | null;
  ptsStd: number | null;
  opponent: string | null;
  isAway: boolean;
}

export interface GameLogSeason {
  season: string;
  weeks: GameLogWeek[];
}

export interface GameLogPayload {
  playerId: string;
  seasons: GameLogSeason[];
}

export async function fetchGameLog(
  playerId: string,
  signal?: AbortSignal,
): Promise<GameLogPayload> {
  const res = await fetch(
    `/api/gamelog?playerId=${encodeURIComponent(playerId)}`,
    { signal },
  );
  if (!res.ok) throw new Error("Could not load game log.");
  return (await res.json()) as GameLogPayload;
}

/** Highest weekly total across the seasons shown, for bar scaling. */
export function peakWeek(
  seasons: GameLogSeason[],
  key: "ptsPpr" | "ptsHalfPpr" | "ptsStd",
): number {
  let peak = 0;
  for (const season of seasons) {
    for (const week of season.weeks) {
      const value = week[key];
      if (value != null && value > peak) peak = value;
    }
  }
  return peak;
}
