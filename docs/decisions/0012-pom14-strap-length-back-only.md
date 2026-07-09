# 0012 POM 14 (shoulder-strap length) is measured back-only

Date: 2026-07-09

## Status

Superseded by [0013 POM 14 is the curved front-to-back shoulder strap length](0013-pom14-front-to-back-strap-length.md).

## Context

`DETECTION_AND_MEASUREMENT_CONTRACT.md` (2026-07-09) flagged POM 14's `strap-top`
as the wrong landmark: it was seeded at the shoulder **mid-fold** (front), but POM
14 is the strap **length**, so its ends must be real attachment points. The
shoulder is a fold, not an attachment, and does not bound the length.

The full strap physically spans front → shoulder → back, which collides with the
"every POM lives on exactly one view" invariant (`POMS_CONTRACT.md`), and a
straight pixel line between a front point and a back point is not a real length.
The contract left the measurement model as an open question with options
(a) back-only, (b) two-segment sum, (c) front-only-redefine.

Note: POM 14's exported Size-L value is a fixed library median held flat across
sizes (`hold: true`), so this decision governs where the **review line** is drawn
for the TD, not any computed number.

## Decision

**Model (a), back-only** (TD-selected). POM 14 is measured entirely on the **back**
view, so it respects the one-POM-one-view invariant:

- `strap-top` (start) = **top of the back strap** (crossover end) —
  `detection.backStrapTop` (`findBackStrapTopFromInk`), source `backStrapInk`.
- `strap-bottom` (end) = **strap↔back-panel join** (lower attachment) —
  `detection.backPanelHeight.top` (`findBackPanelHeight`; the strap-join x at the
  back chest row), source `backPanelJoin`.
- Both anchors seed **only** inside the back-view branch of `seedAnchorsFromDetection`,
  carry `viewRole: 'back'`, and are floored to `low` confidence + `reviewRequired`
  (POM 14 is the only contractually always-verify POM). `strap-top` sits above
  `strap-bottom` by construction.
- POM 14 template `view` changed `front_outer → back`; the two strap anchor hints
  were reworded to the back-view definitions. Anchor **kinds** are unchanged.
- **Front-only sketch (no back view): POM 14 refuses to guess** — neither strap
  anchor seeds, so the requiredAnchors guard demotes the row to REVIEW_ONLY.

## Alternatives Considered

1. **(b) Two-segment sum** (front cup→shoulder + shoulder→back-panel). Rejected:
   requires a new two-segment line/measurement concept the board cannot express
   today; largest, highest-risk change.
2. **(c) Front-only, redefine `strap-top` as the front strap top.** Rejected: keeps
   the strap on the front but still isn't a real attachment point — the contract
   says this is not the fix.

## Consequences

Positive:

- POM 14's two ends land on real seams on a single view; the review line reflects
  the back strap the TD actually verifies.
- New semantic `contract` group **C14** (anchors-on-back, top-above-bottom,
  source-back-strap, never-high, review-when-front-only) guards the behaviour, and
  `pom14-limitations` was rewritten to the model-(a) contract (front+back drawable;
  front-only ⇒ REVIEW_ONLY). Both pass.

Tradeoffs:

- POM 14 anchor **positions move** (front → back), so all 13 `golden` baselines
  were re-baselined. The move is confined to `strap-bottom` on 2-view demos and to
  POM 14 removal on the two front-only demos — no other anchor drifts (verified via
  the golden diff). Justified because the `accuracy` corpus is empty (no numeric
  oracle), so the new C14 checks + `invariants` are the correctness proof and
  golden is re-seeded only after they pass.
- Two front-only demos lose their POM 14 line (→ REVIEW_ONLY) — the intended
  "refuse to guess".
- `template_version`/`anchor_version` bumps reset the opt-in learning buckets;
  the old strap residuals (recorded against the front landmark) are stale and
  discarded — acceptable (learning is opt-in and resettable).

## Follow-Up

- Cosmetic: the POM 14 label offset (`render-auto-overlay.js`) and bezier bow
  (`generate-pom-fixture.js`) were tuned for a front strap; a back-strap-aware
  tweak is a low-priority visual follow-up.
- `harness-cli decision add` was skipped — the CLI binary is absent in this
  checkout (`scripts/bin/` empty); register the durable row when it returns.
