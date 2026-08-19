# Exec Plan — US-014 POM 7 arc tier (draft from cup-bottom structure)

## Goal

Recover POM 7 (cradle height at bottom cup) on real sketches that have no
drawn measurement line and no flat cradle seam — the demo1/demo4/demo5/demo7
REVIEW_ONLY cluster — by reading the cup-bottom structure itself (the traced
underwire arc), always low-confidence and review-flagged. Built directly on
the US-013 / ADR 0021 tier isolation.

## Scope

In scope:

- `findCupBottomFromInk` returns the arc-bottom column (`bottomX`) alongside
  `bottomY`/`support`.
- New `arc` seam tier: fires only when the seam tiers AND the guide tier all
  found nothing; requires a validated apex on the same side; prefers the
  right cup (TD labeling convention). Commits `cradle-cup-top` at the arc
  bottom, `cradle-cup-bottom` on the band edge directly below.
- cupModel trust allowlist: only `strong`/`seam` tiers feed the cup bottom
  AND the cup-side picker (arc/guide can influence neither).
- POM 6 rescue (`cradleCfFromCupSeam`) gated to trusted tiers — a curved
  wire's bottom y must not be projected onto the CF gore.
- QA: `source: seamArc`, confidence `low`, `reviewRequired`, explanatory note.
- Contract `C7.seam-source` accepts `seamArc` + review.
- **Product decision (human-confirmed 2026-07-11):** POM 7 MAY draft from
  structure without a drawn line, always review-flagged. The synthetic
  matrix's two "must stay REVIEW_ONLY" cases were rewritten to the stricter
  tier assertion `DRAWABLE@arc` (every case now asserts drawability AND
  acceptance tier, so promoting weak evidence into a trusted tier fails hard).

Out of scope:

- cradle-cf-top recovery on demo4/demo5 (gore-top / placket-junction
  detection — remains MISSING in accuracy, honest and measurable).
- Any cupModel geometry change; any rule-JSON change.

## Risk Classification

Risk flags: existing behavior (POM 7 acceptance contract), weak proof
(1-day-old draft GT), multi-domain via cupModel adjacency. Product-contract
change (synthetic hard-guard flip) → human confirmation obtained before
adopting (AskUserQuestion, 2026-07-11: "Yes, draw for review").

## Work Phases

Discovery → design → implementation → verification → ADR 0022 + docs. See
`validation.md` for results.

## Stop Conditions

- Golden drift on anything other than added cradle-cup anchors → stop.
- Invariant B3 or any inner-cup golden value moves → stop.
- Arc-tier accuracy vs GT worse than loose tolerance on demo5/demo7 → stop.
