"use client";

import { useMemo, useState } from "react";
import type { SleeperDraft, SleeperLeagueUser } from "@/lib/types";

interface Props {
  draft: SleeperDraft;
  leagueUsers: SleeperLeagueUser[];
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
}

interface TeamOption {
  userId: string;
  slot: number;
  label: string;
}

/** Compact config bar: who am I in this draft? Everything personal keys off it. */
export default function TeamPicker({
  draft,
  leagueUsers,
  selectedUserId,
  onSelect,
}: Props) {
  const [manualId, setManualId] = useState("");
  const [showManual, setShowManual] = useState(false);

  const options = useMemo<TeamOption[]>(() => {
    const order = draft.draft_order ?? {};
    const byUserId = new Map(leagueUsers.map((user) => [user.user_id, user]));
    return Object.entries(order)
      .map(([userId, slot]) => {
        const user = byUserId.get(userId);
        const name = user?.metadata?.team_name || user?.display_name;
        return {
          userId,
          slot,
          label: name ? `${name} (slot ${slot})` : `Slot ${slot}`,
        };
      })
      .sort((a, b) => a.slot - b.slot);
  }, [draft.draft_order, leagueUsers]);

  const knownSelection =
    selectedUserId != null &&
    options.some((option) => option.userId === selectedUserId);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Your team
          </span>
          {selectedUserId ? null : (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
              pick one to unlock your tools
            </span>
          )}
        </div>

        {options.length > 0 ? (
          <select
            value={knownSelection ? (selectedUserId as string) : ""}
            onChange={(event) => onSelect(event.target.value || null)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none sm:max-w-xs sm:flex-none"
          >
            <option value="">Select your team…</option>
            {options.map((option) => (
              <option key={option.userId} value={option.userId}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-zinc-500">
            No draft order yet — enter your Sleeper user ID.
          </span>
        )}

        {selectedUserId && !knownSelection ? (
          <span className="text-xs text-emerald-300">
            user <span className="font-mono">{selectedUserId}</span>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="ml-2 underline underline-offset-2 hover:text-emerald-200"
            >
              clear
            </button>
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => setShowManual((open) => !open)}
          className="text-xs text-zinc-500 underline underline-offset-2 transition hover:text-zinc-300"
        >
          {showManual ? "Hide" : "Use a user ID"}
        </button>

        {showManual ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = manualId.trim();
              if (trimmed) {
                onSelect(trimmed);
                setManualId("");
                setShowManual(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              placeholder="Sleeper user_id"
              spellCheck={false}
              autoComplete="off"
              className="w-44 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualId.trim()}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-40"
            >
              Use
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
