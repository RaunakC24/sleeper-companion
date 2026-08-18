import type { SleeperDraft } from "./types";

export interface PickPlan {
  /** Overall pick number of my next turn, or null if it can't be determined. */
  nextPickNo: number | null;
  /** How many picks happen before my turn. 0 means I'm on the clock. */
  picksUntil: number;
  round: number | null;
}

/**
 * Work out when my next pick lands.
 *
 * Snake drafts reverse the order every round; linear drafts don't. Auctions
 * have no pick order at all, so they return nulls and the tier warning is
 * simply hidden.
 */
export function planNextPick(
  draft: SleeperDraft,
  draftSlot: number | null,
  picksMade: number,
): PickPlan {
  const teams = draft.settings?.teams ?? 0;
  const rounds = draft.settings?.rounds ?? 0;
  const empty: PickPlan = { nextPickNo: null, picksUntil: 0, round: null };

  if (!draftSlot || teams <= 0) return empty;
  if (draft.type !== "snake" && draft.type !== "linear") return empty;

  const nextOverall = picksMade + 1;
  const maxRounds = rounds > 0 ? rounds : 100;

  for (let round = 1; round <= maxRounds; round += 1) {
    const slotThisRound =
      draft.type === "snake" && round % 2 === 0 ? teams - draftSlot + 1 : draftSlot;
    const pickNo = (round - 1) * teams + slotThisRound;
    if (pickNo >= nextOverall) {
      return {
        nextPickNo: pickNo,
        picksUntil: pickNo - nextOverall,
        round,
      };
    }
  }

  return empty;
}
