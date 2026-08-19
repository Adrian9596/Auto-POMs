# US-072 BOM page: editable material table + material-key annotation

## Status

done

## Lane

normal

Reason: three risk flags apply — existing behavior (finally consumes
`state.mainPage.colorways`, a data model ADR 0037 shipped as "knowingly
inert" pending exactly this feature, so a colorway removal can now change
what BOM displays), data model (a new persisted `state.bom` shape — rows +
callouts — threaded through history/save/load, same as MAIN PAGE/
Construction before it), and weak proof (a materially bigger reference
module than Construction's, per ADR 0041, so the interaction surface —
scope-filtered table, colorway columns, material quick-list, multi-anchor
callouts — has no prior test coverage to lean on). No hard gate applies: no
auth, authorization, external system, or public contract is touched, and
`state.bom` is additive/null-safe on every load path, not a destructive
migration. Normal lane with stronger validation per
`docs/FEATURE_INTAKE.md`.

## Product Contract

A fourth peer tech-pack page (`#bomPage`, tab `BOM`), rebuilt on this tool's
own primitives from the sibling reference project's `mod-bom` module
(`Tech pack Output/TechPack output.html`), per
[ADR 0041](../../../../decisions/0041-bom-annotation-and-table.md). Two
sub-views share one toolbar: **Table** — one shared list of FABRIC/TRIM rows,
scope-filtered (`BOTH`/`SOLID`/`LACE`) by the same Solid/Lace toggle tabs
Construction uses, with a `#` column computed live (never stored), 7 editable
cells (description/composition/supplier/article/width/size/areaOfUse), one
column per `state.mainPage.colorways` entry (defaulting to that colorway's
value, overridable per row/column), a per-row scope select + delete button,
and a side panel offering a searchable 27-material suggestion library that
fills a row's description and pre-fills only its empty cells — and
**Material Key** — numbered leader-line callouts placed on the board's
existing sketch images, linking a callout to a table row, reusing
Construction's exact multi-anchor/edge-leader-line/arrowhead/
double-click-delete-one-anchor engine forked under a `bm*` prefix. Detection,
anchors (the POM kind), and the 16 POMs remain untouched — BOM is pure
metadata, like MAIN PAGE and Construction before it.

## Relevant Product Docs

- `docs/decisions/0041-bom-annotation-and-table.md` — this story's decision
  record (scope read from the reference module, the drop list, alternatives
  considered).
- `docs/decisions/0037-main-page-sheet-port.md` — named colorway columns
  "knowingly inert — this tool has no BOM"; this story is that BOM.
- `docs/decisions/0039-construction-annotation-page.md` /
  `docs/decisions/0040-construction-lace-solid-leader-lines.md` — the
  Solid/Lace toggle convention and the multi-anchor leader-line engine this
  story forks for the material-key callouts.
- `docs/stories/epics/E08-tech-pack/US-070-construction-annotation/`,
  `docs/stories/epics/E08-tech-pack/US-071-construction-lace-solid-leader-lines/`
  — the page this story's material-key annotation was forked from.

## Acceptance Criteria

- `#pageTabBar` gets a fourth `BOM` tab; switching to it hides the Board/MAIN
  PAGE/Construction content and shows `#bomPage` (`TECH_PACK_PAGES` in
  `src/ui/page-nav.js`), setting `body.bom-open` and `state.activePage ===
  'bom'`.
- A row is `{ id, section:'FABRIC'|'TRIM', scope:'BOTH'|'SOLID'|'LACE',
  cells:{description, composition, supplier, article, width, size,
  areaOfUse}, cwOverride:{} }`. `#` is computed live from render order
  (FABRIC rows then TRIM rows), never stored — same non-goal as
  Construction's `seq`.
- Each FABRIC/TRIM section band has an always-visible "+ Add row" button
  (ported as a correctness detail from the reference module, whose own
  comment flags hiding an empty section's add-button as a prior bug).
- A row's scope select moves it between the Solid and Lace filtered views
  live (`BOTH` shows on both); the Solid/Lace toggle is shared with the
  Material Key sub-view.
- One table column renders per `state.mainPage.colorways` entry, defaulting
  to that colorway's `value`; editing a colorway cell writes
  `row.cwOverride[cw.col]` using key-presence (not truthiness) so an
  intentionally-cleared cell persists distinct from an untouched one, and
  editing one row's override never touches another row's.
- Selecting a row shows a side panel with a searchable list drawn from
  `BOM_MATERIAL_LIBRARY` (27 entries, `src/ui/bom-material-data.js`); picking
  a material always sets the row's `description`, and pre-fills
  `areaOfUse`/`supplier`/`article`/`width`/`size` **only into cells the TD
  has not already typed into** — it never overwrites a TD's own entry.
- A callout is `{ id, rowId, imageId, variant, targets:[{nx,ny}, ...],
  textPos:{nx,ny} }`, placed on the board's existing sketch images via the
  same armed-button convention as Construction (`#bomAddCalloutBtn`). Its
  label text (`N. {description}`) is derived live from the linked row's
  current number + description, never stored.
- `#bomAddArrowBtn` adds a second (or further) leader line to the selected
  callout; double-clicking any one arrowhead removes just that leader line;
  double-clicking a callout's last remaining arrowhead is a no-op with a
  toast (`Delete callout` is the only way to remove a callout entirely) —
  identical convention to Construction's `ccDeleteAnchorAt`.
- A callout can be relinked to a different row via `#bomMkRowSelect` without
  moving it on the sketch.
- A project saved before this story reopens without error and seeds an empty
  BOM (`{rows:[], callouts:[]}`) — `state.bom` is `null` until `ensureBom()`
  runs, same additive contract as `mainPage`/`construction`.
- BOM adds no anchor, no draft, no POM: `state.autoMode.anchors`/
  `draftAnnotations` are untouched by any row/callout operation.
- Save/open round-trips rows (including `cells`, `scope`, `cwOverride`) and
  callouts (including `targets`, `textPos`, `rowId`) losslessly; undo/redo
  covers every BOM mutation via `history.js`.
- No regression to detection, POMs, MAIN PAGE, or Construction: `npm run
  golden`/`invariants`/`contract`/`smoke`/`autosave-check`/`mainpage-check`/
  `construction-check` stay green/byte-identical — this story is additive,
  confined to a new page.

## Design Notes

- Commands: none (no backend).
- Queries: none.
- API: none — offline, no network.
- Tables: none.
- Domain rules: see the row/callout shapes above. `bmVisibleRows(variant)`
  filters by scope (`BOTH` or an exact match); `bmNumberedRows(variant)`
  computes `#` fresh every render (FABRIC section then TRIM section, list
  order); `bmCwValue(row, cw)` reads `cwOverride` by key-presence
  (`hasOwnProperty`), falling back to `cw.value`.
- New source parts (registered in `scripts/source-parts.mjs`, between
  `construction.js` and `page-nav.js`):
  - `src/ui/bom-material-data.js` — `BOM_MATERIAL_LIBRARY`, a static
    27-material suggestion array ported verbatim from the reference's
    `#bom-lib` data island (name/section/width/size/supplier
    options/article options/area options; no composition field in the
    source data).
  - `src/ui/bom.js` — the module: row/callout CRUD
    (`ensureBom`/`bmAddRow`/`bmRemoveRow`/`bmApplyMaterial`), the
    material-key engine forked from `construction.js` under a `bm*` prefix
    (`bmHitTest`/`bmCreateCalloutAt`/`bmAddArrowAt`/`bmDeleteAnchorAt`/
    `bmDrawCallout`/`bmEdgeToward`/`bmDrawArrowHead`), rendering
    (`renderBom`/`bmRenderTable`/`bmRenderSection`/`bmRenderRow`/
    `bmRenderMaterialPanel`/`bmDrawCanvas`/`bmRenderCalloutSidePanel`), and
    wiring (`initBom`, delegated `input`/`focusout`/`change`/`click`
    listeners on `#bomPage` so cell edits survive every table re-render).
- `src/state.js`: `initBom()` added to `init()`; `bom: null` added to the
  initial state object.
- `src/project/history.js`: `bom: state.bom ? clone(state.bom) : null` added
  to `makeSnapshot()`; restore mirrors `construction`'s block
  (`state.bom = snapshot.bom ? clone(snapshot.bom) : null;
  renderBom()`).
- `src/project/project-io.js`: `bom` added to `buildProjectSnapshot()`'s
  state object and to `loadProject()`'s restore (seed via `ensureBom()` +
  `renderBom()` when absent/legacy).
- `src/ui/page-nav.js`: `{ id: 'bom', label: 'BOM', els: ['bomPage'] }` added
  to `TECH_PACK_PAGES`; `body.bom-open` class toggle + `ensureBom()`/
  `renderBom()` added to `setActivePage()`.
- `index.html`: `#bomPage` markup reuses Construction's generic
  `.cc-toolbar`/`.cc-variant-tabs`/`.cc-hint`/`.cc-body`/`.cc-canvas`/
  `.cc-side`/`.cc-side-*` classes verbatim for view-agnostic chrome; new
  `bm-*` classes cover only what's genuinely new (the table, the material
  panel, the matkey-view flex wrapper). `@media print` gates
  `body.bom-open` the same way Construction's does (hide toolbar/side
  panels; the table itself is what prints).
- `src/ui/main-page.js`: `mpRemoveColor()`'s comment updated from "this tool
  has no BOM" to document the now-real (and accepted) limitation that a
  `cwOverride` keyed by colorway label orphans if a colorway ahead of it is
  removed — no remap pass exists, matching this function's pre-existing
  behavior.

## Validation

`scripts/bin/harness-cli story update --id US-072 --unit 0 --integration 1 --e2e 1 --platform 0 --verify "npm run bom-check"`

| Layer | Expected proof |
| --- | --- |
| Unit | Not a separate layer — covered by the E2E suite below (DOM-level state, no isolated pure-function unit to test). |
| Integration | `npm run check` (build freshness + wiring). |
| E2E | `scripts/bom-check.mjs` (47 assertions): tab switch shape, add/remove FABRIC+TRIM rows with live numbering, colorway columns default + independently-overridable, scope select moves a row between Solid/Lace, material quick-list fills empty cells but never overwrites a typed one, place/relink/drag/undo/delete a material-key callout, multi-anchor add + double-click-delete + last-anchor no-op, BOM adds no anchor/draft, legacy pre-US-072 load seeds an empty BOM, full save/open round-trip (rows + scope + cwOverride + callouts). |
| Platform | Not re-run standalone this story — covered by the full regression pass below (no new screenshot-only surface beyond what MAIN PAGE/Construction already introduced). |
| Release | Full regression: `golden` (13/13), `invariants` (135/135), `contract` (753/753), `smoke`, `autosave-check`, `mainpage-check` (31/31), `construction-check` (31/31) — all green/byte-identical, confirming this story is additive and confined to the new page. |

## Harness Delta

None anticipated — `scripts/bin/harness-cli` already covers story tracking
for this shape of change, same as US-070/US-071.

## Evidence

- `npm run build` / `npm run check` — pass.
- `npm run bom-check` — 47/47 assertions pass.
- `npm run golden` — 13/13 fixtures, 0 drift.
- `npm run invariants` — 135/135.
- `npm run contract` — 753/753.
- `npm run smoke` — no failures.
- `npm run autosave-check` — pass.
- `npm run mainpage-check` — 31/31.
- `npm run construction-check` — 31/31.
