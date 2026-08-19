import type { NextRequest } from "next/server";
import { STATS_SEASONS } from "@/lib/seasons";
import type { GameLogPayload, GameLogSeason, GameLogWeek } from "@/lib/gamelog";

/**
 * Per-player weekly game log, one request per player instead of three.
 *
 * Sleeper's per-player endpoint returns a week-keyed object with a null entry
 * for weeks the player didn't appear, which is exactly the shape a game log
 * wants — the nulls are byes and inactives and are kept as gaps.
 */

const TTL_MS = 12 * 60 * 60 * 1000;
/** Bounded so a long draft browsing many players can't grow memory forever. */
const MAX_ENTRIES = 300;

interface WeekEntry {
  opponent?: string | null;
  is_away_team?: boolean | null;
  stats?: Record<string, number> | null;
}

const cache = new Map<string, { at: number; payload: GameLogPayload }>();

function num(value: number | undefined): number | null {
  return typeof value === "number" ? Math.round(value * 100) / 100 : null;
}

async function loadSeason(
  playerId: string,
  season: string,
): Promise<GameLogSeason> {
  const url =
    `https://api.sleeper.app/stats/nfl/player/${encodeURIComponent(playerId)}` +
    `?season_type=regular&season=${season}&grouping=week`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { season, weeks: [] };

  const raw = (await res.json()) as Record<string, WeekEntry | null> | null;
  if (!raw) return { season, weeks: [] };

  const weeks: GameLogWeek[] = [];
  for (const [key, entry] of Object.entries(raw)) {
    const week = Number(key);
    if (!Number.isFinite(week)) continue;
    const stats = entry?.stats ?? null;
    weeks.push({
      week,
      ptsPpr: num(stats?.pts_ppr),
      ptsHalfPpr: num(stats?.pts_half_ppr),
      ptsStd: num(stats?.pts_std),
      opponent: entry?.opponent ?? null,
      isAway: entry?.is_away_team === true,
    });
  }
  weeks.sort((a, b) => a.week - b.week);
  return { season, weeks };
}

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId || !/^[A-Za-z0-9]+$/.test(playerId)) {
    return Response.json({ error: "Missing or invalid playerId." }, {
      status: 400,
    });
  }

  const hit = cache.get(playerId);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Response.json(hit.payload, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    const seasons: GameLogSeason[] = [];
    for (const season of [...STATS_SEASONS].reverse()) {
      seasons.push(await loadSeason(playerId, season));
    }
    const payload: GameLogPayload = { playerId, seasons };

    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(playerId, { at: Date.now(), payload });

    return Response.json(payload, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upstream failed." },
      { status: 502 },
    );
  }
}
