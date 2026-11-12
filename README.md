# Second Look

Helps a youth football coach answer: **“Who have we seen too little of to make a confident decision?”**

## Setup
```
bun install
bun run dev      # http://localhost:8080
bunx vitest run  # calculation tests
```

## Review rule
A player is suggested for review when all hold:
- outside the provisional squad
- mean(latest passing, latest first touch, latest decision-making) **≥** rating threshold (default 7/10)
- total observed minutes **<** minute threshold (default 20)

All three assessments must be recorded. Birth quarter never affects eligibility. Thresholds, the plan and the observation-minute budget persist in localStorage.

## Synthetic data
All 16 players and their observations are fictional, fixed and bundled in `src/lib/demo-data.ts`. Birth quarters use a January 1 cutoff.

## Limitations
- Coach assessments are subjective; thresholds are demonstration rules, not validated cut-offs.
- Birth quarter shows relative age, not biological maturity.
- Peer comparison requires 3+ peers in the same quarter and position group, so it is often unavailable with this small dataset.
- No backend: data is local to the browser.
