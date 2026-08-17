import type {
  DraftedPlayer,
  SleeperDraft,
  SleeperLeagueUser,
  SleeperPick,
} from "./types";

const BASE = "https://api.sleeper.app/v1";

/** Sleeper's public API sends `access-control-allow-origin: *`, so these run
 *  straight from the browser — no proxy route, and polling costs the user's own
 *  IP budget rather than a shared server one. Sleeper asks for < 1000 calls/min. */

export class SleeperError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SleeperError";
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { signal, cache: "no-store" });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new SleeperError(
      "Could not reach Sleeper. Check your network connection.",
    );
  }
  if (!res.ok) {
    throw new SleeperError(
      res.status === 404
        ? "Sleeper returned 404 (not found)."
        : `Sleeper returned ${res.status}.`,
      res.status,
    );
  }
  const body = (await res.json()) as T | null;
  if (body === null) {
    throw new SleeperError("Sleeper returned an empty result.", 404);
  }
  return body;
}

export function getDraft(draftId: string, signal?: AbortSignal) {
  return getJson<SleeperDraft>(`/draft/${draftId}`, signal);
}

export function getDraftPicks(draftId: string, signal?: AbortSignal) {
  return getJson<SleeperPick[]>(`/draft/${draftId}/picks`, signal);
}

export function getLeagueDrafts(leagueId: string, signal?: AbortSignal) {
  return getJson<SleeperDraft[]>(`/league/${leagueId}/drafts`, signal);
}

export function getLeagueUsers(leagueId: string, signal?: AbortSignal) {
  return getJson<SleeperLeagueUser[]>(`/league/${leagueId}/users`, signal);
}

type ParsedInput = { id: string; kind: "draft" | "league" | "unknown" };

/**
 * Accepts a bare id, a draft URL, or a league URL.
 *
 * Draft ids and league ids are both numeric snowflakes, so a bare number is
 * genuinely ambiguous — it comes back as "unknown" and `resolveDraft` probes
 * the draft endpoint first, then falls back to treating it as a league.
 */
export function parseDraftInput(raw: string): ParsedInput | null {
  const input = raw.trim();
  if (!input) return null;

  if (/^\d+$/.test(input)) return { id: input, kind: "unknown" };

  const draftUrl = input.match(/\/draft\/[a-z]+\/(\d+)/i);
  if (draftUrl) return { id: draftUrl[1], kind: "draft" };

  const leagueUrl = input.match(/\/leagues?\/(\d+)/i);
  if (leagueUrl) return { id: leagueUrl[1], kind: "league" };

  // Last resort: any long digit run inside whatever was pasted.
  const loose = input.match(/(\d{8,})/);
  if (loose) return { id: loose[1], kind: "unknown" };

  return null;
}

/** Turn whatever the user pasted into an actual draft. */
export async function resolveDraft(
  raw: string,
  signal?: AbortSignal,
): Promise<SleeperDraft> {
  const parsed = parseDraftInput(raw);
  if (!parsed) {
    throw new SleeperError(
      "That doesn't look like a Sleeper draft ID or league URL.",
    );
  }

  const asLeague = async () => {
    const drafts = await getLeagueDrafts(parsed.id, signal);
    if (!drafts.length) {
      throw new SleeperError("That league has no drafts yet.", 404);
    }
    // Sleeper returns most recent first.
    return drafts[0];
  };

  if (parsed.kind === "league") return asLeague();
  if (parsed.kind === "draft") return getDraft(parsed.id, signal);

  try {
    return await getDraft(parsed.id, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    try {
      return await asLeague();
    } catch (leagueErr) {
      if (leagueErr instanceof DOMException && leagueErr.name === "AbortError") {
        throw leagueErr;
      }
      throw new SleeperError(
        `No draft or league found for ID ${parsed.id}.`,
        404,
      );
    }
  }
}

/** Flatten raw picks into the shape the Phase 1 features consume, sorted by pick. */
export function toDraftedPlayers(picks: SleeperPick[]): DraftedPlayer[] {
  return picks
    .map((pick) => {
      const meta = pick.metadata ?? {};
      const name =
        [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() ||
        `Player ${pick.player_id}`;
      return {
        pickNo: pick.pick_no,
        round: pick.round,
        draftSlot: pick.draft_slot,
        playerId: pick.player_id,
        name,
        position: (meta.position ?? "UNK").toUpperCase(),
        team: meta.team ? meta.team.toUpperCase() : null,
        injuryStatus: meta.injury_status || null,
        pickedBy: pick.picked_by || null,
        rosterId: pick.roster_id ?? null,
        isKeeper: pick.is_keeper === true,
      } satisfies DraftedPlayer;
    })
    .sort((a, b) => a.pickNo - b.pickNo);
}

/**
 * Resolve a user's roster_id in this draft via draft_order -> slot -> roster_id.
 * Needed because `picked_by` comes back empty on autodrafted picks.
 */
export function rosterIdForUser(
  draft: SleeperDraft,
  userId: string,
): number | null {
  const slot = draft.draft_order?.[userId];
  if (slot == null) return null;
  return draft.slot_to_roster_id?.[String(slot)] ?? null;
}

export function draftSlotForUser(
  draft: SleeperDraft,
  userId: string,
): number | null {
  return draft.draft_order?.[userId] ?? null;
}

/** A pick belongs to me if the roster matches, or (fallback) the picker does. */
export function isMyPick(
  player: DraftedPlayer,
  userId: string | null,
  rosterId: number | null,
): boolean {
  if (rosterId != null && player.rosterId != null) {
    return player.rosterId === rosterId;
  }
  if (userId && player.pickedBy) return player.pickedBy === userId;
  return false;
}
