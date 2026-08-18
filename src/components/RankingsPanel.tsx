"use client";

import { useRef } from "react";
import type { PickPlan } from "@/lib/draftOrder";
import type { RankingsSet } from "@/lib/rankings";
import type { TierStatus } from "@/lib/tiers";

interface Props {
  rankings: RankingsSet | null;
  tiers: TierStatus[];
  pickPlan: PickPlan;
  hasTeamSelected: boolean;
  playersReady: boolean;
  isParsing: boolean;
  error: string | null;
  onLoad: (file: File) => void;
  onClear: () => void;
}

export default function RankingsPanel({
  rankings,
  tiers,
  pickPlan,
  hasTeamSelected,
  playersReady,
  isParsing,
  error,
  onLoad,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atRisk = tiers.filter((tier) => tier.willRunOut);
  const alerting = atRisk.length > 0;

  return (
    <section
      className={`rounded-2xl border p-5 transition-colors ${
        alerting
          ? "border-[#FFAE58]/50 bg-[#FFAE58]/5"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            className={`text-sm font-semibold tracking-wide uppercase ${
              alerting ? "text-[#FFC07F]" : "text-zinc-200"
            }`}
          >
            Your rankings
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {rankings
              ? `${rankings.fileName} · ${rankings.matchedCount}/${rankings.players.length} matched`
              : "Upload a CSV to grade picks and track tiers"}
          </p>
        </div>
        {rankings ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            Clear
          </button>
        ) : null}
      </div>

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

      {!rankings ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={!playersReady || isParsing}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-zinc-700 px-4 py-6 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isParsing
              ? "Reading…"
              : playersReady
                ? "Choose a CSV file"
                : "Waiting for player data…"}
          </button>
          <p className="mt-3 text-xs text-zinc-600">
            Needs a header row with a <span className="text-zinc-400">Name</span>{" "}
            column. <span className="text-zinc-400">Rank</span> and{" "}
            <span className="text-zinc-400">Tier</span> columns are used when
            present; <span className="text-zinc-400">Pos</span> and{" "}
            <span className="text-zinc-400">Team</span> help resolve duplicate
            names. Row order is the fallback ranking.
          </p>
        </div>
      ) : (
        <>
          {pickPlan.nextPickNo != null ? (
            <p className="mt-4 text-sm text-zinc-300">
              Next pick{" "}
              <span className="font-mono text-zinc-100">
                #{pickPlan.nextPickNo}
              </span>
              <span className="text-zinc-500">
                {" "}
                ·{" "}
                {pickPlan.picksUntil === 0
                  ? "you're on the clock"
                  : `${pickPlan.picksUntil} pick${pickPlan.picksUntil === 1 ? "" : "s"} away`}
              </span>
            </p>
          ) : (
            <p className="mt-4 text-xs text-zinc-500">
              {hasTeamSelected
                ? "Pick order unavailable for this draft type."
                : "Select your team to see tier warnings for your next pick."}
            </p>
          )}

          {tiers.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No tier column in this file — picks are still graded against rank.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {tiers.map((tier) => (
                <li
                  key={tier.tier}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                    tier.willRunOut
                      ? "border-[#FFAE58]/40 bg-[#FFAE58]/10"
                      : "border-zinc-800 bg-zinc-950/40"
                  }`}
                >
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      tier.willRunOut ? "text-[#FFC07F]" : "text-zinc-300"
                    }`}
                  >
                    Tier {tier.tier}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                    {tier.remaining
                      .slice(0, 3)
                      .map((player) => player.name)
                      .join(", ")}
                    {tier.remaining.length > 3
                      ? ` +${tier.remaining.length - 3}`
                      : ""}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      tier.willRunOut ? "text-[#FFC07F]" : "text-zinc-500"
                    }`}
                  >
                    {tier.remaining.length} left
                  </span>
                </li>
              ))}
            </ul>
          )}

          {alerting ? (
            <p className="mt-3 text-xs text-[#FFC07F]">
              {atRisk.map((tier) => `Tier ${tier.tier}`).join(", ")} may be gone
              before pick #{pickPlan.nextPickNo}.
            </p>
          ) : null}

          {rankings.unmatched.length > 0 ? (
            <p className="mt-3 text-xs text-zinc-600">
              Unmatched: {rankings.unmatched.slice(0, 5).join(", ")}
              {rankings.unmatched.length > 5
                ? ` +${rankings.unmatched.length - 5} more`
                : ""}
            </p>
          ) : null}
        </>
      )}

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
