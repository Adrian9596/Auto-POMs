# US-060 POM 7 bottom anchor lands on the band edge in every detector tier

## Status

implemented

## Lane

normal

Intake classification — input type: **change request** (fixes accepted detection
behaviour). Risk flags: **existing behavior** (POM 7 geometry is golden- and
contract-covered), **public contracts** (POM 7's measured length changes),
**weak proof** (two ground-truth files encode the opposite convention and must be
re-labelled). 3 flags, no hard gate — not auth/authorization, not a data
migration, not audit/security, not an external provider. Lane: **normal with
stronger validation**.

## Product Contract

`cradle-cup-bottom` — POM 7's bottom endpoint — must sit on the **band baseline**
(the garment's solid bottom edge), directly below `cradle-cup-top`, regardless of
which detector tier committed the anchor. It must land on the same horizontal
line as the other band anchors: `band-left`, `band-right`, `cf-bottom`.

TD decision, 2026-07-27: the bottom endpoint is the **band baseline**, not the
cradle/band seam. This confirms the wording already in
`auto_mode_rules/anchor-schema.json` — *"Band baseline directly below the
bottom-cup cradle point (POM 7 bottom)"* — and the reason string the generator
already emits, *"bottom on band baseline"*.

## Relevant Product Docs

- `POMS_CONTRACT.md` — POM 7 Cradle Height at Bottom Cup
- `auto_mode_rules/anchor-schema.json` — `cradle-cup-bottom` hint + derivation
- `docs/decisions/0021-pom7-seam-tier-decouples-cupmodel.md` (guide tier)
- `docs/decisions/0022-pom7-arc-tier-structure-draft.md` (arc tier)

## Acceptance Criteria

- `cradle-cup-bottom.y === bandY` for every image where the anchor is seeded,
  independent of tier (`strong`, `seam`, `guide`, `arc`).
- `cradle-cup-bottom.y === cf-bottom.y === band-left.y === band-right.y` on a
  level band.
- `cradle-cup-bottom.x === cradle-cup-top.x` (POM 7 stays strictly vertical —
  unchanged, already enforced by the generator and `validate-fixture`).
- No change on images that already satisfied this (all arc-tier images were
  already 0.0000).

## Design Notes

- Domain rules: `bandRow` and `bandY` are deliberately different rows.
  `bandRow` is the band **ZONE** — the peak-score row used to bound cup and
  cradle searches. `bandY` is `bandEdgeRow / h`, produced by
  `snapBandToSolidEdge`, which snaps down to the solid bottom edge and exists
  *"for the band ANCHORS only"* (`src/auto-detection.js:1229`).
- Root cause: the seam/strong commit path seeded the bottom from the **zone**
  (`y: bandRow / h`, `src/auto-detection.js:2369`) while the arc tier used the
  **edge** (`y: bandY`, `:2395`). Same anchor, two different rows, decided by
  which detector happened to win.
- Fix: seam/strong path now seeds `y: bandY`, matching the arc tier and every
  other band anchor. One line; no change to `bandRow`'s role as a search bound.
- Measured drift before the fix (normalized image units, `cradle-cup-bottom.y −
  bandY`): demo2 `-0.0337`, demo3 `-0.0316`, `1.jpg` `-0.0143`,
  `after TD correction.png` `-0.0024`. Every arc-tier image was already
  `0.0000`. `demo 8.png` is seam-tier but already `0.0000` — on that sketch
  `snapBandToSolidEdge` returns `bandRow` unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` — parse/wiring after the rebuild. |
| Integration | `npm run contract`, `npm run invariants`, `npm run pom7-limitations` — POM 7 tier assertions and the forced-vertical shape check hold. |
| E2E | `npm run golden` — re-baselined for the 4 seam/strong images; drift 0.0000 thereafter. |
| Platform | n/a — offline browser tool, no platform split. |
| Release | Ships in `app.js` via `npm run build`; cache-buster rotates. |

## Harness Delta

None. Existing suites cover this; no new gate was required.

## Evidence

A headless probe (accuracy-harness CDP plumbing + `runAutoOnDataUrl`, dumping
`det.bandY` / `det.cradleCupBottom` / the seeded anchors per image) established
the tier split before the change and confirmed convergence after.

**Before → after, `cradle-cup-bottom.y − bandY` across all 12 seeding images:**

| Image | Tier | Before | After |
| --- | --- | --- | --- |
| demo2.jpg | seam | `-0.0337` | `0.0000` |
| demo3.jpg | seam | `-0.0316` | `0.0000` |
| 1.jpg | strong | `-0.0143` | `0.0000` |
| after TD correction.png | strong | `-0.0024` | `0.0000` |
| demo 8.png | seam | `0.0000` | `0.0000` |
| 3597 · EvelynBliss vA 1.0 · amorafit · demo1 · demo4 · demo5 · demo7 | arc | `0.0000` | `0.0000` |

`EvelynBliss vA 2.0` seeds no `cradle-cup-*` at all (`tier=null`) and is
unaffected.

**Suites (2026-07-27, after the change):**

- `npm run check` — passed; bundle rebuilt, cache-buster `70bc9d71a2d8`.
- `npm run pom7-limitations` — *"Hard POM 7 diagnostic guards passed."*
- `npm run invariants` — **135/135**, 0 failed (unchanged).
- `npm run contract` — **757/758**, 1 failed: the pre-existing, unrelated
  `C7.start-off-cf` on `EvelynBliss vA 1.0` (see Follow-up 3). Identical to the
  pre-change baseline.
- `npm run golden` — per-image `maxDrift` equals the predicted delta **exactly**
  (demo2 `0.0337`, demo3 `0.0316`, 1.jpg `0.0143`, after-TD `0.0024`) and every
  other image is `0.0000`. All four are inside the `0.04` tolerance, so they
  still PASS — **no golden re-baseline was required**. The suite's only FAILs
  remain the two unbaselined EvelynBliss images (`maxDrift 0.0000`, missing
  baseline), which predate this story.

The exact match between predicted and observed drift, with zero movement on the
eight unaffected images, is the proof that the change is surgical: it moved only
the anchor it was meant to move, only on the tiers that were wrong.

## Follow-ups (not in this story)

1. **Ground truth contradicts the confirmed convention on two images.**
   `scripts/groundtruth/demo3.jpg.json` places `cradle-cup-bottom` `0.0316`
   above the band line and `demo5.jpg.json` places it `0.0132` above;
   `demo7.png.json` has it exactly on the line. Under the TD decision above,
   demo3 and demo5 are mislabelled and need TD re-labelling before
   `npm run accuracy` can score POM 7's bottom honestly. Until then the
   accuracy delta on those two images is expected, not a regression.
2. **`golden` and `accuracy` baselines need a reviewed re-seed** covering both
   this change and the pre-existing unbaselined `EvelynBliss vA 1.0 / 2.0`
   images.
3. **`C7.start-off-cf` is unrelated and still open** — on
   `demo/EvelynBliss vA 1.0.jpg` POM 7's *start* sits `0.0244` from the CF axis
   (arc tier, `axisX 0.1689` vs `cradle-cup-top.x 0.1934`) when the bottom-cup
   zone requires more clearance. That is a start-anchor selection issue, not a
   bottom-endpoint issue.
