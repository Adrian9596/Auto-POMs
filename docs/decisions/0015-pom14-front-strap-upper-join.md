# 0015 POM 14 starts at the front strap upper join

Date: 2026-07-10

## Status

Superseded by [0016 POM 14 starts at the right front strap's stitched-section top seam](0016-pom14-right-strap-stitched-seam.md).
Supersedes ADR 0013's POM 14 start anchor.

## Context

TD review of the rendered measurement showed that ADR 0013 started POM 14 too
low, at `apex-left` where the shoulder strap meets the cup. The approved
measurement starts at the upper joining seam of the stitched front strap
section and ends where the back strap joins the back panel.

## Decision

POM 14 remains a curved, front-to-back, always-verify measurement, but its
required anchors are now:

- start: `strap-top`, the upper joining seam of the left shoulder strap on the
  `front_outer` view
- end: `strap-bottom`, the shoulder strap/back-panel join on the `back` view

The front endpoint prefers a detected horizontal seam. If that seam is not
distinct, the anchor uses a low-confidence position above the detected cup
join. A missing back view still demotes POM 14 to `REVIEW_ONLY`.

## Alternatives Considered

1. Keep `apex-left`. Rejected because it measures from the cup join, below the
   TD-approved start point.
2. Add a new anchor kind. Rejected because the existing `strap-top` semantic is
   the correct contract name and avoids a duplicate strap-start landmark.

## Consequences

Positive:

- POM 14 endpoints match the TD-marked measurement.
- POM 14 no longer shares its start with POM 16's apex-distance anchor.

Tradeoffs:

- The front seam detector remains low confidence and must be verified by the TD.
- Golden anchor baselines change because `strap-top` moves from back to front.

## Follow-Up

- Keep the POM 14 synthetic and contract suites tied to `strap-top` →
  `strap-bottom`.
