# US-069 The tech pack's pages switch by tab, not by opening/closing a sheet

## Status

implemented

## Lane

normal

Reason: touches existing behavior (MAIN PAGE's open/close UX changes shape)
and spans several files (`index.html`, `src/ui/main-page.js`, a new
`src/ui/page-nav.js`, `src/state.js`, `scripts/source-parts.mjs`,
`scripts/mainpage-check.mjs`), but no auth, authorization, data model, external
system, or public contract is touched, and `state.activePage` is deliberately
session-only (not part of any persisted contract). One risk flag
("existing behavior") — normal lane per `docs/FEATURE_INTAKE.md`.

## Product Contract

The Board (sketch + POM lines) and the MAIN PAGE sheet (US-068) are peer pages
of one tech pack output, switched by tabs on the shared toolbar — not an app
with a full-screen sheet opened over it and dismissed. Switching pages never
touches project data, undo history, or detection; it is a pure view concern.
Adding a future tech-pack page (BOM, Construction, ...) should cost one
registry entry, not a repeat of this refactor.

## Relevant Product Docs

- `ARCHITECTURE.md` — module map, gains `src/ui/page-nav.js`.
- `docs/decisions/0038-page-navigation-model.md` — this story's decision record.
- `docs/decisions/0037-main-page-sheet-port.md` — the page being re-homed.
- `docs/stories/epics/E08-tech-pack/US-068-main-page-sheet/` — MAIN PAGE itself.

## Acceptance Criteria

- A tab bar (`#pageTabBar`) on the toolbar shows "Board" and "Main Page";
  clicking a tab makes that page's content visible and every other
  registered page's content hidden.
- MAIN PAGE has no separate open button or close button — the tab bar is the
  only way in and out. Escape still leaves MAIN PAGE (routes through
  `setActivePage('board')` now, not a dedicated close function).
- Switching pages does not create an undo step, does not touch
  `state.autoMode`/anchors/drafts, and is not present in a saved project file —
  a reopened project always starts on the Board.
- Print output is unaffected: printing while on MAIN PAGE shows only the
  sheet; the tab bar and Board elements are absent from print output exactly
  as before (`@media print` rules updated for the new nesting, not the intent).
- Detection suites (`golden`, `invariants`, `contract`, `smoke`) are
  byte-identical to before this story — this is pure UI restructuring.

## Design Notes

- Commands: none (no backend).
- Queries: none.
- API: none — offline, no network.
- Tables: none.
- Domain rules: `state.activePage` is session-only, set directly by
  `initPageNav()`/`setActivePage()`, and deliberately excluded from
  `makeSnapshot`/`restoreSnapshot` (`history.js`) and
  `buildProjectSnapshot`/`loadProject` (`project-io.js`) — same pattern as
  `state.selectedImageIds`.
- UI surfaces:
  - `src/ui/page-nav.js` (new) — `TECH_PACK_PAGES` registry, `renderPageTabs()`,
    `setActivePage(id)`, `initPageNav()`.
  - `index.html` — `.page-hidden` utility (author-origin, beats `[hidden]`
    against existing `display` rules); `#boardToolbarGroups` wrapper around the
    Board's toolbar groups; `#pageTabBar` inserted as the toolbar's first
    child; `#mainPageOverlay` moved inside `.app`, renamed class
    `mp-overlay` → `mp-page`, and given `grid-row:3` alongside explicit
    `grid-row` on `.toolbar`/`.statusbar`/`.workspace` (auto-placement would
    otherwise push `.workspace` into a phantom row 4); `@media print` rewritten
    for the new nesting.
  - `src/ui/main-page.js` — `isMainPageOpen()`/`openMainPage()`/
    `closeMainPage()`/`toggleMainPage()` deleted; `initMainPage()` no longer
    wires `#mainPageBtn`/`#mainPageCloseBtn` (deleted from the DOM); the
    Escape-key handler now checks `state.activePage === 'mainpage'`.
  - `src/auto/debug-api.js` — `getState()` now reports `activePage` for test
    harnesses.

## Validation

`scripts/bin/harness-cli story update --id US-069 --unit 0 --integration 1 --e2e 1 --platform 1 --verify "npm run mainpage-check"`

| Layer | Expected proof |
| --- | --- |
| Unit | Not a separate layer here — covered by the E2E suite below (DOM-level, no isolated pure-function unit to test). |
| Integration | `npm run check` (build freshness + wiring). |
| E2E | `npm run mainpage-check` — rewritten to click the tab (`#pageTabBar [data-page="mainpage"]`) instead of `#mainPageBtn`, and to assert `.page-hidden` / `state.activePage` instead of the old `hidden` attribute / `mainpage-open` body class. |
| Platform | Headless-Chrome screenshots: Board view, MAIN PAGE view, back-to-Board view, and `@media print` emulation — confirming the tab bar renders as pills, content fully swaps, and print output shows only the sheet. |
| Release | Full regression: `golden`, `invariants`, `contract`, `smoke`, `autosave-check` — must stay byte-identical since this story touches no detection code. |

## Harness Delta

None — no new harness capability needed; `scripts/bin/harness-cli` already
covers story tracking for this shape of change.

## Evidence

Implemented and verified 2026-08-15.

- `npm run build` / `npm run check` — pass, `check passed`.
- `npm run mainpage-check` — **31/31 assertions, PASS** (was 29/29 before this
  story; +2 assertions for `boardHidden` and `activePage` on tab switch).
- `npm run golden` — **PASS, maxDrift 0.0000** on all 13 fixtures.
- `npm run invariants` — PASS, 135/135 assertions, 0 failed.
- `npm run contract` — PASS, 753/753 assertions, 0 failed.
- `npm run smoke` — PASS, `"failures": []`.
- `npm run autosave-check` — PASS.
- Screenshots (headless Chrome, CDP): Board tab active (full original toolbar
  + canvas + Measurements panel); MAIN PAGE tab active (sheet fills the same
  grid row, Board toolbar/statusbar/canvas fully hidden, no leftover Close
  button); back to Board tab (identical to the first screenshot — clean
  round trip); `@media print` emulation while on MAIN PAGE (only the sheet
  prints — `.app` is `display:block`, the tab bar is `display:none`, no
  Board chrome).
- Programmatic checks during the screenshot pass confirmed, on switching to
  MAIN PAGE: `activePage: "mainpage"`, `boardHidden: true`, `statusHidden:
  true`, `workspaceHidden: true`, `mpHidden: false`, tab
  `aria-selected="true"`; and on switching back: `activePage: "board"`,
  `boardHidden: false`, `mpHidden: true`.
