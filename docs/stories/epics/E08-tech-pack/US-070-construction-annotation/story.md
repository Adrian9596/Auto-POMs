# US-070 Construction annotation is the tech pack's third page

## Status

planned

## Lane

normal

Reason: three risk flags apply — existing behavior (touches the shared
toolbar/`TECH_PACK_PAGES` registry and `@media print` scoping already
established by US-069), multi-domain (new UI surface + new persisted data
model + history/project-io wiring, all in one story), and weak proof (a wholly
new UI surface with no prior test coverage to lean on). No hard gate applies:
no auth, authorization, data migration of *existing* data, external system, or
public contract is touched — `state.construction` is a purely additive,
optional field, same shape of change as US-068's `state.mainPage`. Normal lane
with stronger validation per `docs/FEATURE_INTAKE.md`.

## Product Contract

The tech pack gains a third peer page, **Construction**, alongside Board and
Main Page, switched by the existing tab bar. On it, the TD places numbered
callout notes with leader lines onto the board's existing sketch images to
call out construction details (seams, bindings, closures, stitch types) —
mirroring the sibling "Bra construction" project's core annotation workflow,
rebuilt on this tool's own primitives per
[ADR 0039](../../../../decisions/0039-construction-annotation-page.md).
Construction notes are project data: they save, reopen, and undo/redo like any
other board edit. Detection, anchors, and the 16 POMs are untouched — this
page carries no measurement data.

## Relevant Product Docs

- `ARCHITECTURE.md` — module map, gains `src/ui/construction.js`.
- `docs/decisions/0039-construction-annotation-page.md` — this story's
  decision record (scope, phase-1 boundary, deferred features).
- `docs/decisions/0038-page-navigation-model.md` — the `TECH_PACK_PAGES`
  registry this story extends.
- `docs/decisions/0037-main-page-sheet-port.md` — the "rebuild, not link"
  precedent this story follows again.
- `docs/stories/epics/E08-tech-pack/US-069-page-navigation/` — the tab
  infrastructure this story's page plugs into.

## Acceptance Criteria

- The tab bar (`#pageTabBar`) shows a third tab, "Construction"; clicking it
  shows `#constructionPage` and hides Board/Main Page content, exactly like
  switching between the existing two tabs.
- On the Construction page, the TD can: pick a phrase from a quick-list panel
  (or type free text) and click a point on any board sketch image to drop a
  numbered callout note there; drag a note's pin or its label independently;
  delete a selected note; see a leader line connecting pin to label, redrawn
  live while dragging.
- The phrase quick-list is seeded from the ported 336-entry merged set
  (`TERM_LIBRARY` + `STARTER_CONSTRUCTION_PHRASES` + inline
  `GENERATED_PDF_CONSTRUCTION_PHRASES`) per ADR 0039. Off-list free text is
  always accepted — the list is a suggestion, never a wall.
- Creating, moving, and deleting a Construction note are each one undo step
  through the existing shared history stack (`⌘Z`/`⌘⇧Z` works the same as for
  any other board edit).
- `state.construction` is included in save/reopen (`project-io.js`) and in
  undo/redo (`history.js`); a project saved before this story reopens with an
  empty Construction page, not an error.
- Switching to/from the Construction tab does not create an undo step, does
  not touch `state.autoMode`/anchors/drafts/POM lines, and does not affect
  `npm run golden`/`invariants`/`contract`/`smoke` (byte-identical detection
  behavior) — this story is additive UI + additive data only.
- Printing while on the Construction tab shows only the Construction page's
  content, matching the existing print-scoping pattern for Main Page.

## Design Notes

- Commands: none (no backend).
- Queries: none.
- API: none — offline, no network.
- Tables: none.
- Domain rules: a Construction note is
  `{id, seq, imageId, target:{nx,ny}, textPos:{nx,ny}, note, color, showArrow}`.
  `target`/`textPos` are normalized `[0,1]` **within the owning image's own
  x/y/width/height rect** — a distinct convention from the anchor `[0,1]`-of-
  whole-image convention (ADR 0039); Construction code must never read or
  write anchor data and vice versa. `seq` is the note's display number,
  assigned in creation order per the source project's `createCallout`
  convention.
- UI surfaces:
  - `src/ui/construction.js` (new) — `ensureConstruction()` (idempotent
    seed/migrate of `state.construction`), `renderConstruction()` (draws
    board images + notes + leader lines onto `#constructionCanvas`, renders
    the phrase quick-list panel), `initConstruction()` (one-time event wiring:
    click-to-place, drag pin/label, delete, phrase search input, Escape
    routes to `setActivePage('board')` when `state.activePage ===
    'construction'`), mirroring `main-page.js`'s three-function shape.
  - `src/ui/page-nav.js` — new `TECH_PACK_PAGES` entry
    `{id: 'construction', label: 'Construction', els: ['constructionPage']}`;
    `setActivePage()` calls `ensureConstruction()`/`renderConstruction()` on
    entering the tab, same as it does for `mainpage`.
  - `index.html` — `#constructionPage` as a new grid child of `.app`
    (`.page-hidden` + explicit `grid-row:3`, same treatment as `.mp-page`
    per the ADR 0038 auto-placement trap); `@media print` rule added for the
    new page, scoped the same way as the existing Main Page rule.
  - `src/state.js` — `construction: null` field on `state`;
    `initConstruction()` call in `init()`, positioned after `bindUI()`/
    `initMainPage()`/`initPageNav()` and before `seedHistory()` (the exact
    ordering constraint ADR 0037 identified for `initMainPage()`).
  - `src/project/history.js` — `makeSnapshot()`/`restoreSnapshot()` gain a
    `construction` field, mirroring the existing `mainPage` field verbatim.
  - `src/project/project-io.js` — `buildProjectSnapshot()`/`loadProject()`
    gain a `construction` field, mirroring the existing `mainPage` field
    verbatim (additive: old saves have no key, seed a default on open).
  - `src/auto/debug-api.js` — `getState()` reports a construction summary
    (e.g. note count) for test harnesses, same idea as `activePage`.
  - `scripts/source-parts.mjs` — register `src/ui/construction.js` after
    `src/ui/main-page.js`, before `src/ui/page-nav.js`.

## Validation

`scripts/bin/harness-cli story update --id US-070 --unit 0 --integration 1 --e2e 1 --platform 1 --verify "npm run construction-check"`

| Layer | Expected proof |
| --- | --- |
| Unit | Not a separate layer — covered by the E2E suite below (DOM-level state, no isolated pure-function unit to test in phase 1). |
| Integration | `npm run check` (build freshness + wiring across the 7 touched files). |
| E2E | `scripts/construction-check.mjs` (new, mirrors `mainpage-check.mjs`): tab switch shows/hides the right elements; note create/select/drag/delete; phrase pick fills note text; off-list free text accepted; undo/redo of a note create; save/reopen round-trip of `state.construction`; `activePage`/`page-hidden` assertions for the new tab. |
| Platform | Headless-Chrome screenshots: Construction tab empty, with notes placed, mid-drag, and `@media print` emulation — confirming leader lines render, the phrase panel is usable, and print scoping matches Main Page's pattern. |
| Release | Full regression: `golden`, `invariants`, `contract`, `smoke`, `autosave-check`, `mainpage-check` — must stay byte-identical/green since this story touches no detection code and Main Page's own tab must be unaffected by adding a third one. |

## Harness Delta

None anticipated — `scripts/bin/harness-cli` already covers story tracking for
this shape of change, same as US-068/US-069.

## Evidence

Pending implementation.
