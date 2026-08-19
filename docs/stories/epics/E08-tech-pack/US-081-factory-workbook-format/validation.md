# Validation

## Proof Strategy

Three things must be true before the story is done, and the first is the one
this project keeps getting wrong: **a green assertion is not a correct page**
(US-068, US-079). So the proof is layered.

1. **Structural parity, asserted.** A new suite reads the reference workbook and
   our export side by side and asserts the things a factory reader notices:
   sheet names and order, column widths per role, the merge list per sheet, band
   fills, per-side border presence on every framed panel, row heights for the
   image bands, page setup (paper, orientation, scale, centering), and that
   every literal label the factory reads appears in the same cell. Content
   values come from the live project, so the suite compares *shape*, not the
   reference's own data.
2. **The file opens everywhere.** `unzip -t`, an openpyxl load, and — where
   available — a LibreOffice headless conversion, which is the cheapest way to
   catch a style index that Excel tolerates and other readers do not.
3. **Eyes on every page.** Headless-Chrome screenshots of all five preview
   papers, plus a rendered image of the exported workbook itself when
   LibreOffice is present. No sheet ships on assertions alone.

Two existing contracts must survive untouched and are re-run as regression, not
rewritten: the Board `Export Excel` file stays byte-identical (`export-xlsx`),
and identical inputs still produce a byte-identical archive (STORE zip, fixed
DOS timestamps).

One contract is deliberately retired, per ADR 0048 decision 4: `preview-check`'s
assertion that the tech-pack POM worksheet is byte-identical to the Board sheet.
Its replacement asserts that the PROTO measurement block is produced by
`buildSpecSheetRows` — the same builder — so the two can still never disagree
about what a POM row says.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Style interning is stable and order-independent for identical input; a merge's frame comes from continuation-cell borders; ISO→Excel serial conversion; colorway code/name split derives both renderings; field-label→factory-row mapping, including a TD-added field and the two fields that must NOT appear on MAIN PAGE |
| Integration | `npm run build`, `npm run check`; project round-trip of the colorway parts and the two new fields; autosave; every existing page suite still green (`mainpage-check`, `construction-check`, `bom-check`) |
| E2E | New `factory-format-check`: five sheets in order, per-sheet merges/fills/borders/heights/page setup, factory labels in their exact cells, MAIN PAGE flats composed into the two wells, BOM seven-column header with no TYPE/COMPOSITION, BOM section bands and size-split numbering, CONSTRUCTION DETAIL two stacked blocks with three boards each, PROTO header + instruction blocks + sample-size-only measurement block + sketch. Reworked `preview-check`: five papers, order, orientation, live content, checkbox persistence, subset export |
| Platform | Screenshot every preview paper; open the exported workbook in openpyxl and (if present) LibreOffice; confirm A4 page setup by rendering to PDF and checking the page count and orientation |
| Performance | The pack embeds full-resolution flats and per-board renders; assert the produced file stays under a sane ceiling (the reference is 12.7MB with deflate; we are STORE-only, so measure and record rather than guess) |
| Logs/Audit | None — offline tool, no telemetry. The export must make no network call. |

## Fixtures

- `3916.KiraForm vA 1.0 17.05.2025(1).xlsx` — the reference release, read-only,
  Drive-local. Never published (it is customer data).
- `demo/demo1.jpg`, `demo/demo4.jpg` — flats for the MAIN PAGE wells and the
  construction boards.
- The 12-row seeded BOM (US-074) as the table fixture, plus one LACE-scoped row
  to prove per-variant filtering.
- A frozen export date so archives compare byte-for-byte.

## Commands

```text
npm run build
npm run check
npm run factory-format-check
npm run preview-check
npm run mainpage-check
npm run construction-check
npm run bom-check
npm run export-xlsx
npm run golden
```

## Acceptance Evidence

Add results after verification.
