import { BYE_WEEK_RANGE, getByeWeek } from "./byeWeeks";
import type { DraftedPlayer } from "./types";

/** 3+ players sharing a bye is the cluster threshold from the spec. */
export const BYE_CLUSTER_THRESHOLD = 3;

export interface ByeBucket {
  week: number;
  players: DraftedPlayer[];
  /** Position -> count within this week, for the "2 RB + 1 WR" style detail. */
  byPosition: { position: string; count: number }[];
  isCluster: boolean;
}

export interface ByeAnalysis {
  buckets: ByeBucket[];
  clusters: ByeBucket[];
  /** Drafted players whose team has no entry in the bye table. */
  unknown: DraftedPlayer[];
  totalWithBye: number;
  maxInAnyWeek: number;
}

/**
 * Bucket a roster by bye week and flag clusters. Weeks with no players are kept
 * so the distribution renders as a stable, full-width chart.
 */
export function analyzeByeWeeks(players: DraftedPlayer[]): ByeAnalysis {
  const byWeek = new Map<number, DraftedPlayer[]>();
  const unknown: DraftedPlayer[] = [];

  for (const player of players) {
    const week = getByeWeek(player.team);
    if (week == null) {
      unknown.push(player);
      continue;
    }
    const list = byWeek.get(week);
    if (list) list.push(player);
    else byWeek.set(week, [player]);
  }

  const weeks = new Set<number>([...BYE_WEEK_RANGE, ...byWeek.keys()]);
  const buckets: ByeBucket[] = [...weeks]
    .sort((a, b) => a - b)
    .map((week) => {
      const bucketPlayers = byWeek.get(week) ?? [];
      return {
        week,
        players: bucketPlayers,
        byPosition: countPositions(bucketPlayers),
        isCluster: bucketPlayers.length >= BYE_CLUSTER_THRESHOLD,
      };
    });

  const totalWithBye = players.length - unknown.length;
  const maxInAnyWeek = buckets.reduce(
    (max, bucket) => Math.max(max, bucket.players.length),
    0,
  );

  return {
    buckets,
    clusters: buckets.filter((bucket) => bucket.isCluster),
    unknown,
    totalWithBye,
    maxInAnyWeek,
  };
}

function countPositions(
  players: DraftedPlayer[],
): { position: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const player of players) {
    counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position));
}
