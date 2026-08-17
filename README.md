# FF Draft Assistant

A companion app for [Sleeper](https://sleeper.com) fantasy football leagues, built on
Sleeper's [public API](https://docs.sleeper.com). It adds draft-day and season-long
tools that Sleeper itself doesn't have.

**Status: Phase 1 — live draft tracker.** No accounts, no database. Everything lives
in local component state and disappears on reload.

## Running it

```bash
npm run dev
```

Then open http://localhost:3000.

## What Phase 1 does

Paste a Sleeper draft ID, league ID, or any `sleeper.com` league/draft URL. The app
resolves it to a draft and polls `/v1/draft/{draft_id}/picks` while the draft is live.

**Positional run detector** — flags when N+ of the last W picks went to one position.
Defaults to 3 of the last 5, adjustable in the UI (window 5–8, threshold 2–5). Only
QB/RB/WR/TE count toward a run; late-round K/DEF flurries are noise.

**Bye-week tracker** — pick your team (by draft slot, or by pasting a Sleeper
`user_id`) and the app shows your drafted roster's bye-week distribution, flagging any
week with 3+ of your players on bye.

## Testing without a live draft

The setup screen has a sample completed draft (`257270643320426496`). Load it, then hit
**Replay draft** to reveal the picks one at a time so both tools react as if it were
live. Slot 6 in that draft ends up with 4 players on the Week 11 bye, which trips the
cluster warning.

## Notes on the data

- **Bye weeks** are a static table for the **2026** season in
  [`src/lib/byeWeeks.ts`](src/lib/byeWeeks.ts), verified against two independent
  sources. To roll to a new season, replace `BYE_WEEKS` and bump `BYE_SEASON`.
- **No player database needed.** Sleeper's pick `metadata` already carries the
  player's name, position, and team, so Phase 1 never downloads the ~5MB
  `/v1/players/nfl` payload.
- **Calls go straight from the browser.** Sleeper sends
  `access-control-allow-origin: *`, so there's no proxy route. Polling pauses while the
  tab is hidden and stops entirely once a draft is complete, to stay well under
  Sleeper's 1000 calls/minute guidance.
- Sleeper draft IDs and league IDs are both numeric, so a bare number is ambiguous —
  the app tries the draft endpoint first and falls back to treating it as a league.

## Layout

```
src/
  app/page.tsx              entry point
  components/
    DraftTracker.tsx        state, polling loop, replay
    DraftSetup.tsx          draft ID / URL entry
    RunAlert.tsx            positional run detector UI
    TeamPicker.tsx          choose your team
    ByePanel.tsx            bye distribution + cluster warnings
    PickFeed.tsx            live pick list
  lib/
    sleeper.ts              API client, ID parsing, roster resolution
    runDetector.ts          run detection logic
    byeAnalysis.ts          bye bucketing + cluster logic
    byeWeeks.ts             static 2026 bye table
    positions.ts            shared position colors
    types.ts                Sleeper API shapes
```

## Planned

Phase 2: tier/value overlay from a user-uploaded rankings CSV.
Phase 3: handcuff reminders.
Phase 4: accounts + persistence (Supabase).
Phase 5: season-long tools — waivers, trade analyzer, lineup optimizer, multi-league
dashboard.
