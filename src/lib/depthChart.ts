import { BYE_WEEKS, normalizeTeam } from "./byeWeeks";
import type { NflPlayer } from "./players";
import type { DraftedPlayer } from "./types";

/** Sleeper splits receivers by alignment, so these are depth *positions*,
 *  not fantasy positions. Order here is the order they render. */
export const DEPTH_GROUP_ORDER = ["QB", "RB", "LWR", "RWR", "SWR", "TE", "K"];

/** Depth-position -> the fantasy position it maps to, for coloring. */
export function fantasyPositionFor(depthPosition: string): string {
  if (depthPosition.endsWith("WR")) return "WR";
  return depthPosition;
}

export const NFL_TEAMS: string[] = Object.keys(BYE_WEEKS).sort();

export interface DepthSlot {
  player: NflPlayer;
  /** The pick that took him, or null if he's still on the board. */
  drafted: DraftedPlayer | null;
}

export interface DepthGroup {
  depthPosition: string;
  slots: DepthSlot[];
}

/** Index every drafted player by Sleeper player_id. */
export function indexDraftedById(
  players: DraftedPlayer[],
): Map<string, DraftedPlayer> {
  return new Map(players.map((player) => [player.playerId, player]));
}

/** Group a team's depth-charted players by depth position, in depth order. */
export function buildTeamDepthChart(
  players: NflPlayer[],
  team: string,
  draftedById: Map<string, DraftedPlayer>,
): DepthGroup[] {
  const key = normalizeTeam(team);
  const groups = new Map<string, DepthSlot[]>();

  for (const player of players) {
    if (normalizeTeam(player.team) !== key) continue;
    if (!player.depthPosition || player.depthOrder == null) continue;
    const slot: DepthSlot = {
      player,
      drafted: draftedById.get(player.id) ?? null,
    };
    const list = groups.get(player.depthPosition);
    if (list) list.push(slot);
    else groups.set(player.depthPosition, [slot]);
  }

  return [...groups.entries()]
    .map(([depthPosition, slots]) => ({
      depthPosition,
      slots: slots.sort(
        (a, b) => (a.player.depthOrder ?? 99) - (b.player.depthOrder ?? 99),
      ),
    }))
    .sort((a, b) => {
      const ai = DEPTH_GROUP_ORDER.indexOf(a.depthPosition);
      const bi = DEPTH_GROUP_ORDER.indexOf(b.depthPosition);
      return (
        (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) ||
        a.depthPosition.localeCompare(b.depthPosition)
      );
    });
}
