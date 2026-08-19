# 0021 POM 7 seam tier decouples the cupModel

Date: 2026-07-11

## Status

Accepted

## Context

POM 7 (cradle height at bottom cup) detection commits a bottom-cup seam
(`cradleCupTop/Bottom`) that ALSO relocates the shared `cupModel`'s cup
bottom (`bottomFromSeam`, `src/auto-detection.js` buildCupModel) whenever the
seam's side matches the modeled cup — overriding the cupModel's own traced
ink-arc bottom. Because of this coupling, a relaxed "dashed guide" acceptance
tier prototyped on 2026-07-09 (to rescue sparse dashed POM 7 guides,
`scripts/pom7-limitations.mjs` sparse-dashed case) shifted POM 10 inner-cup
endpoints on real demos and broke invariant B3, and was reverted. POM 7
improvements were blocked on decoupling (US-013).

## Decision

1. The committed seam carries a provenance tier — `strong` (vertical guide:
   colRatio ≥ 0.28, ≥ 4/5 segments), `seam` (pattern-3 seam + baseline), or
   `guide` (NEW: sparse dashed guide, ≥ 4/5 segments and colRatio ≥ 0.18,
   accepted only when both existing paths fail on BOTH sides).
2. `buildCupModel` consumes the seam only when the tier is not `guide`.
   Guide-tier seams can never move POM 9/10 geometry.
3. Guide-tier candidates score into their own pool and are considered only
   when today's acceptance finds nothing — images that detect today are
   byte-identical (verified: golden 0.0000 drift on all 19 baselines).
4. Guide-seeded anchors are `confidence: low`, `source: seamGuide`,
   `reviewRequired: true` (landmark-QA), with a QA note naming the weak
   provenance. Contract rule `C7.seam-source` accepts `seamGuide` only when
   review-flagged (mirrors `C6.seam-source`'s projected clause).

## Alternatives Considered

1. Score-mix guide candidates with existing candidates — rejected: can flip
   an existing winner on real demos (non-additive; the prototype's failure).
2. Guide seams feed cupModel only when no ink arc exists — rejected:
   conditional coupling; B3 exposure returns whenever tracing fails.
3. Remove seam input from cupModel entirely — rejected: the committed seam
   is the cupModel's best bottom evidence on strong images (demo3).

## Consequences

Positive:

- Sparse dashed POM 7 guides draw (review-flagged) instead of hard
  REVIEW_ONLY; `pom7-limitations` sparse-dashed flipped to expected-DRAWABLE.
- Future POM 7 acceptance work (e.g. curved-wire seams on demo5/demo7, no
  seam at all on demo4 — the real-demo REVIEW_ONLY cluster) inherits a
  structural safety line: new tiers default to NOT feeding the cupModel.
- The 2026-07-09 revert's blocker is closed without touching rule JSON.

Tradeoffs:

- Real demos gain nothing yet — none carry drawn dashed guides; their fix is
  future detector work, now measurable against `scripts/groundtruth/`.
- A guide-tier line can be a false positive (that is why it is always
  review-flagged); the TD must verify before trusting POM 7 on such sketches.
- The POM 6 `cradleCfFromCupSeam` rescue may now project from a guide-tier
  seam; it already seeds low + review, which remains the correct posture.
