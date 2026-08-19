"use client";

import type { PickPlan } from "@/lib/draftOrder";
import type { RankingsSet } from "@/lib/rankings";
import type { TierStatus } from "@/lib/tiers";

interface Props {
  rankings: RankingsSet;
  tiers: TierStatus[];
  pickPlan: PickPlan;
  hasTeamSelected: boolean;
}

export default function TierPanel({
  rankings,
  tiers,
  pickPlan,
  hasTeamSelected,
}: Props) {
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
            Tiers
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Flagged when a tier can empty before your next pick
          </p>
        </div>
        {pickPlan.nextPickNo != null ? (
          <p className="text-right text-xs">
            <span className="font-mono text-zinc-100">
              #{pickPlan.nextPickNo}
            </span>
            <span className="block text-zinc-500">
              {pickPlan.picksUntil === 0
                ? "on the clock"
                : `${pickPlan.picksUntil} away`}
            </span>
          </p>
        ) : null}
      </div>

      {pickPlan.nextPickNo == null ? (
        <p className="mt-4 text-xs text-zinc-500">
          {hasTeamSelected
            ? "Pick order unavailable for this draft type."
            : "Select your team to see tier warnings for your next pick."}
        </p>
      ) : null}

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
    </section>
  );
}
