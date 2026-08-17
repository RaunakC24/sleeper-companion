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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
        Your team
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Pick your slot to unlock the bye-week tracker.
      </p>

      {options.length > 0 ? (
        <select
          value={knownSelection ? (selectedUserId as string) : ""}
          onChange={(event) => onSelect(event.target.value || null)}
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select your team…</option>
          {options.map((option) => (
            <option key={option.userId} value={option.userId}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500">
          This draft has no draft order yet — enter your Sleeper user ID below.
        </p>
      )}

      {selectedUserId && !knownSelection ? (
        <p className="mt-3 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          Using user ID{" "}
          <span className="font-mono">{selectedUserId}</span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="ml-2 underline underline-offset-2 hover:text-emerald-200"
          >
            clear
          </button>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowManual((open) => !open)}
        className="mt-3 text-xs text-zinc-500 underline underline-offset-2 transition hover:text-zinc-300"
      >
        {showManual ? "Hide" : "Enter a Sleeper user ID instead"}
      </button>

      {showManual ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = manualId.trim();
            if (trimmed) {
              onSelect(trimmed);
              setManualId("");
            }
          }}
          className="mt-2 flex gap-2"
        >
          <input
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
            placeholder="Sleeper user_id"
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!manualId.trim()}
            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-40"
          >
            Use
          </button>
        </form>
      ) : null}
    </div>
  );
}
