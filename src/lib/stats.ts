export interface SeasonStatLine {
  season: string;
  gp?: number;
  ptsPpr?: number;
  ptsHalfPpr?: number;
  ptsStd?: number;
  passAtt?: number;
  passCmp?: number;
  passYd?: number;
  passTd?: number;
  passInt?: number;
  rushAtt?: number;
  rushYd?: number;
  rushTd?: number;
  rec?: number;
  recTgt?: number;
  recYd?: number;
  recTd?: number;
  fumLost?: number;
}

export interface StatsPayload {
  seasons: string[];
  /** player_id -> season lines, newest first. */
  stats: Record<string, SeasonStatLine[]>;
}

export type ScoringType = "ppr" | "half_ppr" | "std";

/** Map a Sleeper draft's scoring_type onto our stat fields. */
export function scoringFor(scoringType: string | undefined): {
  key: "ptsPpr" | "ptsHalfPpr" | "ptsStd";
  label: string;
} {
  if (scoringType === "std") return { key: "ptsStd", label: "STD" };
  if (scoringType === "half_ppr") return { key: "ptsHalfPpr", label: "½ PPR" };
  return { key: "ptsPpr", label: "PPR" };
}

export async function fetchStats(signal?: AbortSignal): Promise<StatsPayload> {
  const res = await fetch("/api/stats", { signal });
  if (!res.ok) throw new Error("Could not load player stats.");
  return (await res.json()) as StatsPayload;
}
