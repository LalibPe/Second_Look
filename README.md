# Second Look — youth volleyball tryout review

A client-side coaching tool for reviewing youth volleyball tryouts. It answers one
question before the squad is finalized: **who had fewer chances to show a skill than
comparable players?** Built with React, TanStack Start, Tailwind CSS v4 and Recharts.

## Run it

```bash
bun install
bun run dev      # http://localhost:8080
bun run test     # vitest unit tests
```

## What it does

- **Players tab** — roster with search, position and birth-quarter filters, grouping by
  quarter or position, a "Second look only" filter (suggested or coach-flagged) and a
  "Highlight second looks" emphasis toggle. The selection audit shows how tentative
  picks distribute across birth quarters; clicking a quarter filters the roster (the
  audit itself always uses the full roster).
- **Player profile** — the peer comparison ("13 attempts vs 24 peer median") above a
  progress chart (per-skill success rate or the subjective 1–5 coach assessment) and a
  monthly calendar that fills dates with saved activity. Peer attempt counts behind each
  median are viewable, anonymized.
- **Schedule tab** — monthly calendar with recurring practice weekdays (editable, with
  an effective date that defaults to tomorrow), one-off add/move/cancel, and game or
  tournament markers. Historical sessions are always preserved.
- **Log session** — three-step flow (date/type/players → one player at a time → review).
  A repeat log for the same player and date opens the existing entry for editing, so a
  session can never be double-counted. For scrimmages and matches the coach can
  optionally record actual on-court minutes per player.
- **Follow-up plan tab** — drills with target reps per skill, add/edit/remove, CSV export.

Coach changes (flags, threshold, schedule edits, logged sessions, plan edits) are saved
in the browser's localStorage. Use "Reset demo" in the header to clear them.

## The second-look rule

A player **outside the tentative squad** is suggested for a second look when their
recorded attempts in a role-relevant skill fall below **75% of the peer median**
(the threshold is an editable demo setting). Peers are players of the **same birth
quarter, position and session type** in the same tryout window; the player is excluded
from their own benchmark, and at least three comparable peers are required. If there
are too few peers or no recorded attempts, the interface explains what is missing and
the suggestion stays unset. A low success rate never triggers the rule — it measures
**opportunity**, not performance.

Example: Ana Begić has 13 serve receives recorded. The median for the 3 other Q4
liberos in these tryouts is 24. 13 is below 75% of 24 (18), so she is suggested. Her
9/13 to target (69.2%) is shown alongside as performance evidence.

Three states stay distinct: **Suggested for second look** (the rule), **Coach flagged**
(a manual checkbox) and **Follow-up scheduled** (a drill in the plan). A drill or a
checkbox can never change the calculated suggestion, and follow-up logs never change
the historical tryout comparison.

## Court time vs. opportunities vs. results

The app keeps three things separate on purpose:

- **Court time** — actual on-court minutes per player, logged optionally for scrimmages
  and matches. Whole-session duration is never used as a substitute; when minutes are
  missing or zero, the attempts-per-60 rate is simply unavailable.
- **Skill opportunities** — recorded attempts. The second-look rule compares these.
- **Results** — successes. A player's rate for a skill is the **combined** rate: total
  successes divided by total attempts across all entries, never an average of
  per-session percentages. Example: Ana has 6/8 and 3/5 in serve receive, giving 9/13
  to target = 69.2%. Per-date chart points sum that date's attempts and successes
  before computing the rate. Coach assessments (1–5) are subjective and kept on a
  separate chart.

## Synthetic data disclosure

All players, sessions and observations are **synthetic demo data** in `src/data/`
(`players.json`, `sessions.json`, `observations.json`, `scheduled_drills.json`,
`app_config.json`). Names are fictional, including the three Q4 libero trialists added
to demonstrate the peer comparison. The roster deliberately shows a relative-age
pattern (all 9 tentative picks born in the first half of the year) to demonstrate the
review workflow. Roster counts are always calculated from `players.json`.

Player portraits load from `/players/{player.id}.webp` (e.g. `/players/p01.webp`) when
present, with initials as the fallback.

## Limits of the selection audit

The audit is descriptive, not diagnostic. With 19 trialists, quarter cells hold only
3–7 players, so percentages are noisy. Birth quarter describes relative age within the
selection year (January 1 cutoff); it does not measure biological maturity and never
adds points to a player's evaluation. Background: [Relative age effects in youth
volleyball — Frontiers in Psychology (2020)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01445/full).
