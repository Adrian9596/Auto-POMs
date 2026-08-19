# 0023 cradle-cf-top junction + crest recovery tiers

Date: 2026-07-11

## Status

Accepted

## Context

After ADR 0021/0022 recovered POM 7, the last MISSING anchors in the
2026-07-11 accuracy corpus were `cradle-cf-top` (POM 6 start / POM 8 end) on
demo4 and demo5. Both misses are structural, not tuning: on front-closure
styles the seam is interrupted AT the axis by the placket (and the cradle-row
prior locks onto the neckline); on plunge gores the axis is blank at the
cradle row because the true cup↔cradle boundary is the gore-top crest. The
direct detector demands ink at/near the axis on the winning cradle row, so
neither can ever pass it. The gated `cradleCfFromCupSeam` projection was
correctly NOT firing (projecting a wire-bottom y onto the CF is wrong there).

## Decision

Two review-grade recovery tiers, considered only when the direct detector
missed, both `confidence: low` + `reviewRequired` (same posture as
ADR 0021/0022; `C6.seam-source` accepts them only when review-flagged):

1. **`seamJunction`** (pixel-level, row-agnostic): a row below cf-top where a
   long horizontal seam run approaches the axis from BOTH sides, the CF gap
   is EMPTY (no ink at the axis cell ±1 — the placket interior), the gap is
   narrow and centered on the axis, and BOTH gap edges carry vertical
   closure-edge ink. Topmost qualifying row wins (the seam's upper stitch
   line, per the amorafit TD correction). The empty-gap requirement is the
   load-bearing guard: band interiors, drawn CF lines, and gore ink all have
   ink at the axis and can never qualify.
2. **`seamCrest`** (contour-level, in the seed layer where contours exist):
   the US-012 crest finder now also returns the topmost symmetric crest
   BELOW the cf-top floor (`crestBelowCfY`). The floor must be applied
   during selection — on a plunge gore the same contour carries neckline
   samples just above cf-top and gore-top samples just below it, so a
   post-hoc filter selects nothing. The landmark-QA build moved AFTER the
   crest decision (stashed as `detection.cradleCfCrestSeedY`) so QA
   classifies exactly what the seeding pass applied.

## Alternatives Considered

1. Re-tune the cradle-row prior so demo4's row lands on the band seam —
   rejected: the row prior is shared by POM 7 and inner-cup seeding; moving
   it is a cross-POM geometry change (the exact blast radius ADR 0021 exists
   to avoid).
2. Un-gate the `cradleCfFromCupSeam` projection for arc-tier seams —
   rejected: seeds a confidently-wrong boundary on plunge gores (err ≈ 0.21).

## Consequences

Positive:

- cradle-cf-top err 0.0035 on both targets; zero MISSING anchors remain in
  the labeled corpus; POM 6/8 now draft (review-flagged) on both styles.
- Golden drift was strictly `anchors added: cradle-cf-top` on demo4/demo5.

Tradeoffs:

- POM 8 on plunge gores is a near-zero span (true geometry, but a TD seeing
  a tiny POM 8 line should expect it).
- The junction tier is placket-specific by design; other interrupted-seam
  styles (e.g. zip closures) will need their own review before trusting it.
