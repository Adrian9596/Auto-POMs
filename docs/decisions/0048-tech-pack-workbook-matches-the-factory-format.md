# 0048 The tech-pack workbook matches the factory format, five sheets

Date: 2026-08-17

## Status

Accepted

## Context

US-079 shipped a tech-pack workbook whose shape we invented: six worksheets
(MAIN PAGE, CONSTRUCTION-SOLID, CONSTRUCTION-LACE, BOM-SOLID, BOM-LACE,
Measurement Spec), a two-column field ladder, one flattened board image per
Construction sheet, and the POM sheet reused verbatim from the Board's Export
Excel builder.

FD then supplied the real deliverable: `3916.KiraForm vA 1.0 17.05.2025.xlsx`,
a released factory pack. A full reverse-engineering pass (five sheets, every
cell, every merge, styles.xml, drawing anchors) against our exporter found the
split is not where we assumed:

- **Content is close.** Our state already holds nearly every string the pack
  prints — the 14-field MAIN PAGE ladder including Block Reference, the shared
  colorway list, the BOM section bands verbatim, six of seven BOM columns,
  size-split row numbering, POM EN/ZH/TOL, and real annotated per-variant
  images with numbered leader callouts.
- **Format is far.** The reference is a hand-styled document: 30/20/8/9 merges
  per sheet, medium-versus-thin per-side borders that draw every panel, Arial
  charset-134 fonts at 10–18pt, a purpose-specific fill palette, rows up to
  408pt that frame their pictures, sub-cell picture offsets, and A4 page setup
  with orientation and centering. Our writer can emit one thin border, three
  Calibri fonts, twelve POM-palette fills, two hard-coded merges on one sheet,
  and no page setup at all — so every sheet reads as a spreadsheet dump.
- **The sheet set itself differs.** The factory pack has five sheets, one
  combined `CONSTRUCTION DETAIL`, and **no standalone measurement sheet** — the
  measurement table is a block inside `PROTO Direction`.

## Decision

The tech-pack export targets the factory format. FD confirmed each of these.

1. **Parity is readable/printable equivalence, not byte fidelity.** Same
   layout, fills, borders, merges, row geometry and page setup; a factory
   reader should not be able to tell ours from theirs. File-specific residue is
   deliberately dropped: the stray tick in `A3`, the lone backtick in the BOM
   image column, the single space in `H4`, trailing spaces, the 1000-row
   `customHeight` grids, styled-empty aprons, orphan ListObjects, stale picture
   names. Byte fidelity was rejected — it buys nothing a factory reader can
   see and would force us to reproduce typos.
2. **The customer footer is never emitted.** The reference footers carry
   another company's legal notice ("… property of B Pty Ltd …"). That is their
   branding, not a format requirement.
3. **Construction becomes one sheet, `CONSTRUCTION DETAIL`** — LACE block rows
   1–23, SOLID block rows 24–46, each a title bar plus a caption row plus three
   framed boards (Outer, Inner, Additional Information). Our two-worksheet
   split goes away.
4. **`PROTO Direction` is a real sheet and owns the measurement block.** The
   pack is five sheets with no standalone `Measurement Spec`. This retires the
   preview-check assertion that the tech-pack POM sheet is byte-identical to the
   Board sheet — the one-builder rule survives as *the proto measurement block
   is built from `buildSpecSheetRows`*, but the two files no longer share a
   worksheet byte-for-byte.
5. **The Board's "Export Excel" button and its single-sheet file do not
   change.** It stays byte-identical, and its suite still asserts that. A TD who
   wants the graded 15-size spec keeps using it; the pack carries the
   sample-size proto sheet the factory reads.
6. **BOM matches the factory grid** — seven printed columns, English-only
   single-line headers, merged double-width MATERIAL IMAGES band. Our extra
   `TYPE / COMPOSITION` column is dropped from the export (it stays on the BOM
   page, where a TD finds it useful).
7. **Where the reference file is wrong, we are right.** Its TOL cells are date
   serials under an `m/d` format because someone typed `1/2` and Excel coerced
   it; we keep deliberate text. It numbers two different rows POM 7 and carries
   a `Side Zipper height` POM outside the 18-POM contract; we do not reproduce
   duplicate numbering, and an off-contract POM stays a custom POM.
8. **Two data-model additions**, both minimal: a colorway splits into code and
   name so BOM can print two lines and MAIN PAGE can print `CODE - Name`; and
   `Supplier / Vendors` plus `Development Round` gain state for the PROTO
   header.

Non-goals for this decision: `sharedStrings`, deflate compression,
`dataValidations`, `conditionalFormatting`, `theme1.xml`, `xdr:sp` text-box
shapes (captions the reference draws as shapes become merged cell captions),
bilingual Chinese callout content on the flats (ADR 0041 stands), and the
reference's third-board artwork that the tool has no source for.

## Alternatives Considered

1. **Keep our own format and hand the factory a converter.** Rejected: the
   pack is the deliverable, and a second tool is a second thing to maintain.
2. **Byte-for-byte reproduction.** Rejected by FD; see decision 1.
3. **Template-filling — ship the reference .xlsx as a template and write cells
   into it.** Tempting, and it would inherit every style for free. Rejected
   because the runtime is offline single-file with a hand-written writer: the
   template would have to be embedded as base64 in `app.js` (12.7MB before the
   pack's own images), the row geometry is style-specific per pack, and a
   template carries the customer's footer and residue we just decided to drop.
4. **Two Construction sheets, restyled.** Rejected by FD in favour of the
   factory's single stacked sheet.
