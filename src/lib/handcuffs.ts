import { normalizeTeam } from "./byeWeeks";
import type { NflPlayer } from "./players";
import type { DraftedPlayer } from "./types";

export interface HandcuffBackup {
  player: NflPlayer;
  /** The pick that took him, or null if still available. */
  drafted: DraftedPlayer | null;
}

export interface HandcuffWatch {
  /** The RB1 who has been drafted — by anyone, not just me. */
  starter: DraftedPlayer;
  team: string;
  isMine: boolean;
  backups: HandcuffBackup[];
  /** The highest backup still on the board, if any. */
  topAvailable: NflPlayer | null;
}

/**
 * Handcuff watch across the whole league.
 *
 * Any RB who is his team's RB1 and has been drafted is a candidate: if his
 * direct backup is still on the board, that backup is worth knowing about
 * whether or not the starter landed on my roster. Entries on my own roster are
 * marked so the UI can lead with them.
 *
 * Deliberately RB-only — a backup RB inherits a workload in a way a WR2 or TE2
 * does not, so widening this to other positions would mostly add noise.
 */
export function findHandcuffs(
  draftedPlayers: DraftedPlayer[],
  allPlayers: NflPlayer[],
  draftedById: Map<string, DraftedPlayer>,
  myPickNos: Set<number>,
): HandcuffWatch[] {
  const byId = new Map(allPlayers.map((player) => [player.id, player]));

  // Team -> that team's RB depth chart, ascending. Fullbacks share the depth
  // group but are never the handcuff, so they are dropped here.
  const backfields = new Map<string, NflPlayer[]>();
  for (const player of allPlayers) {
    if (player.depthPosition !== "RB" || player.depthOrder == null) continue;
    if (player.position === "FB") continue;
    const team = normalizeTeam(player.team);
    if (!team) continue;
    const list = backfields.get(team);
    if (list) list.push(player);
    else backfields.set(team, [player]);
  }
  for (const list of backfields.values()) {
    list.sort((a, b) => (a.depthOrder ?? 99) - (b.depthOrder ?? 99));
  }

  const watch: HandcuffWatch[] = [];
  for (const starter of draftedPlayers) {
    if (starter.position !== "RB") continue;
    const record = byId.get(starter.playerId);
    if (!record || record.depthPosition !== "RB" || record.depthOrder !== 1) {
      continue;
    }
    const team = normalizeTeam(record.team);
    if (!team) continue;

    const backups: HandcuffBackup[] = (backfields.get(team) ?? [])
      .filter((player) => player.id !== record.id)
      .map((player) => ({
        player,
        drafted: draftedById.get(player.id) ?? null,
      }));

    watch.push({
      starter,
      team,
      isMine: myPickNos.has(starter.pickNo),
      backups,
      topAvailable:
        backups.find((backup) => backup.drafted === null)?.player ?? null,
    });
  }

  // Mine first, then the earliest-drafted backfields — those are the ones whose
  // handcuff carries the most value.
  return watch.sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    return a.starter.pickNo - b.starter.pickNo;
  });
}
