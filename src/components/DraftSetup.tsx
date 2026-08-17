"use client";

import { useState } from "react";

interface Props {
  onConnect: (input: string) => void;
  isConnecting: boolean;
  error: string | null;
}

const SAMPLE_DRAFT_ID = "257270643320426496";

export default function DraftSetup({ onConnect, isConnecting, error }: Props) {
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto w-full max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim() && !isConnecting) onConnect(value);
        }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl"
      >
        <label
          htmlFor="draft-input"
          className="block text-sm font-medium text-zinc-200"
        >
          Sleeper draft ID or league URL
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Paste a draft ID, a league ID, or any sleeper.com league/draft link.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            id="draft-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://sleeper.com/draft/nfl/123456789012345678"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!value.trim() || isConnecting}
            className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isConnecting ? "Connecting…" : "Track draft"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500">
            No draft handy? Load a completed public draft to try the tools:
          </p>
          <button
            type="button"
            onClick={() => {
              setValue(SAMPLE_DRAFT_ID);
              onConnect(SAMPLE_DRAFT_ID);
            }}
            disabled={isConnecting}
            className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50"
          >
            {SAMPLE_DRAFT_ID}
          </button>
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-600">
        Nothing is stored — everything lives in this tab until you reload.
      </p>
    </div>
  );
}
