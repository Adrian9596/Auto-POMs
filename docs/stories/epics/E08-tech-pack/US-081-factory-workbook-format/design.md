# Design

The cell-level specification lives in `design/` — one document per worksheet
plus the writer's API:

- `design/style-engine.md` — the authoring API and the interning tables
- `design/main-page.md`, `design/construction-detail.md`,
  `design/bom-lace.md`, `design/bom-solid.md`, `design/proto-direction.md`

This document covers what those maps assume.

## Domain Model

Three additions, all small, all additive:

- **Colorway parts.** A colorway becomes
  `{ col, code, name, value, hex }` where `code` is the Pantone/TCX reference
  (`14-1212 TCX`) and `name` is the colour name (`Nude Tan CP`). `value` stays
  the authoritative single string the UI edits and is derived as
  `code + ' - ' + name` when both exist, exactly the pattern
  `Style No Breakdown` established in ADR 0047 (`parts` authoritative, `value`
  derived). The split is *parsed* from the master-list entry on add, so the 47
  library entries need no editing; a hand-typed colour with no recognisable
  code keeps `code: ''` and prints on one line.
- **Two style fields.** `Supplier / Vendors` and `Development Round` join the
  MAIN PAGE field roster — that is where a TD already edits style metadata, and
  they round-trip through the project file for free. They are read by the PROTO
  sheet and are **not** printed on the MAIN PAGE worksheet: that sheet writes a
  fixed factory grid keyed by label, so a field with no row in the grid simply
  has no cell there.
- **Nothing else.** No new page, no new state container. The PROTO sheet is a
  render of existing state plus factory boilerplate.

Business rules preserved: anchors stay normalized `[0,1]`; learning never
mutates rule JSON; the POM contract keeps its 18 rows and its numbering, and an
off-contract POM stays a custom POM (ADR 0048 decision 7).

## Application Flow

`exportTechPackXlsx()` keeps its shape — collect enabled sheets, build one part
per sheet, assemble the zip — but each part builder now emits a styled cell map
rather than a row list:

```
exportTechPackXlsx
  └─ buildTechPackXlsxBytes(now, { enabledPages })
       ├─ buildMainPageSheetPart(now)          → cells + merges + images + pageSetup
       ├─ buildConstructionDetailSheetPart()   → both variant blocks, 6 board renders
       ├─ buildBomSheetPart('bom-lace', now)   → 7-column grid + 2 flat panels
       ├─ buildBomSheetPart('bom-solid', now)
       ├─ buildProtoSheetPart(now)             → header + boilerplate + spec block + sketch
       └─ assembleTechPackZip(parts, now)
```

The style engine sits under all of them: a builder declares cells and ranges
against named styles, the engine interns each font/fill/border/numFmt/xf
combination and emits `styles.xml`. Interning must be insertion-ordered and
keyed by the declared style so that identical input yields an identical
`styles.xml` — the byte-determinism contract.

One-builder rules that survive:

- The PROTO measurement block calls `buildSpecSheetRows()`, the same builder the
  Board's Export Excel uses, so POM text, tolerances and values can never
  diverge between the two files. What differs is presentation: proto writes the
  sample-size column only.
- Each Construction board render comes from the same function whose canvas the
  preview paper shows (ADR 0046 rule 5).

## Interface Contract

No network, no routes. The contract is the file:

| Worksheet | Order | Paper | Orientation |
| --- | --- | --- | --- |
| MAIN PAGE | 1 | A4 | landscape, 93% |
| CONSTRUCTION DETAIL | 2 | A4 | portrait, fit to page |
| ` BOM-LACE` | 3 | A4 | portrait, centered |
| BOM-SOLID | 4 | A4 | portrait, centered |
| PROTO Direction | 5 | A4 | landscape |

`state.preview.enabledPages` keys change with the sheet set. Legacy projects
carry the old six keys; `ensurePreviewPage()` already defaults any unknown key
to enabled, so an old project opens with all five new papers ticked and the
stale keys are ignored rather than migrated.

The Board's `exportSpecXlsx` / `exportSpecXlsxBase64` surface does not change.

## Data Model

Project-file additions, all optional so older files load unchanged:

- `mainPage.colorways[].code` / `.name` — absent in older files; derived by
  splitting `value` on first open.
- Two extra entries in `mainPage.fields`, appended by `ensureMainPage()` when
  missing (the mechanism US-080 used for `Block Reference`).

No migration, no deletion, no retention concern. History snapshots are
unaffected in shape; sketch bytes stay outside `state.mainPage`.

## UI / Platform Impact

- **Preview & Export tab**: `PV_SHEETS` becomes five entries in the new order,
  with `CONSTRUCTION DETAIL` as one paper showing both blocks and a new PROTO
  paper. Orientation flips to match the workbook (MAIN PAGE landscape,
  Construction portrait) — the preview currently declares the opposite.
- **MAIN PAGE page**: two more field rows; colorway rows show the same string
  they do today.
- **BOM page**: unchanged on screen. The `TYPE / COMPOSITION` column is dropped
  from the *export* only.
- **Construction page**: unchanged on screen; the exporter now renders each
  board separately instead of flattening the working board.
- Offline invariant intact: no new vendored library, no network call. The
  reference workbook is a Drive-local fixture and is **never** published — the
  hardened `.gitignore` in the publish clone keeps `*.xlsx` out, and the new
  suite must skip cleanly when the reference is absent so the public clone's
  test run does not fail.

## Observability

None to add. Failures surface as a toast plus a console error, as today.

## Alternatives Considered

1. **Embed the reference workbook as a template and write values into it.**
   Inherits every style for free, but the runtime is a single offline HTML file:
   the template would ride in `app.js` as base64 (12.7MB before our own
   images), row geometry differs per pack, and the template carries the
   customer's footer and residue ADR 0048 decided to drop.
2. **Keep six sheets and add PROTO as a seventh.** Rejected by FD — the factory
   pack has no standalone measurement sheet, and shipping both invites the
   factory to read the wrong one.
3. **Generate the sheets as images** (render each preview paper to PNG and
   embed one picture per sheet). Perfect visual parity, zero cell content — the
   factory could not copy an article number or a size, which is the whole point
   of the cell-based sheets (ADR 0046 rule 2).
4. **A general-purpose xlsx library** (SheetJS, ExcelJS). Rejected: offline
   single-file constraint, plus the byte-determinism contract is easier to hold
   in our own writer than to coax out of a library.
