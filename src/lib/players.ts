/** Trimmed NFL player record served by /api/players. */
export interface NflPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  status: string | null;
  injuryStatus: string | null;
  yearsExp: number | null;
  /** Sleeper's overall rank; lower is better. Null when unranked. */
  searchRank: number | null;
  /** e.g. "RB", "LWR", "SWR" — Sleeper splits receivers by alignment. */
  depthPosition: string | null;
  /** 1 = starter at that depth position. */
  depthOrder: number | null;
}

export interface PlayersPayload {
  players: NflPlayer[];
  fetchedAt: number;
}

export async function fetchPlayers(
  signal?: AbortSignal,
): Promise<PlayersPayload> {
  const res = await fetch("/api/players", { signal });
  if (!res.ok) {
    throw new Error("Could not load NFL player data.");
  }
  return (await res.json()) as PlayersPayload;
}
