# 0036 — POM 10 cup-width endpoints sit at their own heights

- **Status:** accepted
- **Date:** 2026-07-26
- **Supersedes (in part):** the "at mid-height / shared row" wording in
  `auto_mode_rules/anchor-schema.json` and `POMS_CONTRACT.md` POM 10.

## Context

POM 10 (cup width) was defined as a *horizontal* width "at mid-height": both
endpoints were constructed from one shared row (`centerY`) in `buildCupModel`, so
`inner-cup-left.y === inner-cup-right.y` by construction, and invariant **A3**
asserted exactly that (`|Δy| < 0.005`).

A TD review of the front-inner cup on `EvelynBliss vA 2.0.jpg` showed the
correct placement is **not** a shared row:

- `inner-cup-left` belongs on the **CF gore contact**, where the two cups meet;
- `inner-cup-right` belongs on the **wire / side-seam end** of the cup;
- the gore contact sits visibly **lower** than the side-seam end.

The TD demonstrated this by dragging both anchors into place. The shared-row
model cannot represent it at all — no amount of contour tuning reaches those two
points while both are pinned to one `y`.

Two earlier attempts to fix this as a placement bug were wrong and are recorded
here so they are not retried:

1. "The outer endpoint is ratcheted too far *out*" — wrong direction; measurement
   showed it was too far *in*.
2. "The width row is at 42% instead of 50%" — measured false; the row was already
   at mid-height (0.5106 vs mid 0.5015).

## Decision

POM 10 spans the cup's true horizontal extremes through its mid-section, with
**each endpoint at its own height**.

Rules that keep it one coherent measurement:

- Endpoints come from the **traced cup contour**, taking `x` **and** `y` from the
  same sampled point, so each lands on ink. (The historical A1 defect was pairing
  a bbox-extreme `x` with a forced `centerY`, planting the anchor at a height the
  cup never reaches.)
- Candidates are restricted to a **band around the width row**
  (`min(max(0.02, cupSpan·0.20), 0.07)`), so this is the widest chord through the
  cup's mid-section rather than a global extreme running down to the wire. The band
  was widened from `0.12 / 0.04` after TD review: a teardrop cup is widest **below**
  mid-height, so the tighter band missed the widest row and shortened **both** ends
  at once — and it also produced the **wrong slant direction** (gore end higher than
  the side-seam end, the reverse of the TD's placement). Widening fixed the slant and
  moved the gore end 0.461 → 0.474 (panel-relative).
- The **pair's mean height is anchored to the detected width row**, so the level
  the measurement represents is unchanged from the single-row era.
- Endpoints stay clear of the CF axis and the side seam (invariants **B3**/**B4**)
  and never leave their own view box.

Invariant changes:

- **A3** "POM 10 endpoints share row" → **"POM 10 endpoint slant bounded"**
  (`|Δy| < 0.09`). A shared row is no longer the contract; a bounded slant is.
- **A6** now measures the **mean** of the two endpoint heights against POM 9's
  mid-y, instead of `inner-cup-left.y` alone (which would judge the measurement by
  whichever end happens to sit lower).

## Consequences

- `anchor_version` bumped to `anchors-2026-07-26-cup-width-own-height`.
- Golden re-baselined for `3597.png`, `demo 8.png`, `demo3.jpg`, `demo5.jpg`,
  `demo7.png`. Drift was reviewed per anchor: **only** `inner-cup-left`,
  `inner-cup-right` and POM 10's own line points moved. POM 9, the cradle/POM 7
  chain, band, chest and strap anchors were untouched — the `cupModel` coupling did
  not ripple.
- `EvelynBliss vA 1.0/2.0` remain deliberately **unbaselined** for golden; the
  re-baseline was done per-demo to avoid seeding them.
- **POM 10's measured value changes** (a gore→side-seam chord is longer than a
  mid-height horizontal chord). Library values and grading for cup width refer to
  the new definition from this version on.
- **Anchor ground truth for `inner-cup-left` / `inner-cup-right` is now stale by
  definition** — the labels in `scripts/groundtruth/*.json` encode the superseded
  shared-row convention, so `npm run accuracy` reports those two kinds as
  regressed (0.0387 / 0.0268 vs a baseline of 0). This is expected. The accuracy
  baseline must **not** be re-seeded until a TD re-labels those two anchor kinds
  under this convention via the `?label=1` flow; re-seeding first would bless the
  new placement against labels describing the old rule.

## Rejected: using the garment silhouette for the outer endpoint

The cup-panel contours stop short of the cup's visual outer edge (panel-relative
0.075 where the TD marked 0.039), so the view-wide garment outline was tried as an
extra source for the **outer** endpoint only (barred from the inner endpoint, where
it would cross the gore into the other cup).

**Rejected.** On a front-inner cutaway it works, because no band is drawn there. On
a normal front-outer sketch the silhouette at cup height runs along the **side wing
/ band**, well outside the cup, so the endpoint landed on the wing — panel-relative
0.011 against a target of 0.039 — and POM 10 drifted up to 0.097 (demo7), 0.087
(demo5). On EvelynBliss it produced a span of 45% against a 45.5% target *only
because the outer overshoot cancelled an inner shortfall of the same size*: two
errors, not a correct measurement.

The cup's outer edge is already modelled band-aware by
`cupModel.outerEdgeNearArmhole` (`findCupOuterSilhouettePx` + the side-seam
ratchet). Any future attempt to close the remaining gap should go through that,
not the raw silhouette.

**Residual gap.** The span reaches **41.2%** of the view panel against the TD's
**~45.5%** mark (from 24.3% before this work). Each end is ~0.02 short:

- **Inner (0.474 vs 0.494):** mostly invariant **B3**, which requires 0.005
  (image-width) clearance from the CF axis while the TD marks the gore contact
  ~0.0015 from it. The TD reviewed this and chose to **keep B3**, accepting a few
  pixels of clearance.
- **Outer (0.063 vs 0.039):** the available signals are now exhausted. Ranked by how
  far out they reach: cup-panel contour extreme **0.075**, `outerEdgeNearArmhole`
  **0.063** (used — band-aware, applied only when it widens), TD mark **0.039**,
  garment silhouette **0.003** (overshoots onto the side wing, rejected above). The
  TD's mark lies *between* the model edge and the silhouette, so the true cup outer
  edge is a boundary **neither existing signal represents** — closing it needs
  segmentation of the cup fill region itself, i.e. new detection capability rather
  than tuning. Filed as harness backlog #7.

## Follow-up: the 2-image board (aux-view) path

The placement above was verified on a single 3-view photo and reported as done. On a
real TD board it changed **nothing**, because that board is **two images** — a primary
photo (front-outer + back) plus a **separate front-inner cutaway** — which takes the
aux-view path. Two independent faults, both silent:

1. **No contours on the aux photo.** `detection.contours` is attached by an async pass
   that runs for the SOURCE image only; `buildAuxViews` detected synchronously and
   seeded anchors immediately, so the cutaway never had contours. The cup-width
   extremes require them, declined, and fell back to the superseded shared-row snap
   with no signal. Fixed: `buildAuxViews` is now `async` and awaits
   `applyPotraceContoursToDetection(det)` before the mask is dropped and anchors seeded.
2. **The width row was ~0.16 too high.** `cupModel.topPoint` on a cutaway runs up into
   the **strap** (measured 0.1140) while the real cup top — already clamped for this
   view — is `detection.strapBottom` (0.3319). `buildCupModel` derives the width level
   as `apex + 0.42·(seam − apex)`, so the inflated span put the row at
   `0.1140 + 0.42·(0.8153 − 0.1140) = 0.4085`, **0.165 above** POM 9's mid-y 0.5736 —
   more than double the A6 limit — while anchors 171/181 sat at ~0.59 showing where the
   cup is actually widest. Fixed: under `singleView`, recompute the row from the same
   clamped top. Predicted 0.5349 / A6 delta 0.0387; measured **exactly** that.

Result on `demo/2 photo case/Evelyn vA 3.0`: row 0.4085 → **0.5349**, A6 delta 0.165 →
**0.0387**, span 0.2517 → **0.3877** (+54%, ≈90% of the gore→side-seam width), gore end
correctly lower than the side-seam end. Golden stays **13/13 at 0.0000** — the row fix
is gated on `singleView`, so single-image boards are untouched.

### Why no gate caught it

Every suite ran ONE image, so the aux-view path had zero coverage: this regression
survived `invariants` 135/135, `golden` 13/13, `contract`, `smoke` and
`pom7-limitations` all green. Harness additions:

- **`detection.cupWidthSource`** — records `contour-extremes` | `inner-seam-fallback` |
  `no-contours`, so the degraded path is assertable. It found fault (1) on the first run.
- **`console.warn` on fallback** — the silence is what made this look finished.
- **`runAutoOnDataUrl(url, { auxDataURLs })`** — lets a suite build the 2-image board at
  all. The assertion itself is backlog **#8**; enablers are in place.

## Verification at time of decision

- `npm run check` — pass
- `npm run invariants` — **135/135** (with A3/A6 redefined)
- `npm run contract` — 757/758; the single failure (`C7.start-off-cf`, POM 7 on
  `EvelynBliss vA 1.0`, `|x−axisX|=0.0244`) was proved **pre-existing** by
  reverting the change and observing an identical value
- `npm run golden` — every baselined demo passes after the surgical re-baseline
- `npm run pom7-limitations` — pass
- `npm run smoke` — `failures: []`
- `npm run accuracy` — regressed on the two redefined anchor kinds only, for the
  reason above; all other listed regressions were proved identical on baseline
  (they come from `EvelynBliss vA 2.0` being labeled but absent from the baseline)
