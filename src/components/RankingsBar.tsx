"use client";

import { useRef } from "react";
import type { RankingsSet } from "@/lib/rankings";

interface Props {
  rankings: RankingsSet | null;
  playersReady: boolean;
  isParsing: boolean;
  error: string | null;
  onLoad: (file: File) => void;
  onClear: () => void;
}

/** Compact upload control. The tier analysis it unlocks lives in TierPanel. */
export default function RankingsBar({
  rankings,
  playersReady,
  isParsing,
  error,
  onLoad,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        Rankings
      </span>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onLoad(file);
          event.target.value = "";
        }}
      />

      {rankings ? (
        <>
          <span className="max-w-[14rem] truncate rounded-md border border-zinc-700 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-200">
            {rankings.fileName}
          </span>
          <span className="font-mono text-[11px] text-zinc-500">
            {rankings.matchedCount}/{rankings.players.length} matched
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-zinc-500 underline underline-offset-2 transition hover:text-zinc-300"
          >
            Clear
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={!playersReady || isParsing}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-dashed border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isParsing
              ? "Reading…"
              : playersReady
                ? "Upload CSV"
                : "Waiting for player data…"}
          </button>
          <span className="text-[11px] text-zinc-600">
            Needs a Name column; Rank and Tier are used when present.
          </span>
        </>
      )}

      {error ? (
        <span className="rounded-md border border-rose-900/60 bg-rose-950/40 px-2 py-1 text-[11px] text-rose-300">
          {error}
        </span>
      ) : null}
    </div>
  );
}
