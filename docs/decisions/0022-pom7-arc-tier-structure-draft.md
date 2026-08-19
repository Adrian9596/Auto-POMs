# 0022 POM 7 arc tier — draft from cup-bottom structure, review-flagged

Date: 2026-07-11

## Status

Accepted (product direction human-confirmed 2026-07-11)

## Context

After ADR 0021 decoupled POM 7's seam commit from the cupModel, the real-demo
REVIEW_ONLY cluster remained: demo1/demo4/demo5/demo7 (+3597, amorafit) have
no drawn POM 7 line and no flat cradle seam — curved underwires, ring straps,
or seamless bodies. The detector ALREADY traces their cup-bottom arc reliably
(`findCupBottomFromInk`; the cupModel trusts it for POM 9's bottom, and its y
matched the 2026-07-11 TD-draft ground truth within 0.002 on demo5/demo7).
The synthetic suite hard-guarded the opposite stance ("never draw POM 7
without drawn line ink"), so this was a product decision, not a tuning knob.

## Decision

1. New `arc` seam tier: when neither the trusted seam tiers nor the ADR 0021
   guide tier commit, POM 7 drafts on the traced cup-bottom arc — deepest
   column of the wire dip down to the band edge, right cup preferred,
   requiring a same-side validated apex and the cupModel's own arc-quality
   guards. Always `confidence: low`, `source: seamArc`, `reviewRequired`.
2. Trust allowlist: only `strong`/`seam` tiers feed the cupModel — both its
   cup-bottom AND its side picker. The POM 6 CF projection
   (`cradleCfFromCupSeam`) also fires only from trusted tiers (a curved
   wire's bottom y says nothing about the CF gore boundary).
3. The synthetic matrix asserts `<drawability>@<tier>` per case. The old
   "absent/decorative must stay REVIEW_ONLY" guards became `DRAWABLE@arc` —
   the anti-spoofing intent survives as "structure ink must never be
   accepted at a trusted tier".

## Alternatives Considered

1. Keep hard REVIEW_ONLY on structure-only sketches — offered to the user,
   declined (a review-flagged approximate line beats a blank row; consistent
   with the seamProjected/POM 6 precedent).
2. Reuse cupModel.bottomPoint for POM 7 — re-entangles what US-013 separated
   and inherits the cupModel's left-cup default (GT convention is right cup).

## Consequences

Positive:

- POM 7 drafts on 6 more real sketches; on the labeled demos it lands within
  tight tolerance of TD-draft GT (cradle-cup-top mean err 0.0078).
- accuracy MISSING: demo7 2→0, demo5 3→1 (the remaining 1 is the honestly
  gated cradle-cf-top — the next detector gap, with GT targets in place).
- POM 9/10 proven byte-identical (goldens drifted ONLY by anchor additions).

Tradeoffs:

- On styles with no real cradle (demo4), the arc line is an interpretation
  (lace-edge to band) — the review flag and QA note exist precisely for this.
- TDs see more review-flagged rows instead of hard demotions; the review
  queue grows where sketches are weakest.
