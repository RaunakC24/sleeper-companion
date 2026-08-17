"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ByePanel from "./ByePanel";
import DraftSetup from "./DraftSetup";
import PickFeed from "./PickFeed";
import RunAlert from "./RunAlert";
import TeamPicker from "./TeamPicker";
import { analyzeByeWeeks } from "@/lib/byeAnalysis";
import { analyzeRuns, RUN_DEFAULTS, type RunSettings } from "@/lib/runDetector";
import {
  getDraftPicks,
  getLeagueUsers,
  isMyPick,
  resolveDraft,
  rosterIdForUser,
  toDraftedPlayers,
} from "@/lib/sleeper";
import type {
  DraftedPlayer,
  SleeperDraft,
  SleeperLeagueUser,
} from "@/lib/types";

const POLL_OPTIONS = [3000, 5000, 10000, 15000];
const REPLAY_INTERVAL_MS = 1200;
const FRESH_PICK_MS = 2000;

export default function DraftTracker() {
  const [draft, setDraft] = useState<SleeperDraft | null>(null);
  const [leagueUsers, setLeagueUsers] = useState<SleeperLeagueUser[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [allPlayers, setAllPlayers] = useState<DraftedPlayer[]>([]);
  const [hasLoadedPicks, setHasLoadedPicks] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [intervalMs, setIntervalMs] = useState(5000);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [runSettings, setRunSettings] = useState<RunSettings>({
    ...RUN_DEFAULTS,
  });

  const [freshPickNos, setFreshPickNos] = useState<Set<number>>(new Set());
  const seenPickNos = useRef<Set<number>>(new Set());

  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replayCount, setReplayCount] = useState(0);

  const draftId = draft?.draft_id ?? null;
  const isComplete = draft?.status === "complete";
  const shouldPoll = draftId != null && !isComplete && !replayEnabled;

  const handleConnect = useCallback(async (input: string) => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const resolved = await resolveDraft(input);
      seenPickNos.current = new Set();
      setAllPlayers([]);
      setHasLoadedPicks(false);
      setFreshPickNos(new Set());
      setMyUserId(null);
      setReplayEnabled(false);
      setReplayCount(0);
      setPollError(null);
      setLastSync(null);
      setDraft(resolved);

      if (resolved.league_id) {
        try {
          setLeagueUsers(await getLeagueUsers(resolved.league_id));
        } catch {
          setLeagueUsers([]); // Names are a nicety; slots still work without them.
        }
      } else {
        setLeagueUsers([]);
      }
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Could not load that draft.",
      );
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const applyPicks = useCallback((players: DraftedPlayer[]) => {
    setAllPlayers(players);
    const seen = seenPickNos.current;
    const isFirstLoad = seen.size === 0;
    const fresh = new Set<number>();
    for (const player of players) {
      if (!seen.has(player.pickNo)) fresh.add(player.pickNo);
      seen.add(player.pickNo);
    }
    if (!isFirstLoad && fresh.size > 0) setFreshPickNos(fresh);
  }, []);

  // Poll Sleeper for picks. Runs once immediately, then on an interval while
  // the draft is live. Skips ticks when the tab is hidden.
  useEffect(() => {
    if (!draftId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let isFirstTick = true;
    let inFlight = false;
    const controller = new AbortController();

    const schedule = () => {
      if (cancelled || !shouldPoll) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      // The first fetch always runs; later ticks idle while the tab is hidden
      // so a backgrounded draft stays well under Sleeper's rate limit.
      if (!isFirstTick && document.visibilityState === "hidden") {
        schedule();
        return;
      }
      if (inFlight) return;
      isFirstTick = false;
      inFlight = true;
      try {
        const picks = await getDraftPicks(draftId, controller.signal);
        if (cancelled) return;
        applyPicks(toDraftedPlayers(picks));
        setPollError(null);
        setLastSync(Date.now());
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPollError(err instanceof Error ? err.message : "Sync failed.");
      } finally {
        inFlight = false;
        if (!cancelled) setHasLoadedPicks(true);
      }
      schedule();
    };

    // Catch up immediately when the user comes back to the tab, rather than
    // making them wait out a full interval.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldPoll) void tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    void tick();

    return () => {
      cancelled = true;
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [draftId, intervalMs, shouldPoll, applyPicks]);

  // Replay: reveal a completed draft one pick at a time, so the live tools can
  // be exercised without waiting for a real draft.
  useEffect(() => {
    if (!replayEnabled || replayCount >= allPlayers.length) return;
    const timer = setTimeout(() => {
      const revealed = allPlayers[replayCount];
      setReplayCount(replayCount + 1);
      if (revealed) setFreshPickNos(new Set([revealed.pickNo]));
    }, REPLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [replayEnabled, replayCount, allPlayers]);

  useEffect(() => {
    if (freshPickNos.size === 0) return;
    const timer = setTimeout(() => setFreshPickNos(new Set()), FRESH_PICK_MS);
    return () => clearTimeout(timer);
  }, [freshPickNos]);

  const visiblePlayers = useMemo(
    () => (replayEnabled ? allPlayers.slice(0, replayCount) : allPlayers),
    [replayEnabled, replayCount, allPlayers],
  );

  const myRosterId = useMemo(
    () => (draft && myUserId ? rosterIdForUser(draft, myUserId) : null),
    [draft, myUserId],
  );

  const myPlayers = useMemo(
    () =>
      myUserId
        ? visiblePlayers.filter((player) =>
            isMyPick(player, myUserId, myRosterId),
          )
        : [],
    [visiblePlayers, myUserId, myRosterId],
  );

  const myPickNos = useMemo(
    () => new Set(myPlayers.map((player) => player.pickNo)),
    [myPlayers],
  );

  const runAnalysis = useMemo(
    () => analyzeRuns(visiblePlayers, runSettings),
    [visiblePlayers, runSettings],
  );

  const byeAnalysis = useMemo(() => analyzeByeWeeks(myPlayers), [myPlayers]);

  if (!draft) {
    return (
      <DraftSetup
        onConnect={handleConnect}
        isConnecting={isConnecting}
        error={connectError}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-zinc-100">
              {draft.metadata?.name || "Sleeper draft"}
            </h1>
            <StatusBadge status={draft.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {draft.draft_id} · {draft.season} · {draft.type}
            {draft.settings?.teams ? ` · ${draft.settings.teams} teams` : ""}
            {draft.settings?.rounds ? ` · ${draft.settings.rounds} rounds` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SyncStatus
            shouldPoll={shouldPoll}
            lastSync={lastSync}
            error={pollError}
          />
          {!isComplete && !replayEnabled ? (
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              every
              <select
                value={intervalMs}
                onChange={(event) => setIntervalMs(Number(event.target.value))}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                {POLL_OPTIONS.map((ms) => (
                  <option key={ms} value={ms}>
                    {ms / 1000}s
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setConnectError(null);
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            Change draft
          </button>
        </div>
      </header>

      {isComplete ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-500">
            This draft is complete, so polling is off.{" "}
            <span className="text-zinc-400">
              Replay it pick-by-pick to watch the run detector and bye tracker
              react.
            </span>
          </p>
          <div className="flex items-center gap-2">
            {replayEnabled ? (
              <span className="font-mono text-xs text-emerald-400">
                {replayCount}/{allPlayers.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setReplayEnabled((enabled) => !enabled);
                setReplayCount(0);
                setFreshPickNos(new Set());
              }}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-600 hover:text-emerald-300"
            >
              {replayEnabled ? "Stop replay" : "Replay draft"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <RunAlert
            analysis={runAnalysis}
            settings={runSettings}
            onSettingsChange={setRunSettings}
            showControls
          />
          <TeamPicker
            draft={draft}
            leagueUsers={leagueUsers}
            selectedUserId={myUserId}
            onSelect={setMyUserId}
          />
          <ByePanel
            analysis={byeAnalysis}
            players={myPlayers}
            hasTeamSelected={myUserId != null}
          />
        </div>

        <div>
          {!hasLoadedPicks ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-8 text-center text-sm text-zinc-500">
              Loading picks…
            </div>
          ) : (
            <PickFeed
              players={visiblePlayers}
              myPickNos={myPickNos}
              freshPickNos={freshPickNos}
              teams={draft.settings?.teams ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  const tone =
    status === "drafting"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "complete"
        ? "border-zinc-700 bg-zinc-800/60 text-zinc-400"
        : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${tone}`}
    >
      {label}
    </span>
  );
}

function SyncStatus({
  shouldPoll,
  lastSync,
  error,
}: {
  shouldPoll: boolean;
  lastSync: number | null;
  error: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        {error}
      </span>
    );
  }

  if (!shouldPoll) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        paused
      </span>
    );
  }

  const seconds = lastSync ? Math.max(0, Math.round((now - lastSync) / 1000)) : null;

  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      {seconds == null ? "syncing…" : `synced ${seconds}s ago`}
    </span>
  );
}
