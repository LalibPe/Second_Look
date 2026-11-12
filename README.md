# Second Look — youth volleyball tryout review

A client-side coaching tool for reviewing youth volleyball tryouts, planning a second
look, and recording what you saw at the follow-up session. Built with React, TanStack
Start, Tailwind CSS v4 and Recharts.

## Run it

```bash
bun install
bun run dev      # http://localhost:8080
bun run test     # vitest unit tests
```

## What it does

- **Players tab** — roster with search, position filter, grouping by birth quarter or
  position, a "Second look only" filter and a "Highlight second looks" emphasis toggle.
  The selection audit shows how provisional picks distribute across birth quarters;
  clicking a quarter filters the roster (the audit itself always uses the full roster).
- **Player profile** — skill totals, a progress chart (per-skill success rate or the
  subjective 1–5 coach assessment), and a monthly calendar that fills dates with saved
  activity. Each profile has a coach-controlled "Needs second look" checkbox.
- **Schedule tab** — monthly calendar with recurring practice weekdays (editable, with
  an effective date that defaults to tomorrow), one-off add/move/cancel, and game or
  tournament markers. Historical sessions are always preserved.
- **Log session** — three-step flow (date/type/players → one player at a time → review).
  A repeat log for the same player and date opens the existing entry for editing, so a
  session can never be double-counted.
- **Follow-up plan tab** — drills with target reps per skill, add/edit/remove, CSV export.

Coach changes (second-look flags, schedule edits, logged sessions, plan edits) are saved
in the browser's localStorage. Use "Reset demo" in the header to clear them.

## Synthetic data disclosure

All players, sessions and observations are **synthetic demo data** in `src/data/`
(`players.json`, `sessions.json`, `observations.json`, `scheduled_drills.json`,
`app_config.json`). Names are fictional. The roster deliberately shows a relative-age
pattern (all 9 provisional picks born in the first half of the year) to demonstrate the
review workflow.

## How skill rates are calculated

Measured skills (serve receive, attack, block, serve) are recorded as attempts and
successes. A player's rate for a skill is the **combined** rate: total successes divided
by total attempts across all entries, never an average of per-session percentages.
Example: Ana Begić has 6/8 and 3/5 in serve receive, giving 9/13 to target = 69.2%.
Per-date chart points sum that date's attempts and successes before computing the rate.
Coach assessments (1–5, from "Needs work" to "Consistently strong") are subjective and
are kept on a separate chart from measured success rates.

## Limits of the selection audit

The audit is descriptive, not diagnostic. With 16 trialists, quarter cells hold only
3–6 players, so percentages are noisy. Birth quarter describes relative age within the
selection year (January 1 cutoff); it gives age context and never determines who gets a
second look. Background: [Relative age effects in youth volleyball — Frontiers in
Psychology (2020)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01445/full).
