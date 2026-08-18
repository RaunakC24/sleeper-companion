import { STATS_SEASONS } from "@/lib/seasons";
import type { SeasonStatLine, StatsPayload } from "@/lib/stats";

/**
 * Proxy for Sleeper's per-season stats (/v1/stats/nfl/regular/{season}).
 *
 * Each season is ~1.9MB across ~8k entries, most of them players who never
 * scored. This trims to the fantasy stat lines (~1,350 players/season) and the
 * fields the player detail card shows, then caches in module memory like
 * /api/players does.
 */

const TTL_MS = 12 * 60 * 60 * 1000;

/** Sleeper stat key -> our field name. Everything else is dropped. */
const FIELDS: Record<string, keyof SeasonStatLine> = {
  gp: "gp",
  pts_ppr: "ptsPpr",
  pts_half_ppr: "ptsHalfPpr",
  pts_std: "ptsStd",
  pass_att: "passAtt",
  pass_cmp: "passCmp",
  pass_yd: "passYd",
  pass_td: "passTd",
  pass_int: "passInt",
  rush_att: "rushAtt",
  rush_yd: "rushYd",
  rush_td: "rushTd",
  rec: "rec",
  rec_tgt: "recTgt",
  rec_yd: "recYd",
  rec_td: "recTd",
  fum_lost: "fumLost",
};

let cached: StatsPayload | null = null;
let cachedAt = 0;
let inFlight: Promise<StatsPayload> | null = null;

async function loadSeason(
  season: string,
  into: StatsPayload["stats"],
): Promise<void> {
  const res = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/regular/${season}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Sleeper stats ${season} returned ${res.status}`);
  const raw = (await res.json()) as Record<
    string,
    Record<string, number> | null
  >;

  for (const [playerId, values] of Object.entries(raw)) {
    if (!values) continue;
    // No PPR total means the player never registered a fantasy stat line.
    if (typeof values.pts_ppr !== "number") continue;

    const line: SeasonStatLine = { season };
    for (const [sleeperKey, field] of Object.entries(FIELDS)) {
      const value = values[sleeperKey];
      if (typeof value === "number") {
        (line[field] as number) = Math.round(value * 10) / 10;
      }
    }

    const bucket = into[playerId];
    if (bucket) bucket.push(line);
    else into[playerId] = [line];
  }
}

async function load(): Promise<StatsPayload> {
  const stats: StatsPayload["stats"] = {};
  // Sequential on purpose: three 1.9MB responses at once is a lot of memory
  // for one serverless invocation, and this only runs on a cold cache.
  for (const season of STATS_SEASONS) {
    await loadSeason(season, stats);
  }
  for (const lines of Object.values(stats)) {
    lines.sort((a, b) => Number(b.season) - Number(a.season));
  }
  return { seasons: [...STATS_SEASONS].sort().reverse(), stats };
}

export async function GET() {
  const fresh = cached && Date.now() - cachedAt < TTL_MS;
  if (!fresh) {
    try {
      inFlight ??= load();
      cached = await inFlight;
      cachedAt = Date.now();
    } catch (err) {
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
