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
      className={`rounded-2xl border p-5 transition-colors ${
        hasRun
          ? "border-amber-500/50 bg-amber-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Positional runs
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
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
        <ul className="mt-4 space-y-3">
          {runs.map((run) => (
            <li
              key={run.position}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">🔥</span>
                <p className="text-sm font-semibold text-amber-200">
                  {run.position} run — {run.count} of the last{" "}
                  {window.length} picks
                </p>
              </div>
              <ul className="mt-2 space-y-1">
                {run.picks.map((pick) => (
                  <li
                    key={pick.pickNo}
                    className="flex items-baseline gap-2 text-xs text-zinc-400"
                  >
                    <span className="font-mono text-zinc-600">
                      #{pick.pickNo}
                    </span>
                    <span className="text-zinc-300">{pick.name}</span>
                    <span className="text-zinc-600">{pick.team ?? "FA"}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          {window.length === 0
            ? "Waiting for picks…"
            : "No run right now — the board is spread out."}
        </p>
      )}

      {counts.length > 0 ? (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <p className="text-[11px] tracking-wide text-zinc-600 uppercase">
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
