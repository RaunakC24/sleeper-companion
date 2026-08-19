/** Shared position styling so every panel agrees.
 *
 *  Colors mirror Sleeper's own position palette:
 *  QB pink, RB teal-green, WR blue, TE orange-yellow, K purple, DEF brown.
 *
 *  Class strings are written out in full (never composed at runtime) so
 *  Tailwind's scanner can see them. */

interface PositionTheme {
  /** Tinted pill: background + text + ring. */
  pill: string;
  /** Solid fill, for bars and depth-chart accents. */
  bar: string;
  /** Text-only, for names and labels on a dark background. */
  text: string;
  /** Raw hex, for charts that need an inline style rather than a class. */
  hex: string;
}

const THEMES: Record<string, PositionTheme> = {
  QB: {
    pill: "bg-[#FF2A6D]/15 text-[#FF6D9B] ring-[#FF2A6D]/35",
    bar: "bg-[#FF2A6D]",
    hex: "#FF2A6D",
    text: "text-[#FF6D9B]",
  },
  RB: {
    pill: "bg-[#00CEB8]/15 text-[#3FE0CE] ring-[#00CEB8]/35",
    bar: "bg-[#00CEB8]",
    hex: "#00CEB8",
    text: "text-[#3FE0CE]",
  },
  WR: {
    pill: "bg-[#58A7FF]/15 text-[#7FBDFF] ring-[#58A7FF]/35",
    bar: "bg-[#58A7FF]",
    hex: "#58A7FF",
    text: "text-[#7FBDFF]",
  },
  TE: {
    pill: "bg-[#FFAE58]/15 text-[#FFC07F] ring-[#FFAE58]/35",
    bar: "bg-[#FFAE58]",
    hex: "#FFAE58",
    text: "text-[#FFC07F]",
  },
  K: {
    pill: "bg-[#BD66FF]/15 text-[#CE8CFF] ring-[#BD66FF]/35",
    bar: "bg-[#BD66FF]",
    hex: "#BD66FF",
    text: "text-[#CE8CFF]",
  },
  DEF: {
    pill: "bg-[#BF755D]/20 text-[#D9997F] ring-[#BF755D]/40",
    bar: "bg-[#BF755D]",
    hex: "#BF755D",
    text: "text-[#D9997F]",
  },
};

const FALLBACK: PositionTheme = {
  pill: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
  bar: "bg-zinc-500",
  text: "text-zinc-400",
  hex: "#71717a",
};

function theme(position: string): PositionTheme {
  return THEMES[position] ?? FALLBACK;
}

export function positionStyle(position: string): string {
  return theme(position).pill;
}

export function positionBar(position: string): string {
  return theme(position).bar;
}

export function positionText(position: string): string {
  return theme(position).text;
}

export function positionBarHex(position: string): string {
  return theme(position).hex;
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
