import type { DraftedPlayer } from "./types";

/** Positions that can meaningfully "run". K/DEF late-round flurries are noise. */
const RUN_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

export const RUN_DEFAULTS = { windowSize: 5, threshold: 3 } as const;
export const RUN_WINDOW_MIN = 5;
export const RUN_WINDOW_MAX = 8;
export const RUN_THRESHOLD_MIN = 2;
export const RUN_THRESHOLD_MAX = 5;

export interface RunSettings {
  windowSize: number;
  threshold: number;
}

export interface PositionalRun {
  position: string;
  count: number;
  /** Picks in the window that make up the run, in draft order. */
  picks: DraftedPlayer[];
}

export interface RunAnalysis {
  /** The trailing slice of picks the analysis looked at. */
  window: DraftedPlayer[];
  /** Position -> how many of the window went to it, descending by count. */
  counts: { position: string; count: number }[];
  /** Positions at or over the threshold. */
  runs: PositionalRun[];
}

/**
 * Flag a positional run: `threshold`+ of the last `windowSize` picks going to
 * one position. `players` must be sorted ascending by pick number.
 */
export function analyzeRuns(
  players: DraftedPlayer[],
  settings: RunSettings = RUN_DEFAULTS,
): RunAnalysis {
  const windowSize = clamp(settings.windowSize, RUN_WINDOW_MIN, RUN_WINDOW_MAX);
  const threshold = clamp(
    settings.threshold,
    RUN_THRESHOLD_MIN,
    RUN_THRESHOLD_MAX,
  );

  const window = players.slice(-windowSize);

  const byPosition = new Map<string, DraftedPlayer[]>();
  for (const player of window) {
    const list = byPosition.get(player.position);
    if (list) list.push(player);
    else byPosition.set(player.position, [player]);
  }

  const counts = [...byPosition.entries()]
    .map(([position, picks]) => ({ position, count: picks.length }))
    .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position));

  const runs: PositionalRun[] = [];
  for (const [position, picks] of byPosition) {
    if (!RUN_POSITIONS.has(position)) continue;
    if (picks.length < threshold) continue;
    runs.push({ position, count: picks.length, picks });
  }
  runs.sort((a, b) => b.count - a.count || a.position.localeCompare(b.position));

  return { window, counts, runs };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
