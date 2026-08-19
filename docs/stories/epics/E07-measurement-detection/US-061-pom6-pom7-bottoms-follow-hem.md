# US-061 POM 6 and POM 7 bottom anchors follow the drawn hem

## Status

implemented

## Lane

normal

Intake #19 — input type: **change request**. Risk flags: **existing behavior**
(POM 5/6/7 geometry is golden-covered), **public contracts** (measured lengths
change), **weak proof** (ground truth encodes the previous flat-band
convention). 3 flags, no hard gate. Lane: **normal with stronger validation**.

## Product Contract

`cf-bottom` (POM 6's bottom) and `cradle-cup-bottom` (POM 7's bottom) sit on the
garment's **drawn bottom edge at their own column**, not on the single flat
`bandY` row. On a straight hem the two are the same row and behaviour is
unchanged; on a scalloped or arched hem the anchors track the edge.

**Explicitly out of scope** (TD decision, 2026-07-27): `band-left` and
`band-right` keep the flat row, so POM 1 remains a level horizontal span. The
general curved-band model rewrite is not attempted here.

## Relevant Product Docs

- `POMS_CONTRACT.md` — POM 5 / 6 / 7
- `auto_mode_rules/anchor-schema.json` — `cf-bottom`, `cradle-cup-bottom`
- `docs/stories/epics/E07-measurement-detection/US-060-pom7-bottom-on-band-edge.md`

## Acceptance Criteria

- `cf-bottom` and `cradle-cup-bottom` land on the lowest inked row in their own
  column, within the band search window.
- `band-left` / `band-right` are unchanged; POM 1 still measures level.
- A sketch whose hem is straight produces byte-identical output (the helper
  returns `null` and the caller keeps `bandY`).
- Saved detections without `cfBottomHemY` fall back to the flat row.

## Design Notes

- **Why.** `bandY` is one horizontal row. Measured on
  `demo/2 photo case/Evelyn vA 3.0 1st photo.jpg` (1830×711), the scalloped
  picot hem **arches 30px** toward centre front — 662px at the sides, 632px at
  the CF axis — while `bandY` is a flat 659px. That left `cf-bottom` **27px
  below the drawn garment**, floating in white space, and `cradle-cup-bottom`
  off by 1–14px depending on which column it occupied.
- **How.** New `hemRowAtColumn(dark, w, h, colPx, bandRowPx, bboxH)` scans UP
  from `bandRow + 6% bboxH` to `bandRow − 12% bboxH` in a thin column band
  (`±0.6% bboxH`) via the existing `findVerticalInkBound`, returning the first
  inked row or `null`. `detectLandmarks` wraps it as `hemNormAtColumn(colPx,
  flatY)`, which falls back to the flat row — so straight hems and empty
  columns are untouched.
- Consumers: both `cradleCupBottom` commit sites (seam/strong and arc), and the
  new `detection.cfBottomHemY` (hem at `axisPx`) read by both `cf-bottom`
  seeding sites in `seed-anchors.js`.
- **POM 5 coupling, accepted.** `cf-bottom` is POM 5's bottom as well
  (`cf-top ↔ cf-bottom`), so POM 5's length moves with POM 6's. Separating them
  would require a new anchor kind — a contract change — and was rejected as out
  of scope. POM 5 following the hem is the more correct reading anyway.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` — passed; cache-buster `748085ccbb11`. |
| Integration | `npm run pom7-limitations` passed; `npm run invariants` **135/135**; `npm run contract` **757/758** (unchanged pre-existing `C7.start-off-cf`). |
| E2E | `npm run golden` — every image inside the 0.04 tolerance; only the two pre-existing unbaselined EvelynBliss images FAIL. |
| Platform | n/a. |
| Release | Ships in `app.js` via `npm run build`. |

## Evidence

**Anchor placement on the reported board** (`Evelyn vA 3.0 1st photo.jpg`,
flat `bandY` = 659px):

| Anchor | Before | After | Hem at that column |
| --- | --- | --- | --- |
| `cf-bottom` | 659px (27px below artwork) | **632px** | 632px — exact |
| `cradle-cup-bottom` | 659px | **661px** | 661px — exact |
| `band-left` | 659px | 659px (untouched) | 655px |
| `band-right` | 659px | 659px (untouched) | 652px |

**Accuracy vs TD ground truth** (`npm run accuracy`, n=6 labelled images):

- `cradle-cup-bottom` **0.0208 → 0.0188** — improved.
- `cf-bottom` **0.0002 → 0.0048** — *regressed against ground truth*, because
  the labelled files place it on the flat band row. Under the convention
  confirmed by the TD this is the ground truth being stale, not the detector
  being wrong; the value is still well inside the 0.02 tight tolerance. See
  Follow-up 1.
- `band-left` **0.0002 → 0.0002** — unchanged, confirming the scope held.

## Follow-ups (not in this story)

1. **Re-label `cf-bottom` on arched-hem ground-truth images.** The labelled
   files put it on the flat band row; the confirmed convention is the hem.
   Until they are re-labelled the accuracy gate scores POM 5/6's bottom against
   the superseded convention. Same class as US-060's `cradle-cup-bottom`
   follow-up on demo3 / demo5.
2. **`golden` and `accuracy` baselines want a reviewed re-seed.** Drift is
   accumulating across US-060 + US-061 — `demo2` 0.0337, `demo3` 0.0316,
   `1.jpg` 0.0287, `demo5` 0.0278 against a 0.04 tolerance. All still pass, but
   the headroom is thinning and the baseline no longer reflects intent.
3. **Anchor-schema hints are now imprecise.** `cf-bottom` reads *"on the
   underbust band"* and `cradle-cup-bottom` reads *"Band baseline directly
   below…"*; both now follow the hem. Editing `anchor-schema.json` changes its
   SHA-256, which cascades to `library/manifest.json`,
   `library/pom-definitions/contract-reference.json` and a
   `npm run measurement-prep-report` regeneration — deliberately not bundled
   into a geometry fix.
4. **`C7.start-off-cf`** remains open and unrelated (POM 7's *start* 0.0244 from
   the CF axis on `EvelynBliss vA 1.0`).
