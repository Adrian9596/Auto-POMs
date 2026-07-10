# US-010 Snap POM 6 start to the cradle-seam ↔ CF-placket junction

## Status

done (2026-07-10)

## Lane

normal — 2 risk flags (existing behavior, weak proof: only two TD-annotated
fixtures cover POM 6 placement).

## Product Contract

TD correction (2026-07-10, zip-front sketch = demo amorafit.png): POM 6
(CF height) must START where the cradle/cup-bottom seam MEETS the CF
placket, not at the flat global cradle row. On front-closure styles the
placket's own vertical ink satisfies the axis-window test at EVERY row, so
the detector was stamping (axis, cradleRow) — visibly below the junction
("POM 6 incorrect" vs "POM 6 correct" reference images).

## Relevant Product Docs

- `POMS_CONTRACT.md` (POM 6 / POM 8 shared cradle-cf-top)

## Acceptance Criteria

- demo amorafit (both backends): cradle-cf-top at the seam↔zipper junction
  y=0.733 (was 0.781, flat cradle row). ✓
- "need TD correction.png" (TD-annotated: arrows pin POM 6 start at the gore
  bottom): UNCHANGED at 0.6097. ✓ (thin CF seam line ≠ placket — width guard)
- Classic gore bras (demo2/3/7, correct output 1/2/3, 1.jpg, …): unchanged. ✓
- demo1 (hook-front): junction snap 0.786→0.720, visually at the seam↔placket
  junction. demo 8 (CF panel + lace tapes): 0.797→0.709, lands at the
  lace-tape↔panel junction; the underwire junction (~0.754) sits between old
  and new (≈ equidistant) — un-annotated fixture, anchor stays review-tagged.

## Design Notes

- Detection only (`src/auto-detection.js`, cradleCfTop direct-accept path):
  1. Detect a CF placket: near-continuous vertical ink columns (≥0.85 row
     fraction — a dotted mesh gore stays below this) bracketing the axis,
     with real WIDTH (≥1.5% w — a lone CF seam line under the gore must not
     qualify; that dragged POM 6 up the converging lace V on the annotated
     fixture).
  2. Scan UP from the cradle row for the FIRST row where seam ink adjoins
     BOTH placket edges (≥2 px within gap ≤0.4% w — image-width scaled, NOT
     bbox-scaled: two-view bboxes balloon a bbox-relative gap to ~10px and
     admit lace-texture dots; same class as the B4 seam-pad fix).
  3. Extend to the seam's TOP ink line (TD arrow tip): hop dash gaps ≤3% of
     bboxH, but each extension row needs a SOLID run (≥4 px) so sparse lace
     dots can't stepping-stone the junction up a decorative edge.
- Dip-projection path and all reject paths untouched. POM 8 shares the
  anchor; its C7 length relation (0 < len8 < len5) holds on all fixtures.

## Validation

harness-cli binary absent — durable row not recorded (known friction).

| Layer | Expected proof |
| --- | --- |
| Integration | golden 19/19 (amorafit/demo1/demo 8 deliberately re-baselined), invariants 209/209, contract 1032/1032, pipeline, junction, meaning, pom6-limitations, pom7-limitations all PASS |
| E2E | smoke PASS; browser preview (real CV) on amorafit: cradle-cf-top y=0.733 |

## Evidence

- ASCII ink maps confirmed the junction rows: amorafit seam adjoins the
  zipper tape at y=0.735 (upper line) / 0.754 (lower dashed); at the old
  cradleRow (0.781) only the placket's vertical ink is present.
- Real-CV + freeCv headless captures agree: y=0.733 both backends.
