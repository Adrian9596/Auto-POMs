# US-051 POM 17 neckline curve follows the edge on deep/plunging necklines

## Status

implemented

## Lane

normal

## Product Contract

TD: line 17 "đường cong không bám mép ren cổ (cắt ngang/lõm sai chỗ)" — on a
front-outer view with a deep/scalloped V neckline, POM 17's curve cut straight
across the opening instead of hugging the neckline edge. It must **trace the
neckline edge** from 171 (center front) to 172 (strap).

## Root cause

POM 17 traces the detected neckline contour (`matchContourForCurve`) when the
fit is good, else falls back to a gentle 0.02 bow. On a deep V the contour trace
scored strongly (e.g. 1.135 on `1.jpg`) — it WAS the neckline edge — but the
`traceShapeOk` guard rejected it: the guard's tolerance was `max(0.015,
span*0.07)`, and a deep-V edge legitimately dips ~0.10 below the CF anchor (171
sits partway up the edge, not at the V-bottom). Rejected trace → flat 0.02 bow →
a chord that visibly cut across the neckline.

## Fix

`traceShapeOk(t, A, B, tolFloor, spanFactor)` now takes an optional generous
tolerance. POM 17 passes `(0.13, 0.6)` and also requires control sanity:
`score ≥ 0.55 && traceControlSane(c1) && traceControlSane(c2) &&
traceShapeOk(traced, 171, 172, 0.13, 0.6)`. This accepts the real edge-following
trace on deep necklines while a runaway/cup-latching fit (dip ≫ 0.13, or wild
controls) still falls back. POM 18 (armhole) keeps the default tolerance
(out of scope; not reported). `src/auto/drafts/generate-pom-fixture.js`.

## Acceptance Criteria

- Deep/plunging/scalloped neckline: POM 17 curve hugs the neckline edge (bows
  toward the opening), not a chord across it.
- Endpoints stay exactly on 171/172 (measurement points unchanged).
- Simple necklines and all non-neckline POMs unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | build + check pass |
| Integration | contract 704/705 (only pre-existing EvelynBliss), invariants 132/132, smoke clean |
| E2E | Browser overlay render: POM 17 follows the neckline edge on 1.jpg, demo1, demo3 |
| Golden | demo1/demo3 re-baselined (curve improved cut-across → edge-following, drift 0.44/0.40); all other demos 0.0000; EvelynBliss left unbaselined (pre-existing) |

## Evidence

- Diagnosis (clean single-image): `1.jpg` neckline trace score 1.135, belly dips
  0.095 below the lower endpoint, old `shapeOk=false` (tol 0.015) → rejected.
- Overlay renders confirm the traced curve hugs the scalloped edge on 1.jpg,
  demo1, demo3 after the fix. `demo5` already traced (dip 0.01) — unchanged.
- Golden re-baselined (`--update`) then EvelynBliss baseline removed to preserve
  its pre-existing TODO status. check / smoke / invariants(132) / contract green
  except EvelynBliss.

## Known follow-up

On very deep Vs, 171 can sit partway up the edge rather than at the CF V-bottom
(anchor placement); the curve still traces the edge, but the measurement START
could be lowered to the true CF. POM 18 armhole could get the same generous
tolerance if the same cut-across is reported there.
