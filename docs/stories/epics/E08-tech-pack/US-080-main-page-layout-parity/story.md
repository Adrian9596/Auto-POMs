# US-080 MAIN PAGE matches the factory layout: version sketches, split breakdown, Block Reference

## Status

implemented

## Lane

normal

Reason: changes existing MAIN PAGE behaviour that three surfaces read (page,
Preview sheet, workbook), adds fields to the project snapshot (soft data-model
flag), and touches the factory-facing workbook (public contract flag). No
auth, authorization, external system, or destructive migration applies.

## Product Contract

The MAIN PAGE sheet reproduces the factory layout FD supplied:

- The **Lace Version** and **Solid Version** panels each show two technical
  flats — FRONT and BACK — supplied by the TD via upload or paste, stored in
  the project, removable, and printed on the sheet.
- **Style No Breakdown - 风格号码分解** is three labelled sub-cells —
  `style prefix`, `category #`, `range no` — not one value. The suggestion
  picker offers range names on `style prefix`.
- **Block Reference - 原版品** is a field row on the sheet.
- The Preview & Export MAIN PAGE sheet and the MAIN PAGE worksheet in the
  tech-pack workbook show the same content.

## Relevant Product Docs

- [`docs/decisions/0047-main-page-carries-version-sketches-and-style-breakdown.md`](../../../../decisions/0047-main-page-carries-version-sketches-and-style-breakdown.md)
- [`docs/decisions/0037-main-page-sheet-ported-onto-tool-primitives.md`](../../../../decisions/0037-main-page-sheet-ported-onto-tool-primitives.md)
- [`docs/decisions/0046-preview-export-tab-multisheet-workbook.md`](../../../../decisions/0046-preview-export-tab-multisheet-workbook.md)

## Acceptance Criteria

- Each version panel shows a FRONT and a BACK sketch slot; an empty slot names
  itself and opens an Upload/Paste menu; a filled slot shows the flat and can
  be replaced or cleared.
- Sketch bytes round-trip through save/open and autosave; `state.mainPage`
  carries only `{ id, aspect }` per slot, so a history snapshot does not clone
  image bytes; undo after replacing a slot restores the previous image.
- The breakdown row renders three sub-cells under `style prefix` /
  `category #` / `range no` headers, each editable; `field.value` stays the
  ` · `-joined composite; the ▾ picker writes `style prefix`.
- A project saved before this change opens with a `Block Reference - 原版品`
  row and an empty breakdown split, losing no typed value (an old free-text
  breakdown value becomes `style prefix`).
- The Preview & Export MAIN PAGE sheet shows the sub-cells, the Block
  Reference row, and the four sketches.
- The MAIN PAGE worksheet in the exported workbook carries the sub-cells as
  their own rows, the Block Reference row, and the four sketches as embedded
  PNGs under LACE VERSION / SOLID VERSION bands with reserved rows.
- Detection, anchors, drafts, golden output, the Board export, and the other
  four pages are unchanged.

## Design Notes

- Commands: none. Queries: none. API: none — offline, no new libraries.
- UI surfaces: `src/ui/main-page.js`, `index.html` (`.mp-sketch*` markup and
  CSS), `src/ui/preview-page.js`, `src/render/export-xlsx.js`,
  `src/project/project-io.js`.
- Domain rules: ADR 0047.

## Validation

`scripts/bin/harness-cli story update --id US-080-main-page-layout-parity --unit 1 --integration 1 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | Breakdown composite sync, legacy migration, slot state shape in `mainpage-check` |
| Integration | `npm run build`, `npm run check`, project save/open round-trip of sketches |
| E2E | `mainpage-check` (slots, sub-cells, Block Reference, history), `preview-check` (preview sheet + workbook rows/images) |
| Platform | In-app browser QA: screenshot the sheet and the preview sheet with sketches pasted |
| Release | `golden`, `smoke`, `export-xlsx`, `export-hidden`, `autosave-check`, `bom-check`, `construction-check` |

## Harness Delta

- ADR 0047 added; no new suite (extends `mainpage-check` and `preview-check`).

## Evidence

- 2026-08-17: `npm run mainpage-check` PASS 50/50 — 14 field rows, the three
  breakdown sub-cells and their captions, the Block Reference row, 4 sketch
  slots in `lace:0,lace:1,solid:0,solid:1` order, sub-cells driving the
  composite (`LiftyBliss · 3`), the range-name picker writing `prefix` without
  clearing the other sub-cells, a sketch round-tripping through save/open with
  the measured aspect, no `data:image` in the history-cloned `state.mainPage`,
  clear + undo restoring the slot AND its bytes.
- 2026-08-17: `npm run preview-check` PASS 57/57 — the preview MAIN PAGE sheet
  shows the sub-cells and 4 slots, a slot set while the preview is in view
  repaints it, the worksheet carries the three sub-rows plus Block Reference,
  and with a sketch it gains `drawing1.xml`, a `LACE VERSION` band and a
  `FRONT` label while the sketch-free version prints no band.
- 2026-08-17: real export dumped with openpyxl — breakdown composite in `B8`
  with sub-rows 9–11, Block Reference row 19, COLORWAYS row 21, `LACE VERSION`
  row 25 with FRONT/BACK labels row 26 and images anchored at (col 0, row 26)
  and (col 3, row 26), `SOLID VERSION` row 35 clear of the block above it.
- 2026-08-17: regression set green — `build`, `check`, `export-xlsx`,
  `export-hidden`, `autosave-check`, `bom-check` 100/100,
  `construction-check` 55/55, `golden` PASS, `smoke` PASS.
- 2026-08-17: headless-Chrome screenshot review of the sheet and the preview
  sheet with four demo flats pasted (US-068 lesson). Caught the breakdown
  sub-cell dividers stopping short of the row border (fixed with a stretched
  grid track).
- 2026-08-17 (follow-up, FD asked): the narrow-window squeeze is fixed too.
  `table-layout:fixed` + shrinkable flex columns stop the field table
  overflowing its column at any width; `minmax(0,1fr)` sub-cell tracks wrap
  instead of pushing past the value cell; below 1024px the **editing page
  only** stacks the field column above the version panels (`@media screen`,
  scoped to `#mainPageOverlay`, so neither the Preview paper nor print
  reflows); the field column moved 30%→32% and its label cell 44%→40% so a
  prefix like `LiftyBliss` fits a sub-cell on one line. `mainpage-check` is
  now 54/54 — the four new assertions drive CDP device-metrics and
  `Emulation.setEmulatedMedia` to prove wide/narrow/print behaviour.
