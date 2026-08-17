/** Shared position styling so the feed, run alerts and bye chart agree. */

const POSITION_STYLES: Record<string, string> = {
  QB: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  RB: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  WR: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  TE: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  K: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  DEF: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

const POSITION_BARS: Record<string, string> = {
  QB: "bg-amber-400",
  RB: "bg-emerald-400",
  WR: "bg-sky-400",
  TE: "bg-violet-400",
  K: "bg-zinc-400",
  DEF: "bg-rose-400",
};

const FALLBACK_STYLE = "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30";

export function positionStyle(position: string): string {
  return POSITION_STYLES[position] ?? FALLBACK_STYLE;
}

export function positionBar(position: string): string {
  return POSITION_BARS[position] ?? "bg-zinc-500";
}

/** Display order for position summaries. */
export const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];

export function sortPositions<T extends { position: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(a.position);
    const bi = POSITION_ORDER.indexOf(b.position);
    return (
      (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) ||
      a.position.localeCompare(b.position)
    );
  });
}
