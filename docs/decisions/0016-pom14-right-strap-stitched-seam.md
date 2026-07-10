# 0016 POM 14 starts at the right front strap's stitched-section top seam

Date: 2026-07-10

## Status

Accepted. Supersedes ADR 0015's POM 14 start-anchor placement.

## Context

TD review of the rendered POM 14 (incorrect/correct sketch pair, 2026-07-10)
showed two placement errors in the ADR 0015 implementation:

1. **Wrong strap.** The line started on the front view's LEFT strap, so the
   curve crossed the whole front view before reaching the back view. The
   TD-correct drawing starts on the RIGHT front strap — the strap adjacent to
   the back view, so the curve reads as one continuous physical strap going
   over the shoulder (front right strap ↔ back left strap on a standard
   two-view sheet).
2. **Too high.** The seam detector preferred the TOPMOST horizontal seam run
   in the strap window, which landed on the strap cap or the top of the
   elastic-stripe section. The TD-correct start is the joining seam at the
   TOP of the stitched (zigzag) section — at the ring, just above where the
   strap meets the cup.

## Decision

POM 14 remains a curved, front-to-back, always-verify measurement
(`strap-top` → `strap-bottom`), but `strap-top` is now:

- on the **right** shoulder strap of the `front_outer` view (the strap
  adjacent to the back view), sourced from the right cup/strap join
  (`apexRightInfo`, falling back to the left join when the right one is not
  validated);
- at the **lowest** qualifying horizontal seam run above the cup join — the
  upper joining seam of the stitched strap section. The zigzag stitching
  itself only produces sub-`minRun` runs, so it cannot win; the elastic
  stripes and strap cap sit higher and lose to the lowest-run preference.
- The no-seam fallback raises the right cup join by one strap section
  (`apex.y - 0.16 * viewHeight`), unchanged in shape from ADR 0015 but now
  anchored to the right join.

## Alternatives Considered

1. Keep the left strap and only fix the height. Rejected: the TD's correct
   drawing explicitly moves the start to the strap that visually continues
   into the back view's strap.
2. Detect the stitched block by row-density walking instead of seam runs.
   Rejected for now: heavier heuristic; the lowest-qualifying-run rule already
   lands on the stitched-section top seam on the demo corpus.

## Consequences

- `strap-top` moves substantially (left → right strap): golden anchor
  baselines re-baselined; `anchor_version` bumped to `anchors-2026-07-10b`.
- Contract suite C14 assertions (roles, sources, always-verify, front-only
  demotion) are side-agnostic and remain valid.
- The drawn POM 14 curve is much shorter and hugs the front/back gap,
  matching the TD's marked-correct sketch.
