"use client";

import type { RunAnalysis, RunSettings } from "@/lib/runDetector";
import {
  RUN_THRESHOLD_MAX,
  RUN_THRESHOLD_MIN,
  RUN_WINDOW_MAX,
  RUN_WINDOW_MIN,
} from "@/lib/runDetector";
import { positionBar, positionStyle, sortPositions } from "@/lib/positions";

interface Props {
  analysis: RunAnalysis;
  settings: RunSettings;
  onSettingsChange: (settings: RunSettings) => void;
  showControls: boolean;
}

export default function RunAlert({
  analysis,
  settings,
  onSettingsChange,
  showControls,
}: Props) {
  const { runs, counts, window } = analysis;
  const hasRun = runs.length > 0;

  return (
    <section
      className={
        hasRun
          ? "run-alert-active rounded-2xl border-2 border-amber-400/60 bg-amber-950/30 p-5 ring-1 ring-amber-400/20"
          : "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {hasRun ? <LiveDot /> : null}
            <h2
              className={`text-sm font-semibold tracking-wide uppercase ${
                hasRun ? "text-amber-300" : "text-zinc-200"
              }`}
            >
              {hasRun ? "Run in progress" : "Positional runs"}
            </h2>
          </div>
          <p
            className={`mt-0.5 text-xs ${hasRun ? "text-amber-200/60" : "text-zinc-500"}`}
          >
            {settings.threshold}+ of the last {settings.windowSize} picks at one
            position
          </p>
        </div>
        {showControls ? (
          <div className="flex items-end gap-4">
            <Stepper
              label="Window"
              value={settings.windowSize}
              min={RUN_WINDOW_MIN}
              max={RUN_WINDOW_MAX}
              onChange={(windowSize) =>
                onSettingsChange({ ...settings, windowSize })
              }
            />
            <Stepper
              label="Threshold"
              value={settings.threshold}
              min={RUN_THRESHOLD_MIN}
              max={RUN_THRESHOLD_MAX}
              onChange={(threshold) =>
                onSettingsChange({ ...settings, threshold })
              }
            />
          </div>
        ) : null}
      </div>

      {hasRun ? (
        <div className="mt-4 space-y-3">
          {runs.map((run) => (
            <div
              key={run.position}
              className="relative overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-amber-500/8 to-transparent py-4 pr-4 pl-5"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5 bg-amber-400"
              />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="flex items-baseline gap-2.5">
                  <span className="text-4xl leading-none font-black tracking-tight text-amber-300">
                    {run.position}
                  </span>
                  <span className="text-xl font-bold tracking-[0.2em] text-amber-200/80 uppercase">
                    run
                  </span>
                </p>
                <p className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5">
                  <span className="font-mono text-2xl leading-none font-bold text-amber-200">
                    {run.count}
                  </span>
                  <span className="text-[11px] leading-tight text-amber-300/80">
                    of the last
                    <br />
                    {window.length} picks
                  </span>
                </p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {run.picks.map((pick) => (
                  <li key={pick.pickNo} className="text-xs text-amber-100/70">
                    <span className="font-mono text-amber-400/60">
                      #{pick.pickNo}
                    </span>{" "}
                    {pick.name}{" "}
                    <span className="text-amber-300/40">
                      {pick.team ?? "FA"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          {window.length === 0
            ? "Waiting for picks…"
            : "No run right now — the board is spread out."}
        </p>
      )}

      {counts.length > 0 ? (
        <div
          className={`mt-4 border-t pt-3 ${hasRun ? "border-amber-400/20" : "border-zinc-800"}`}
        >
          <p
            className={`text-[11px] tracking-wide uppercase ${hasRun ? "text-amber-200/50" : "text-zinc-600"}`}
          >
            Last {window.length} picks
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sortPositions(counts).map(({ position, count }) => (
              <span
                key={position}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${positionStyle(position)}`}
              >
                {position}
                <span className="font-mono opacity-70">{count}</span>
              </span>
            ))}
          </div>
          <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {window.map((pick) => (
              <span
                key={pick.pickNo}
                title={`#${pick.pickNo} ${pick.name} (${pick.position})`}
                className={`flex-1 rounded-full ${positionBar(pick.position)}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LiveDot() {
  return (
    <span aria-hidden className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
    </span>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] tracking-wide text-zinc-500 uppercase">
        {label}
      </p>
      <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-950">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="px-2 py-1 text-sm text-zinc-400 transition hover:text-zinc-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-sm text-zinc-100">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="px-2 py-1 text-sm text-zinc-400 transition hover:text-zinc-100 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
