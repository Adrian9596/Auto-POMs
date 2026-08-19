# Exec Plan

## Goal

`Export Tech Pack (.xlsx)` produces a workbook a factory cannot tell apart from
the packs it already receives: five sheets on the factory grid — MAIN PAGE,
CONSTRUCTION DETAIL, ` BOM-LACE`, BOM-SOLID, PROTO Direction — styled, merged,
framed and page-set-up like the reference release
`3916.KiraForm vA 1.0 17.05.2025.xlsx`.

## Scope

In scope:

- Grow `src/render/export-xlsx.js` from a fixed 18-style table into a styling
  engine: interned fonts / fills / borders / numFmts / xfs, merges, per-side
  borders, row heights, page setup + margins + print centering + tab colour +
  gridline suppression, sub-cell picture offsets, ISO→serial dates.
- Rebuild MAIN PAGE on the factory cover grid (brand banner, credit grid,
  even-row field ladder, breakdown sub-grid, two version panels with framed
  flat wells and Col 1..Col 6 colorway tables).
- Replace the two Construction worksheets with one `CONSTRUCTION DETAIL` sheet,
  LACE rows 1–23 and SOLID rows 24–46, three framed boards per block.
- Reformat both BOM sheets to the seven-column English grid with the merged
  MATERIAL IMAGES band and the two annotated flat half-panels.
- Add the PROTO Direction sheet, including the two new header fields and the
  sample-size measurement block, and retire the standalone `Measurement Spec`
  worksheet from the pack.
- Colorway code/name split; `Supplier / Vendors` and `Development Round` state.
- Preview & Export papers mirror the new five-sheet set and order.
- Proof: reworked `preview-check` plus a new suite that diffs our export
  against the reference workbook structurally.

Out of scope:

- The Board's `Export Excel` button and its single-sheet file — byte-identical,
  untouched, still asserted by `export-xlsx`.
- `sharedStrings`, deflate, `dataValidations`, `conditionalFormatting`,
  `theme1.xml`, `xdr:sp` text-box shapes.
- Bilingual Chinese callout content on the flats (ADR 0041 stands).
- The reference's third-board inspirational artwork where the tool has no
  source; the board is framed and captioned, filled by what state has.
- Detection, anchors, drafts, POM contract, grading rules.

## Risk Classification

Risk flags:

- Public contracts — the exported workbook is the factory-facing deliverable.
- Existing behavior — every tech-pack sheet changes shape; one worksheet is
  removed from the pack.
- Data model — colorway entries gain parts; two new fields enter state and the
  project file.
- Weak proof — no suite pins the workbook's *appearance*, only its cells.
- Multi-domain — MAIN PAGE, Construction, BOM, POM and Preview all move.

Hard gates:

- Removing or weakening a validation requirement: the tech-pack POM sheet's
  byte-identity assertion (`preview-check`) is retired by ADR 0048 decision 4.
  It is replaced, not dropped — the proto measurement block must still come
  from `buildSpecSheetRows`, and the Board export keeps its own byte assertion.

## Work Phases

1. Discovery — reverse-engineer the reference workbook, sheet by sheet, and
   diff it against the current exporter. **Done**; findings in ADR 0048.
2. Design — per-sheet cell maps plus the style-engine API, under `design/`.
3. Validation planning — see `validation.md`.
4. Implementation — one sheet at a time, in this order: style engine → MAIN
   PAGE → CONSTRUCTION DETAIL → BOM ×2 → PROTO Direction → preview parity.
   Each lands with its suite green before the next starts.
5. Verification — structural diff against the reference, `unzip -t`, openpyxl
   read, LibreOffice render if available, and screenshot review of every
   preview paper (the US-068 lesson: assertions pass while pages look broken).
6. Harness update — new suite registered in `package.json` and `TESTING.md`.

## Stop Conditions

Pause for human confirmation if:

- A sheet needs data the tool has no source for and no reasonable default
  (the third construction board's inspirational artwork is the known case).
- Matching the reference would require reproducing something that reads as an
  error in the source file.
- The Board export cannot stay byte-identical.
- Row geometry cannot frame an image without clipping it at A4.
