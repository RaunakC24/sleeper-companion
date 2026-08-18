import type { NflPlayer, PlayersPayload } from "@/lib/players";

/**
 * Proxy for Sleeper's /v1/players/nfl.
 *
 * That endpoint is ~14MB and Sleeper asks callers to hit it at most once a day,
 * so this route trims it to the handful of fields the depth-chart and handcuff
 * features need (~200KB) and holds the result in module memory.
 *
 * A module-level cache rather than Next's fetch cache on purpose: the upstream
 * response is far over the 2MB data-cache entry limit, so only the trimmed
 * result is worth caching. Each serverless instance keeps its own copy, which
 * is fine — a cold instance costs one upstream fetch.
 */

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const TTL_MS = 12 * 60 * 60 * 1000;
// FB is included so RB depth charts render without gaps (Sleeper lists
// fullbacks in the RB group); handcuff suggestions filter them back out.
const FANTASY_POSITIONS = new Set([
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
  "FB",
]);

interface RawPlayer {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
  active?: boolean;
  status?: string;
  injury_status?: string;
  years_exp?: number;
  search_rank?: number;
  depth_chart_position?: string;
  depth_chart_order?: number;
}

let cached: PlayersPayload | null = null;
let cachedAt = 0;
/** Shared so concurrent requests trigger one upstream fetch, not many. */
let inFlight: Promise<PlayersPayload> | null = null;

function trim(raw: Record<string, RawPlayer>): PlayersPayload {
  const players: NflPlayer[] = [];
  for (const value of Object.values(raw)) {
    const id = value.player_id;
    const position = value.position;
    if (!id || !position || !FANTASY_POSITIONS.has(position)) continue;
    if (!value.team) continue;
    if (value.active === false) continue;

    const name =
      value.full_name ||
      [value.first_name, value.last_name].filter(Boolean).join(" ") ||
      id;

    players.push({
      id,
      name,
      position,
      team: value.team.toUpperCase(),
      status: value.status ?? null,
      injuryStatus: value.injury_status || null,
      yearsExp: typeof value.years_exp === "number" ? value.years_exp : null,
      searchRank: typeof value.search_rank === "number" ? value.search_rank : null,
      depthPosition: value.depth_chart_position ?? null,
      depthOrder:
        typeof value.depth_chart_order === "number"
          ? value.depth_chart_order
          : null,
    });
  }
  players.sort((a, b) => (a.searchRank ?? 1e9) - (b.searchRank ?? 1e9));
  return { players, fetchedAt: Date.now() };
}

async function load(): Promise<PlayersPayload> {
  const res = await fetch(SLEEPER_PLAYERS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sleeper players returned ${res.status}`);
  const raw = (await res.json()) as Record<string, RawPlayer>;
  return trim(raw);
}

export async function GET() {
  const fresh = cached && Date.now() - cachedAt < TTL_MS;
  if (!fresh) {
    try {
      inFlight ??= load();
      cached = await inFlight;
      cachedAt = Date.now();
    } catch (err) {
      // Serve stale data rather than breaking the draft board mid-draft.
      if (!cached) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Upstream failed." },
          { status: 502 },
        );
      }
    } finally {
      inFlight = null;
    }
  }

  return Response.json(cached, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
