# 0017 POM 14's front anchor is the strap join, never the strap top

Date: 2026-07-10

## Status

Accepted. Refines ADR 0016's no-seam fallback.

## Context

ADR 0016 moved `strap-top` to the right strap's stitched-section top seam,
with a no-seam fallback that raised the cup/strap join by `0.16 × viewHeight`.
On a plain-strap style (demo/3597.png) that fallback pinned the anchor at the
strap's top cut edge. TD correction: "strap anchor at the front must be the
front strap join, not the front strap top."

## Decision

The front POM 14 anchor is semantically the **strap join** — the seam where
the hanging strap attaches:

- With a stitched strap section: the top seam of that section
  (`detection.frontStrapStart`, unchanged from ADR 0016).
- Plain strap, no distinct seam: **the validated cup/strap join itself**
  (`apexRightInfo`, left fallback) — not a raised guess above it. Stays
  `low` confidence + `reviewRequired`.
- Same-day TD refinement: the anchor sits on the **outer edge** of the join
  run (the edge nearer the side seam), not the inner edge. The join detector
  now records `outerEdgeX` alongside the POM 16 `innerEdgeX`, exposed as
  `detection.apexLeftOuter` / `apexRightOuter`.
- The anchor's display name changes from "Front strap top" to
  **"Front strap join"**. The `strap-top` anchor *kind* is NOT renamed
  (matching the ADR 0011/0012 precedent of keeping kinds stable across
  semantic refinements).

`anchor_version` → `anchors-2026-07-10c`.

## Consequences

- On plain-strap styles POM 14 starts at the join seam the TD verifies,
  and the fallback no longer invents a point on plain fabric.
- In the fallback case POM 14's start coincides with the right cup/strap
  join landmark (POM 16 uses the inner-edge variant, so the two remain
  distinct anchors).
- Golden baselines change on ratio-fallback images only; re-baselined.
