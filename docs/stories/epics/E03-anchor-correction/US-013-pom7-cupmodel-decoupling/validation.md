# Validation — US-013 POM 7 seam tier decouples the cupModel

## Proof Strategy

Two properties must hold, each with its own proof:

1. **Additivity** — every image that detects a POM 7 seam today is
   byte-identical (anchors, drafts, cupModel). Proof: `npm run golden` shows
   drift ONLY on images that today have NO seam, and only on
   cradle-cup-top/bottom anchors + POM 7 rows (+ the POM 6 rescue anchor
   where it newly fires). Anything else fails the story.
2. **Isolation** — a guide-tier seam cannot move POM 9/10. Proof:
   invariant B3 green across all demos; inner-cup-* golden values unchanged
   on every image including those where the guide tier fires.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit (synthetic) | `npm run pom7-limitations`: sparse-dashed (gap 8) flips to DRAWABLE; solid/moderate/decorative cases unchanged; `npm run detection-limitations` for POM 6/14/viewrole side effects |
| Integration | `npm run invariants` (B3 is the story gate); `npm run contract` (C7.seam-source extended for seamGuide+review; C7.start-off-cf/side-seam/vertical apply to guide seams too) |
| E2E | `npm run smoke`; `npm run golden` (inspect + deliberate re-baseline for newly-drafting images only); `npm run accuracy` (guide seams scored against the 2026-07-11 GT corpus where labeled) |
| Platform | `npm run build` + `npm run check` (build freshness + parse) |
| Performance | none (same single-pass column scan; guide tier adds no extra image pass) |
| Logs/Audit | debug payload carries `cradleCupTier`; QA note present on guide-seeded anchors |

## Fixtures

- Synthetic: `buildPom7Fixture(640, 480, { vertical: 'weak-dashed', dashGap: 8 })`
  (existing, in `scripts/lib/synthetic-detection.mjs` consumers).
- Real: `demo/*.jpg|png` via golden baselines; `scripts/groundtruth/*.json`
  (demo5/demo7 carry TD-draft cradle-cup GT to score any real-image firing).

## Results (2026-07-11)

- `npm run build` — 58 parts; `npm run check` — passed (fresh bundle).
- `npm run pom7-limitations` — sparse-dashed-present now DRAWABLE (hard
  guard); solid / moderate-dashed / decorative-short / absent / near-side
  unchanged.
- `npm run detection-limitations` — POM 6 / POM 14 / view-role guards all
  passed (view-role ambiguous-layout LIMITATION is pre-existing).
- `npm run invariants` — 209/209, 0 failed. **B3 green.**
- `npm run contract` — 1034/1034, 0 failed (C7.seam-source extended).
- `npm run golden` — **0.0000 drift on all 19 baselines** (additivity proof:
  the guide tier fired on no real demo — none carry drawn dashed guides).
  No re-baseline needed.
- `npm run accuracy` — unchanged vs 2026-07-11 baseline (112 anchors, 92%
  within tight): isolation holds, nothing moved.
- `npm run smoke` — 0 failures.
- Diagnostics spot-check: demo3 `bottomFromSeam:true` (strong seam still
  feeds the cupModel), demo4 `bottomFromSeam:false, visibility:direct`
  (ink-arc fallback untouched).

Status: implemented and verified. Real-demo POM 7 recovery (curved wire
seams on demo5/demo7; seamless demo4) is follow-up detector work that now
builds on this safety line and is scored by the accuracy corpus.
