# 0038 The tech pack is multiple peer pages, switched by tabs — not an app plus a popup

Date: 2026-08-15

## Status

Accepted

## Context

US-068 (ADR 0037) added the MAIN PAGE sheet as a full-screen overlay opened by
a toolbar button and closed by an in-sheet Close button or Escape. That was
correct for landing the sheet itself, but it modeled MAIN PAGE as something you
*open over* the app and *dismiss* — a modal — when the TD's own framing is that
the Board and MAIN PAGE are two pages of the same tech pack output, not an app
plus a document viewer.

The TD's request in full: *"Mainpage phải là một trang giống như trang hiện
tại, hai trang là 2 phần của tech pack"* — MAIN PAGE must be a page like the
current one; the two pages are two parts of the tech pack. This also matters
for what comes next: BOM and Construction pages are anticipated future tech
pack sheets, and each one bolted on as its own overlay-plus-button pair would
multiply the same modal-shaped mistake.

Two questions were resolved with the TD before implementing (`AskUserQuestion`):

- **Navigation affordance:** tabs/pills on the shared toolbar (chosen) vs. a
  separate page-switcher bar. Tabs won because the toolbar is already the
  single chrome strip every page shares.
- **Generality:** build a generic `state.pages[]`-style registry now (chosen)
  vs. hardcode just Board/MAIN PAGE and generalize when a third page actually
  arrives. The TD chose to generalize immediately, accepting the small
  up-front cost so BOM/Construction are a one-entry registration, not a repeat
  of this refactor.

## Decision

Introduce `src/ui/page-nav.js` owning a single registry, `TECH_PACK_PAGES`,
where each entry names the DOM elements it owns:

```js
const TECH_PACK_PAGES = [
  { id: 'board', label: 'Board', els: ['boardToolbarGroups', 'statusbar', 'workspace'] },
  { id: 'mainpage', label: 'Main Page', els: ['mainPageOverlay'] },
];
```

`setActivePage(id)` toggles a `.page-hidden` class on every element of every
page not matching `id`, sets `state.activePage`, flips `body.mainpage-open`
(kept for the existing print rules and story continuity), and re-renders the
tab bar. The tab bar itself (`#pageTabBar`) is populated at runtime from the
registry — adding a page means adding one entry and a content element, not
touching the tab-bar markup or the show/hide logic.

The Board page is **not** wrapped in one container. It already spans three
independent top-level elements (`.toolbar`'s groups, `.statusbar`, `.workspace`)
because it is the original single-page app shell, not something built for
multi-page from day one. Restructuring that layout to get one wrapper div was
a larger, riskier change than giving `page-nav.js`'s registry a per-page
element list. The one exception: the toolbar's own button *groups* (mode
switch through help) are wrapped in a new `#boardToolbarGroups` so the whole
Board toolbar hides with one class toggle rather than seven.

`state.activePage` is session-only, exactly like `state.selectedImageIds`: it
is set directly by `initPageNav()`/`setActivePage()`, never enters
`makeSnapshot`/`restoreSnapshot` (`history.js`) or
`buildProjectSnapshot`/`loadProject` (`project-io.js`). Which page is showing
is a view concern, not project data — a reopened project always starts on the
Board, and switching tabs is not an undo step.

MAIN PAGE's CSS changes from a fixed-position full-viewport overlay
(`.mp-overlay`, `position:fixed`) to `.mp-page`, a normal grid child sharing
`.app`'s row 3 with `.workspace`. Both `.toolbar`, `.statusbar`, `.workspace`,
and `.mp-page` now carry an *explicit* `grid-row`, because CSS Grid's
auto-placement algorithm skips cells already claimed by an explicitly-placed
sibling — leaving `.workspace` unpositioned while `.mp-page` explicitly claims
row 3 would silently push `.workspace` into a new implicit row 4 the moment
both exist in the DOM together.

Toggling visibility uses a new `.page-hidden{ display:none!important; }`
utility rather than the `hidden` attribute. `[hidden]{display:none}` is a
user-agent-origin, normal-importance rule; it loses the cascade to any
author-origin `display` rule regardless of specificity — and `.group{
display:flex }` is exactly such a rule already present on every toolbar group.
`hidden` would have silently failed to hide the Board toolbar groups.

`#mainPageBtn` and `#mainPageCloseBtn` are deleted outright — the tab bar is
now the only entry and exit affordance for MAIN PAGE. `main-page.js` loses
`isMainPageOpen()`/`openMainPage()`/`closeMainPage()`/`toggleMainPage()`
entirely; its Escape-key handler now checks `state.activePage === 'mainpage'`
and calls `setActivePage('board')`.

## Alternatives Considered

1. **Keep the overlay-plus-button model, just restyle it as a "page."**
   Rejected: the TD's framing is structural (two pages, one tech pack), not
   cosmetic — a fixed-position overlay with its own open/close button pair is
   still a popup no matter how it's styled.
2. **Hardcode Board/MAIN PAGE with an `if (id === 'mainpage')` branch instead
   of a registry.** Offered at intake as the lower-effort option; the TD chose
   the registry so a third tech-pack page (BOM, Construction) is additive.
3. **Wrap the Board content in one `display:contents` wrapper** to get a single
   toggle point without changing the grid. Rejected: `display:contents` is
   also author-origin and beats `[hidden]` the same way `.group`'s `display`
   does, and toggling `.page-hidden!important` on a `display:contents` element
   fights with wanting its children back in the parent grid when shown again.

## Consequences

Positive:

- Adding a future tech-pack page is one `TECH_PACK_PAGES` entry plus a content
  element — the tab bar, show/hide, and print gating all read the registry.
- MAIN PAGE is reachable and leavable the same way as the Board: click its tab.
  No more asymmetric open-button/close-button pair.
- `state.activePage` is proven session-only by construction (same pattern as
  `state.selectedImageIds`), so undo/redo and saved projects are unaffected —
  confirmed by golden (0.0000 drift), invariants (135/135), contract (753/753),
  smoke, and autosave-check all staying green.

Tradeoffs:

- The Board page's visibility is spread across three DOM elements instead of
  one, so `page-nav.js`'s registry carries a per-page `els: [...]` list rather
  than a single id — a direct consequence of not restructuring the pre-existing
  Board layout.
- `body.mainpage-open` is kept as a second, redundant signal alongside
  `state.activePage` purely so the existing `@media print` rules (written
  against that class) did not need a same-story rewrite beyond the `.app`/
  `.mp-page` display rules that did change.

## Follow-Up

- When a third tech-pack page (BOM, Construction, ...) lands, confirm the
  registry needs no changes beyond a new entry and a content element — that is
  the generalization this ADR paid for up front.
- Consider retiring `body.mainpage-open` in favor of a `body[data-active-page]`
  attribute if a future page needs its own print rules and the boolean class
  stops being enough.
