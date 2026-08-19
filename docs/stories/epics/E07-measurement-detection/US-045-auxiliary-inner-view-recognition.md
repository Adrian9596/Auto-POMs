# US-045 Recognize + label extra board photos as auxiliary views (e.g. front-inner)

## Status

done

## Lane

normal

## Product Contract

The Auto pipeline detects and measures exactly one source image. A TD may add
extra board photos — most commonly a **front-inner cutaway** — as their own
images. Those extra photos must be **recognized and labeled** as additional
views so the board shows "we saw your inner view", without changing where any
measurement is placed.

This is **recognition + labeling only**. No anchor or POM moves onto an
auxiliary view. Cup POMs (9/10) remain on the front-outer view per
[ADR 0011](../../../decisions/0011-cup-poms-measured-on-front-outer-view.md):
the inner cutaway is a bonus a sketch may include, never a measurement
precondition.

## Relevant Product Docs

- `docs/decisions/0011-cup-poms-measured-on-front-outer-view.md` (inner cutaway = bonus)
- `POMS_CONTRACT.md` (view roles: front_outer / front_inner / back)

## Acceptance Criteria

- After Detect, every board image that is **not** the detection source becomes
  one `detection.auxViews[]` entry: `{ sourceImageId, aux:true, viewRole, x, y,
  width, height }`, with the box normalized `[0,1]` to its own image.
- The first extra photo defaults to `front_inner` (the source image already
  carries front_outer + back); any further extras default to `unknown`.
- The aux box hugs the drawn sketch (union of the extra photo's detected view
  boxes; falls back to the ink bbox, then the whole photo).
- The overlay draws each aux view against **its own** image with the correct
  role color + label (`FRONT INNER` in green), so it follows pans/zooms/resizes.
- Aux views are **not** added to the view-roles confirm dialog and carry no
  anchors — the measurement detection (viewBoxes, anchors, POM drafts) on the
  single source image is byte-for-byte unchanged.
- Single-image runs (all demos) produce `auxViews: []` — no behavior change.

## Design Notes

- Commands: `buildAuxViews(sourceImage)` in `src/auto-detection.js`, called from
  `runOfflineDetection` right after `state.autoMode.detection = detection`.
- Queries: reuses `detectSketchFromImage(im)` per extra image (Detect is
  infrequent) to get robust normalized view boxes; unions them for the extent.
- UI surfaces: `src/render/render-auto-overlay.js` — extracted a `paintViewBox`
  helper shared by the source-image view boxes and the new `auxViews` loop.
- Domain rules: ADR 0011 preserved — no POM targets `front_inner`
  (pom-template views: 13 front_outer, 4 back, 1 front_to_back; none inner).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | build + check pass |
| Integration | golden 0.0000 drift, contract 657/657, invariants 121/121, smoke clean (all unaffected — aux path is new) |
| E2E | Browser: front+back image + separate photo → source splits front_outer+back, separate photo boxed + labeled FRONT INNER, no POM on it |
| Platform | n/a (browser-only tool) |
| Release | n/a |

## Harness Delta

None. Additive `detection.auxViews` field + one render loop; no contract,
schema, or version change.

## Evidence

- `npm run build` / `npm run check` — pass.
- `npm run golden` — PASS, maxDrift 0.0000.
- `npm run contract` — 657/657. `npm run invariants` — 121/121. `npm run smoke` — no failures.
- Browser (localhost:4173): with demo1 (front+back) as source and a separate
  photo, `detection.auxViews = [{ onImage, role:'front_inner', box hugging the
  drawing }]`; overlay shows a green `FRONT INNER` box on the separate photo,
  and that photo has no anchors/POMs.
