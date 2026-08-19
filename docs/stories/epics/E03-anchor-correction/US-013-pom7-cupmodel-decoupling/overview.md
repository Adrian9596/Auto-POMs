# Overview — US-013 POM 7 seam tier decouples the cupModel

## Current Behavior

- POM 7 detection (`detectLandmarks`, `src/auto-detection.js`) accepts a
  bottom-cup seam via two paths: a strong vertical guide (colRatio ≥ 0.28 and
  ≥ 4/5 segments inked) or pattern-3 (strong cradle seam ink + horizontal
  run, no guide). Sparse dashed guides (gap ≥ ~8 px → colRatio below the
  strong floor) are rejected: POM 7 demotes to REVIEW_ONLY.
- Any committed seam feeds `buildCupModel` (`seamY`, `bottomFromSeam:true`)
  when its side matches the modeled cup, overriding the cupModel's own
  traced ink-arc bottom. This is why a relaxed acceptance tier was reverted
  on 2026-07-09: newly detected seams shifted `inner-cup-left/right` and
  broke invariant B3 (POM 10 endpoint within 0.005 of the CF axis).
- Real demos demo4/demo5/demo7 never reach the coupling: no seam candidate
  at all (`cradleCupTopPresent:false`), and their cupModel is already
  `visibility:direct` via the ink-arc fallback.

## Target Behavior

- Sparse dashed vertical guides are accepted as a `guide`-tier seam ONLY
  when today's acceptance finds nothing. POM 7 then drafts (DRAWABLE) with
  low-confidence, review-flagged anchors instead of a hard REVIEW_ONLY.
- `buildCupModel` ignores `guide`-tier seams entirely — POM 9/10 geometry is
  byte-identical to today on every image, whether or not the guide tier
  fires. Future POM 7 acceptance work inherits this safety line.
- Images that detect today (any tier) are byte-identical end to end.

## Affected Users

- TD reviewing Auto Mode drafts: gains a reviewable POM 7 starting line on
  sketches with sparse dashed guides; sees a QA note explaining the weaker
  provenance.

## Affected Product Docs

- `POMS_CONTRACT.md` POM 7 section (acceptance tiers).
- `docs/decisions/0021-pom7-seam-tier-decouples-cupmodel.md` (new).
- `scripts/pom7-limitations.mjs` sparse-dashed case (knownLimitation → expected).
