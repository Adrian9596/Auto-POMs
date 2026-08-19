# US-079 Preview & Export tab with multi-sheet tech-pack Excel

## Status

implemented

## Lane

normal

Reason: the change adds a new page plus a factory-facing export file (public
contract flag) over render paths that have no existing proof (weak-proof flag)
and adds one optional field to the project snapshot (soft data-model flag). No
auth, authorization, external system, or destructive migration hard gate
applies. The existing Board "Export Excel" path is untouched.

## Product Contract

A fifth tech-pack tab, "Preview & Export", shows the whole tech pack as A4
sheets stacked vertically in fixed order: MAIN PAGE (portrait), CONSTRUCTION
SOLID (landscape), CONSTRUCTION LACE (landscape), BOM-SOLID (portrait),
BOM-LACE (portrait), POM / How to Measure (landscape). Each sheet has an
include checkbox, persisted in the project file. One button exports the
included sheets as a single `.xlsx` workbook, one worksheet per sheet, in the
same order. MAIN PAGE, BOM-SOLID, BOM-LACE, and POM are real-cell worksheets;
CONSTRUCTION SOLID/LACE are embedded page images. The preview represents page
content on paper, not a pixel simulation of Excel.

## Relevant Product Docs

- [`docs/decisions/0046-preview-export-tab-multisheet-workbook.md`](../../../../decisions/0046-preview-export-tab-multisheet-workbook.md)
- [`docs/decisions/0045-construction-sheets-own-working-views-and-rows.md`](../../../../decisions/0045-construction-sheets-own-working-views-and-rows.md)
- [`docs/decisions/0044-bom-row-owns-one-callout-per-variant.md`](../../../../decisions/0044-bom-row-owns-one-callout-per-variant.md)

## Acceptance Criteria

- A "Preview & Export" tab registers in `TECH_PACK_PAGES` after BOM; switching
  tabs shows the preview and hides the other pages, same `.page-hidden`
  mechanics as existing tabs.
- The preview renders six A4 sheets top-to-bottom in the contract order with
  per-page orientation (portrait: MAIN PAGE, BOM-SOLID, BOM-LACE; landscape:
  CONSTRUCTION SOLID, CONSTRUCTION LACE, POM/Board).
- MAIN PAGE, BOM-SOLID, BOM-LACE, and POM sheets render as paper-styled DOM
  from live state; BOM sheets filter rows by scope with BOTH rows appearing on
  both sheets; the POM sheet shows the measurement board and spec content.
- CONSTRUCTION SOLID and CONSTRUCTION LACE sheets render that variant's
  working views (images plus callout leader lines) to canvas; the exported
  image is produced by the same render function the preview shows.
- Each sheet has an include checkbox; `state.preview.enabledPages` round-trips
  through save/open and autosave; a legacy project without the field loads
  with all pages enabled.
- "Export Tech Pack (.xlsx)" downloads one STORE-zip workbook containing only
  the enabled sheets, ordered as previewed: MAIN PAGE / BOM-SOLID / BOM-LACE
  as real cells, CONSTRUCTION sheets as embedded PNGs, POM built by the same
  builder the Board "Export Excel" button uses (formulas, numFmt 164, board
  image intact).
- The Board "Export Excel" button and its single-sheet file are byte-for-byte
  unaffected.
- Detection, anchors, drafts, golden output, and the other four pages'
  behavior are unchanged.

## Design Notes

- Commands: none.
- Queries: none.
- API: none; runtime remains fully offline (no new vendored libs — extend the
  hand-built xlsx ZIP writer).
- Tables: BOM sheets reuse the BOM table model filtered by scope; MAIN PAGE
  sheet reuses `state.mainPage`; POM sheet reuses the existing spec builder.
- Domain rules: ADR 0046 (sheet order, hybrid cell/image formats, BOTH-scope
  duplication, preview fidelity, parallel export paths with one POM builder).
- UI surfaces: new `#previewPage` container, `src/ui/preview-page.js`,
  `src/ui/page-nav.js`, `src/render/export-xlsx.js` (multi-sheet extension),
  `src/project/project-io.js` (snapshot field), `scripts/source-parts.mjs`.

## Validation

`scripts/bin/harness-cli story update --id US-079-preview-export-tab --unit 1 --integration 1 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | Scope filtering, sheet ordering, enabledPages defaults in `preview-check` |
| Integration | `npm run build`, `npm run check`, save/open round-trip of `state.preview` |
| E2E | New `npm run preview-check`: tab switch, six sheets, checkboxes, export produces a valid workbook (`unzip -t` + openpyxl per-sheet reads) |
| Platform | In-app browser QA: screenshot every preview sheet; open exported workbook |
| Release | `npm run golden`, `export-xlsx`, `export-hidden`, `autosave-check`, `bom-check`, `construction-check`, `mainpage-check` |

## Harness Delta

- New focused suite `preview-check` registered in package.json and TESTING.md.
- ADR 0046 added.

## Evidence

- 2026-08-17: `npm run preview-check` PASS 48/48 — tab shape, six-sheet order
  + orientation, live content per sheet, checkbox toggle + undo, workbook
  determinism, sheet-name order, POM worksheet byte-identical to the Board
  Export Excel sheet, subset export, BOM scope filtering, embedded PNGs,
  `unzip -t` + openpyxl reads, project round-trip incl. legacy default.
- 2026-08-17: regression set green after the change: `npm run build`,
  `npm run check`, `export-xlsx`, `export-hidden`, `autosave-check`,
  `mainpage-check` 31/31, `construction-check` 55/55, `bom-check` 100/100,
  `golden` PASS, `smoke` PASS.
- 2026-08-17 (FD feedback): the exported BOM sheets placed the Material Key
  BELOW the table; the page and preview put it above. Fixed — MATERIAL KEY
  band + image now sit above the table with reserved blank rows, and
  `preview-check` (49/49) asserts the order. Verified in a real export via
  openpyxl (band row 3, image anchor row 4, table from row 28).
- 2026-08-17: headless-Chrome screenshot review of all six preview sheets
  with a demo1.jpg full auto run applied. Caught and fixed two visual
  defects the assertions missed (US-068 lesson): the Export button rendered
  white-on-white under `.cc-toolbar button`, and an empty Material Key
  placeholder consumed half the BOM sheet.
