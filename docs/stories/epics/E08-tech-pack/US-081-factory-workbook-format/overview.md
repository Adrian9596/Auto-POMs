# Overview

## Current Behavior

`Export Tech Pack (.xlsx)` on the Preview & Export tab writes a six-worksheet
workbook whose shape the tool invented (US-079, ADR 0046): MAIN PAGE,
CONSTRUCTION-SOLID, CONSTRUCTION-LACE, BOM-SOLID, BOM-LACE, Measurement Spec.

Every sheet is cell-correct and style-poor. The writer has one border (thin
box), three Calibri fonts, twelve fills borrowed from the POM mock, no merges
on tech-pack sheets, no page setup, and it gives a picture room by reserving
blank rows rather than by setting a tall framed row. MAIN PAGE is a
two-column label/value ladder with our own title and band rows. Each
Construction sheet is one flattened PNG of the whole working board. BOM prints
eight columns with two-line bilingual headers. The measurement sheet is the
Board's Export Excel worksheet, byte for byte.

The result is readable, but it reads as a spreadsheet dump — not as a page from
a tech pack.

## Target Behavior

The pack is five worksheets on the factory grid, matching
`3916.KiraForm vA 1.0 17.05.2025.xlsx` closely enough that a factory reader
cannot tell them apart:

1. **MAIN PAGE** — A4 landscape at 93%. Blue merged brand banner, credit grid,
   the ten style fields on even rows inside a framed ladder with the
   three-cell `style prefix / category #: / range no:` sub-grid, and two version
   panels to the right, each a banner over a framed flat well over a
   `Col 1..Col 6` colorway table.
2. **CONSTRUCTION DETAIL** — A4 portrait, fit to page. LACE block rows 1–23 and
   SOLID block rows 24–46, each a full-width title bar, a caption row, and
   three framed boards: Outer, Inner, Additional Information.
3. **` BOM-LACE`** and 4. **BOM-SOLID** — A4 portrait, centered. Two annotated
   flat half-panels captioned OUTSIDE / INSIDE above a seven-column English
   table with section bands, size-split pairs, numeric item numbers, a merged
   double-width MATERIAL IMAGES band, and two-line colorway values.
5. **PROTO Direction** — the style header, three bilingual instruction blocks,
   the sample-size measurement table, and the numbered how-to-measure sketch in
   a framed tall row.

The Preview & Export tab previews these five papers, in this order, with the
same content the workbook writes.

## Affected Users

- Technical designer — exports the pack a factory reads; gains two header
  fields and a colorway code/name split; loses the `TYPE / COMPOSITION` column
  from the exported BOM (it stays on the page) and the standalone measurement
  worksheet from the pack (the Board button still produces it).
- Factory / vendor — receives a pack in the format it already reads.

## Affected Product Docs

- [`docs/decisions/0048-tech-pack-workbook-matches-the-factory-format.md`](../../../../decisions/0048-tech-pack-workbook-matches-the-factory-format.md)
- [`docs/decisions/0046-preview-export-tab-multisheet-workbook.md`](../../../../decisions/0046-preview-export-tab-multisheet-workbook.md) — superseded in part
- [`docs/decisions/0047-main-page-carries-version-sketches-and-style-breakdown.md`](../../../../decisions/0047-main-page-carries-version-sketches-and-style-breakdown.md)
- [`docs/decisions/0041-bom-page-forked-from-mod-bom.md`](../../../../decisions/0041-bom-page-forked-from-mod-bom.md) — its no-translation rule stands
- `design/style-engine.md`, `design/main-page.md`, `design/construction-detail.md`,
  `design/bom-lace.md`, `design/bom-solid.md`, `design/proto-direction.md`

## Non-Goals

- Byte-for-byte reproduction of the reference file, including its residue,
  typos and the customer's footer notice.
- The Board `Export Excel` file changing in any way.
- Chinese translations of callout and construction-row content.
- Inventing content for the third construction board beyond what state holds.
- `sharedStrings`, deflate, data validation, conditional formatting, theme
  parts, or shape XML.
