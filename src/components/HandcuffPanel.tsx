"use client";

import { useState } from "react";
import type { HandcuffWatch } from "@/lib/handcuffs";
import { positionStyle } from "@/lib/positions";

interface Props {
  watch: HandcuffWatch[];
  isLoading: boolean;
  error: string | null;
  hasPicks: boolean;
}

export default function HandcuffPanel({
  watch,
  isLoading,
  error,
  hasPicks,
}: Props) {
  const [minePlusOnly, setMinePlusOnly] = useState(false);

  const exposed = watch.filter((entry) => entry.topAvailable !== null);
  const shown = minePlusOnly
    ? exposed.filter((entry) => entry.isMine)
    : exposed;
  const alerting = shown.length > 0;

  return (
    <section
      className={`rounded-2xl border p-5 transition-colors ${
        alerting
          ? "border-[#00CEB8]/50 bg-[#00CEB8]/5"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {alerting ? (
              <span aria-hidden className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CEB8] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00CEB8]" />
              </span>
            ) : null}
            <h2
              className={`text-sm font-semibold tracking-wide uppercase ${
                alerting ? "text-[#3FE0CE]" : "text-zinc-200"
              }`}
            >
              Handcuff watch
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Backfields where the RB1 is drafted but his backup is still open
          </p>
        </div>

        <div className="flex items-center gap-3">
          {alerting ? (
            <span className="rounded-md border border-[#00CEB8]/40 bg-[#00CEB8]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#3FE0CE] uppercase">
              {shown.length} open
            </span>
          ) : null}
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={minePlusOnly}
              onChange={(event) => setMinePlusOnly(event.target.checked)}
              className="h-3.5 w-3.5 accent-[#00CEB8]"
            />
            My backs only
          </label>
        </div>
      </div>

      <Body
        shown={shown}
        exposedCount={exposed.length}
        isLoading={isLoading}
        error={error}
        hasPicks={hasPicks}
        minePlusOnly={minePlusOnly}
      />
    </section>
  );
}

function Body({
  shown,
  exposedCount,
  isLoading,
  error,
  hasPicks,
  minePlusOnly,
}: {
  shown: HandcuffWatch[];
  exposedCount: number;
  isLoading: boolean;
  error: string | null;
  hasPicks: boolean;
  minePlusOnly: boolean;
}) {
  if (error) return <p className="mt-4 text-sm text-rose-400">{error}</p>;
  if (isLoading) {
    return (
      <p className="mt-4 text-sm text-zinc-500">Loading NFL depth charts…</p>
    );
  }
  if (!hasPicks) {
    return (
      <p className="mt-4 text-sm text-zinc-500">
        Nothing to watch yet — no running backs drafted.
      </p>
    );
  }
  if (shown.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500">
        {minePlusOnly && exposedCount > 0
          ? `No open handcuffs on your roster — ${exposedCount} elsewhere in the league.`
          : "Every drafted RB1's backup is already gone."}
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map((entry) => (
        <li
          key={entry.starter.pickNo}
          className={`rounded-xl border p-3 ${
            entry.isMine
              ? "border-[#00CEB8]/40 bg-[#00CEB8]/10"
              : "border-zinc-800 bg-zinc-950/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${positionStyle("RB")}`}
            >
              RB1
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
              {entry.starter.name}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-zinc-600">
              {entry.isMine ? "you" : `#${entry.starter.pickNo}`}
            </span>
          </div>

          <p className="mt-2 flex items-baseline gap-1.5">
            <span aria-hidden className="text-zinc-600">
              →
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#3FE0CE]">
              {entry.topAvailable?.name}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-zinc-500">
              RB{entry.topAvailable?.depthOrder} {entry.team}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
