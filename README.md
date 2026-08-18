# FF Draft Assistant

A companion app for [Sleeper](https://sleeper.com) fantasy football leagues, built on
Sleeper's [public API](https://docs.sleeper.com). It adds draft-day and season-long
tools that Sleeper itself doesn't have.

**Status: Phases 1–3.** No accounts, no database yet — everything lives in local
component state and disappears on reload, including an uploaded rankings CSV.

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

**Handcuff watch** — league-wide, not just your roster. Any RB1 who has been drafted
by *anyone* and still has his backup on the board shows up here, because that backup is
worth knowing about regardless of who owns the starter. Your own backs sort first and
are highlighted, and "My backs only" narrows to them. RB-only by design: a backup RB
inherits a workload in a way a WR2 or TE2 does not. Fullbacks share Sleeper's RB depth
group but are never suggested as handcuffs.

**Depth charts tab** — browse any of the 32 teams' depth charts and see at a glance
who is already drafted (dimmed, with the pick number) and who is still open. "Available
only" hides everyone who is gone. Receivers follow Sleeper's alignment split — LWR, RWR
and SWR (slot) — rather than WR1/2/3. **Click any player** for a card with his last
three seasons: games, position-appropriate stat columns, and fantasy points in your
league's scoring, total and per game. Players with no fantasy history (rookies, deep
bench) say so rather than showing an empty table.

**Rankings overlay (Phase 2)** — upload your own CSV of rankings/tiers and the app
grades every pick against it. Picks that fell past their rank get a green `+n` badge,
reaches get a pink `-n` one, with the cutoff set to one round (your league's team
count). It also works out your next pick in the snake order and warns when a tier has
no more players left than there are picks before your turn — i.e. it can empty before
you pick again.

## Testing without a live draft

The setup screen has a sample completed draft (`257270643320426496`). Load it, then hit
**Replay draft** to reveal the picks one at a time so the tools react as if it were
live.

- **Slot 6** ends up with 4 players on the Week 11 bye — trips the cluster warning.
- **Slot 1** drafted Christian McCaffrey, who is still SF's RB1, so the handcuff watch
  surfaces Jordan James.
- [`samples/rankings-sample.csv`](samples/rankings-sample.csv) is a 150-player file
  ranked by 2025 PPR scoring. Upload it as Slot 1 and McCaffrey grades as `+24` (ranked
  1st, taken 25th) while Aaron Rodgers grades as `-15`.

Note that draft is from 2017, so most of its players have since retired and won't match
current depth charts or rankings — only the handful still active will light up.

## Notes on the data

- **Bye weeks** are a static table for the **2026** season in
  [`src/lib/byeWeeks.ts`](src/lib/byeWeeks.ts), verified against two independent
  sources. To roll to a new season, replace `BYE_WEEKS` and bump `BYE_SEASON`.
- **Position colors** mirror Sleeper's own palette: QB pink, RB teal-green, WR blue,
  TE orange-yellow, K purple, DEF brown. They live in
  [`src/lib/positions.ts`](src/lib/positions.ts).
- **Player data is proxied and trimmed.** The run detector and bye tracker need only
  the pick `metadata` Sleeper already returns, but depth charts and handcuffs need
  `/v1/players/nfl` — a ~14MB response Sleeper asks you to call at most once a day.
  [`src/app/api/players/route.ts`](src/app/api/players/route.ts) fetches it, strips it
  to the ten fields these features use (~185KB), and holds it in module memory for 12
  hours. It deliberately does not use Next's fetch cache, whose per-entry limit is 2MB.
  Changing the trimming logic requires a dev-server restart to clear that cache.
- **Season stats** come from `/v1/stats/nfl/regular/{season}` (undocumented but public)
  via [`src/app/api/stats/route.ts`](src/app/api/stats/route.ts), trimmed the same way
  to ~385KB for three seasons. They load lazily on the first player click rather than
  with the tab.
- **Rankings are matched by normalized name** — punctuation, casing and Jr./III
  suffixes are stripped, so "A.J. Brown" and "AJ Brown" collide. Position and team
  columns, when present, break ties between duplicate names.
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
    HandcuffPanel.tsx       RB1 backup reminders
    DepthChartView.tsx      per-team depth charts w/ drafted state
    PickFeed.tsx            live pick list w/ value/reach badges
    RankingsPanel.tsx       CSV upload, tier warnings, next pick
    PlayerStatsModal.tsx    per-player season stats card
  app/api/players/route.ts  trimmed + cached Sleeper player proxy
  app/api/stats/route.ts    trimmed + cached season stats proxy
  lib/
    sleeper.ts              API client, ID parsing, roster resolution
    players.ts              trimmed player type + client fetch
    depthChart.ts           depth-chart grouping
    handcuffs.ts            league-wide RB1 -> backup detection
    rankings.ts             CSV parsing + player matching
    tiers.ts                pick grading + tier survival
    draftOrder.ts           next-pick math for snake/linear
    stats.ts                stat types + scoring selection
    seasons.ts              which seasons to load
    runDetector.ts          run detection logic
    byeAnalysis.ts          bye bucketing + cluster logic
    byeWeeks.ts             static 2026 bye table
    positions.ts            Sleeper position colors
    types.ts                Sleeper API shapes
```

## Planned

Phase 4: accounts + persistence (Supabase) — today a reload loses your uploaded
rankings.
Phase 5: season-long tools — waivers, trade analyzer, lineup optimizer, multi-league
dashboard.
