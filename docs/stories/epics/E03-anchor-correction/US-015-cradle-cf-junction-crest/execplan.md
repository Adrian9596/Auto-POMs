# Exec Plan — US-015 cradle-cf-top recovery: junction + crest tiers

## Goal

Recover `cradle-cf-top` (POM 6 start / POM 8 end) on the two style families
where the direct CF-seam detector structurally misses, closing the last
MISSING anchors in the 2026-07-11 accuracy corpus:

- **demo4** (front-closure): the cradle/band seam is interrupted AT the CF
  axis by the placket, and the cradle-row prior locks onto the neckline
  (row 0.54, rejected "too close to CF top") far above the true seam (0.834).
- **demo5** (plunge gore): no ink at the axis on the cradle row (0.79 is the
  blank gore interior); the true boundary is the gore-top crest (0.583).

## Scope

In scope:

- **Junction tier** (`src/auto-detection.js`, pixel-level, row-agnostic):
  scan rows below cf-top for a long horizontal seam run approaching the axis
  from BOTH sides, an EMPTY narrow CF gap centered on the axis, and vertical
  closure-edge ink bounding the gap (the placket signature; bands/CF lines/
  gore ink have ink AT the axis and fail; wire bottoms bounding a gore gap
  are locally horizontal and fail the vertical-edge check). Topmost
  qualifying row wins. Flag `cradleCfTopJunction`.
- **Crest tier** (`src/auto/anchors/seed-anchors.js`, contour-level): the
  existing US-012 crest finder additionally returns the topmost symmetric
  crest BELOW the cf-top floor (`crestBelowCfY`) — on a plunge gore the same
  contour has neckline samples just above cf-top and gore-top samples just
  below it, so the floor must be applied during selection, not after.
  Standalone seed at (axis, crest) when the direct detector missed;
  `detection.cradleCfCrestSeedY` is stashed BEFORE the landmark-QA build
  (which moved after the crest decision) so QA classifies the same decision.
- QA: sources `seamJunction` / `seamCrest`, confidence low, reviewRequired,
  explanatory notes; `C6.seam-source` accepts both only when review-flagged.
- Both tiers fire ONLY when the direct detector missed (additivity).

Out of scope: any trusted-tier promotion; POM 7 changes; rule-JSON changes.

## Risk Classification

Existing behavior + weak proof + the same review-tier pattern as US-013/014
(established, human-approved posture). No hard gates.

## Stop Conditions

- Golden drift beyond added cradle-cf-top anchors on demo4/demo5.
- Any pom6-limitations hard guard regression (the no-cradle and
  decorative-tick cases exist precisely to catch junction over-firing).
- Accuracy error vs GT above loose tolerance on either target.
