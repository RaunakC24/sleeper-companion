import type { NflPlayer } from "./players";

export interface RankedPlayer {
  /** Overall rank from the CSV; 1 is the best player. */
  rank: number;
  tier: number | null;
  /** Name exactly as written in the CSV. */
  name: string;
  position: string | null;
  team: string | null;
  /** Sleeper player_id once matched, else null. */
  playerId: string | null;
}

export interface RankingsSet {
  fileName: string;
  players: RankedPlayer[];
  byPlayerId: Map<string, RankedPlayer>;
  matchedCount: number;
  unmatched: string[];
  tiers: number[];
}

export class RankingsError extends Error {}

/** RFC4180-ish CSV: handles quoted fields, embedded commas, doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Swallow the \n of a \r\n pair.
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "player", "playername", "player name", "fullname", "full name"],
  rank: ["rank", "overall", "overallrank", "ovr", "adp", "rk", "#"],
  tier: ["tier", "tiers", "tiernumber"],
  position: ["pos", "position"],
  team: ["team", "tm", "nfl", "nflteam"],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function resolveColumns(header: string[]): Record<string, number> {
  const found: Record<string, number> = {};
  header.forEach((raw, index) => {
    const key = normalizeHeader(raw);
    const compact = key.replace(/\s+/g, "");
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (field in found) continue;
      if (aliases.includes(key) || aliases.includes(compact)) {
        found[field] = index;
      }
    }
  });
  return found;
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Normalize a player name so "A.J. Brown" and "AJ Brown Jr." collide. */
export function normalizeName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[.'’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter((part) => !SUFFIXES.has(part));
  return parts.join("");
}

function buildNameIndex(players: NflPlayer[]): Map<string, NflPlayer[]> {
  const index = new Map<string, NflPlayer[]>();
  for (const player of players) {
    const key = normalizeName(player.name);
    const list = index.get(key);
    if (list) list.push(player);
    else index.set(key, [player]);
  }
  return index;
}

/**
 * Parse a rankings CSV and match each row to a Sleeper player.
 *
 * Required: a name column and a rank column. Tier, position and team are
 * optional; position/team are only used to break ambiguous name matches.
 */
export function buildRankings(
  fileName: string,
  text: string,
  nflPlayers: NflPlayer[],
): RankingsSet {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new RankingsError("That file has no data rows.");
  }

  const columns = resolveColumns(rows[0]);
  if (columns.name == null) {
    throw new RankingsError(
      "No name column found. Add a header row with a 'Name' or 'Player' column.",
    );
  }

  const nameIndex = buildNameIndex(nflPlayers);
  const players: RankedPlayer[] = [];
  const unmatched: string[] = [];
  let fallbackRank = 0;

  for (const row of rows.slice(1)) {
    const name = (row[columns.name] ?? "").trim();
    if (!name) continue;

    fallbackRank += 1;
    const rawRank =
      columns.rank != null ? Number(row[columns.rank]?.trim()) : NaN;
    const rank = Number.isFinite(rawRank) && rawRank > 0 ? rawRank : fallbackRank;

    const rawTier =
      columns.tier != null ? Number(row[columns.tier]?.trim()) : NaN;
    const tier = Number.isFinite(rawTier) ? rawTier : null;

    const position =
      columns.position != null
        ? (row[columns.position] ?? "").trim().toUpperCase() || null
        : null;
    const team =
      columns.team != null
        ? (row[columns.team] ?? "").trim().toUpperCase() || null
        : null;

    const candidates = nameIndex.get(normalizeName(name)) ?? [];
    let match: NflPlayer | undefined;
    if (candidates.length === 1) {
      match = candidates[0];
    } else if (candidates.length > 1) {
      match =
        candidates.find(
          (candidate) =>
            (position ? candidate.position === position : true) &&
            (team ? candidate.team === team : true),
        ) ??
        candidates.find((candidate) =>
          position ? candidate.position === position : false,
        ) ??
        candidates[0];
    }

    if (!match) unmatched.push(name);

    players.push({
      rank,
      tier,
      name,
      position,
      team,
      playerId: match?.id ?? null,
    });
  }

  players.sort((a, b) => a.rank - b.rank);

  const byPlayerId = new Map<string, RankedPlayer>();
  for (const player of players) {
    if (player.playerId && !byPlayerId.has(player.playerId)) {
      byPlayerId.set(player.playerId, player);
    }
  }

  const tiers = [
    ...new Set(
      players
        .map((player) => player.tier)
        .filter((tier): tier is number => tier != null),
    ),
  ].sort((a, b) => a - b);

  return {
    fileName,
    players,
    byPlayerId,
    matchedCount: byPlayerId.size,
    unmatched,
    tiers,
  };
}
