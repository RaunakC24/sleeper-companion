import type { RankedPlayer, RankingsSet } from "./rankings";
import type { DraftedPlayer } from "./types";

export type PickVerdict = "value" | "reach" | "even";

export interface PickValue {
  pickNo: number;
  rank: number;
  /** pickNo - rank. Positive means he fell past his rank. */
  delta: number;
  verdict: PickVerdict;
  tier: number | null;
}

/** How far off rank a pick must be before it counts as a reach or a value. */
export function valueThreshold(teams: number | null | undefined): number {
  return Math.max(6, teams ?? 12);
}

export function gradePicks(
  picks: DraftedPlayer[],
  rankings: RankingsSet,
  teams: number | null | undefined,
): Map<number, PickValue> {
  const threshold = valueThreshold(teams);
  const graded = new Map<number, PickValue>();

  for (const pick of picks) {
    const ranked = rankings.byPlayerId.get(pick.playerId);
    if (!ranked) continue;
    const delta = pick.pickNo - ranked.rank;
    const verdict: PickVerdict =
      delta >= threshold ? "value" : delta <= -threshold ? "reach" : "even";
    graded.set(pick.pickNo, {
      pickNo: pick.pickNo,
      rank: ranked.rank,
      delta,
      verdict,
      tier: ranked.tier,
    });
  }

  return graded;
}

export interface TierStatus {
  tier: number;
  remaining: RankedPlayer[];
  /** Best (lowest) remaining rank in this tier. */
  bestRank: number;
  /** True when the tier has fewer players left than picks before my turn. */
  willRunOut: boolean;
}

/**
 * Tiers that still have undrafted players, nearest to the current pick first.
 *
 * A tier is flagged when it has no more players left than there are picks
 * before my next turn — i.e. it can plausibly empty before I pick again.
 */
export function analyzeTiers(
  rankings: RankingsSet,
  draftedIds: Set<string>,
  picksUntil: number,
  limit = 4,
): TierStatus[] {
  const byTier = new Map<number, RankedPlayer[]>();

  for (const player of rankings.players) {
    if (player.tier == null) continue;
    if (player.playerId && draftedIds.has(player.playerId)) continue;
    const list = byTier.get(player.tier);
    if (list) list.push(player);
    else byTier.set(player.tier, [player]);
  }

  return [...byTier.entries()]
    .map(([tier, remaining]) => {
      const sorted = remaining.sort((a, b) => a.rank - b.rank);
      return {
        tier,
        remaining: sorted,
        bestRank: sorted[0].rank,
        willRunOut: sorted.length <= picksUntil,
      };
    })
    .sort((a, b) => a.bestRank - b.bestRank)
    .slice(0, limit);
}
