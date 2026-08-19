# US-038 Anchor visibility manager

## Status

implemented

## Lane

normal

## Product Contract

Auto Mode now has 29 anchors — too many to read at once. Give the TD the same
visibility control over anchors that they already have over POM lines:

- **Hide all / Show all** anchors from one control.
- **Hide a few** — a per-anchor toggle (and a per-group toggle, since the
  schema groups anchors: band, cup, cradle, back, neckline, armhole, …).
- **Show only one** — an "isolate" action that hides every anchor except the
  chosen one, so the TD can place a single pin without the clutter.

The controls live in a **dedicated floating panel**, opened from an
`Anchors` button in the Auto toolbar — deliberately **separate from the
Measurements panel**. Rationale (TD, 2026-07-18): Measurements is the
exported spec; anchors never export — they are a testing / accuracy-checking
aid. Mixing them would imply anchors are part of the deliverable. The panel
is non-modal (docked top-left over the board, pins stay visible/clickable)
and labelled "Testing & accuracy tool — not exported". Hidden anchors are not
drawn and cannot be grabbed on the canvas. Visibility is a session-only view
state (not persisted, not in history), reset when a fresh Detect re-seeds.

## Relevant Product Docs

- `docs/stories/epics/E01-manual-mode/US-029-on-canvas-readout.md` (POM
  hide/show precedent lives in the same panel)

## Acceptance Criteria

- An Anchors section renders in the Auto-Mode panel, grouped by anchor
  `group`, showing visible/total.
- Hide all → no anchor pins drawn; Show all → all return.
- Per-anchor `×` hides one; per-group toggle hides/shows the whole group.
- Isolate hides all but the chosen anchor.
- A hidden anchor is not hit-testable (no accidental grab of an invisible pin).
- Clicking an anchor row selects it (canvas highlight), like clicking a pin.
- `npm run check` stays green; existing POM hide/show and golden unaffected.

## Design Notes

- State: `state.autoMode.hiddenAnchorKinds` (array of anchor kinds),
  session-only; cleared in `seedAnchorsFromDetection` alongside
  `anchorsHidden`. Visible(anchor) = `!anchorsHidden && !hidden(kind)`.
- Helpers (auto scope): `isAnchorHidden`, `toggleAnchorHidden`,
  `hideAllAnchors`, `showAllAnchors`, `isolateAnchor`, `toggleAnchorGroup`.
- Render: `drawAnchors` skips hidden kinds; `hitTestAnchors` ignores them.
- UI: new Anchors section in `renderSpecPanel` (Auto Mode). Add
  `hiddenAnchorKinds` **and `anchorSectionOpen`** to `specPanelFingerprint`
  (US-033) so toggles rebuild the section; each toggle calls
  `requestRender()`.
- **Toolbar entry point (TD request):** an `Anchors` button in the
  Auto-Mode toolbar (`#autoManageAnchorsBtn`, between Reset Anchors and
  Generate Drafts) calls `openAnchorManager()` — shows the panel if hidden,
  expands the section (`anchorSectionOpen = true`), and scrolls the
  `.anchor-manager-header` into view. Discoverable without hunting in the
  panel.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | Browser: hide-all/show-all, isolate, per-group hide, canvas reflects, hidden pin not grabbable |
| Platform | n/a |

## Harness Delta

None.

## Evidence

- `npm run build`, `npm run check` passed — 2026-07-18.
- Browser pass on demo1 in Auto Mode (Detect, not applied → 29 anchors):
  - Anchors section renders with header "Anchors (N/29 shown)" +
    Hide all / Show all. Collapsible (default collapsed); opened shows 10
    group rows + 29 anchor rows (29 isolate ◎ buttons confirmed).
  - Header count tracks exactly: **Hide all → 0/29, Show all → 29/29,
    Isolate → 1/29**, group hide (Band) → **27/29**.
  - Screenshot: grouped list ("Center / cradle (5)" with group Hide;
    "● CF top" row with isolate ◎ + hide ×, confidence dot); hidden Band
    pins removed from the canvas.
  - Hidden pins are not hit-testable (`hitTestAnchors` skips them);
    re-seeding via Detect resets to all-shown.
  - Toolbar `Anchors` button (between Reset Anchors and Generate Drafts)
    toggles a **floating panel**, not a Measurements section.

- **Refactor (TD request 2026-07-18):** moved the manager OUT of the
  Measurements panel into its own floating `#anchorManagerPanel` so the
  exported spec surface and the (non-exported) anchor test tool are visually
  and structurally distinct. Verified: Measurements table has **zero** anchor
  rows; the floating panel shows "Testing & accuracy tool — not exported",
  "29/29 shown", grouped list with per-anchor ◎ isolate + × hide; Hide all →
  0/29, Show all → 29/29, Isolate → 1/29; outside-click and Esc close it;
  `npm run check` green. Screenshot: panel docked top-left over the board,
  Measurements panel clean on the right.
