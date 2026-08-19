# US-028 Live measured value while adjusting a line

## Status

implemented

## Lane

normal

## Product Contract

While a TD adjusts a measurement line in Manual Mode — dragging an endpoint
or curve handle with the mouse, or nudging with the arrow keys — the line's
Value cell in the Measurements panel updates live on every movement, not
just when the gesture commits. Tolerance feedback (± delta chip, in/out
coloring against Size L ± TOL) updates with it, so a TD can nudge *until*
the value reads in-tolerance. History behavior is unchanged: still one
snapshot per gesture.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 1)
- `docs/stories/epics/E01-manual-mode/US-027-arrow-key-line-nudge.md`

## Acceptance Criteria

- Arrow-key nudge of an endpoint updates the Value cell (and its tolerance
  chip) on every keypress, before the 700 ms burst commit.
- Mouse-dragging an endpoint / curve handle updates the Value cell on every
  mousemove.
- No full `renderSpecPanel()` rebuild per movement — only the affected
  row's Value cell is replaced (focus in other panel fields is not stolen).
- Auto-Mode draft drags are unaffected (drafts are not spec-table
  annotation rows); undo still restores one gesture per Cmd/Ctrl+Z.
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- Queries: `refreshMeasuredValueForAnnotation(annId)` in
  `src/ui/spec-panel.js` — looks up the row via `tr[data-ann-id]`, rebuilds
  just that row's `.spec-td-value` cell with the existing
  `buildMeasuredValueCell` (so value, delta chip, tooltip, and 📏
  re-calibrate button stay in one code path).
- UI surfaces: called from `src/manual/interactions.js` in the
  `drag-handle` mousemove branch and in `nudgeSelectedAnnotation`.
- Whole-line moves (`drag-annotation`) don't change length and skip the
  refresh; the commit-time `renderSpecPanel()` remains the consistency
  backstop.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass: per-keystroke value change, per-mousemove value change, no focus theft, one-undo-per-burst still holds |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15.
- Browser pass on demo1 after Apply Lines:
  - Keyboard: 10 ArrowLeft presses on the armed start point changed the
    Value cell 95 px → 97 px **in the same tick** (before the 700 ms burst
    commit); one Cmd+Z reverted to 95 px.
  - Mouse: synthetic mousedown on the start handle + two mousemoves changed
    the cell 95 → 106 → 117 px **mid-drag** (before mouseup); one Cmd+Z
    reverted.
  - Focus held: a focused Size L input kept focus through a live-refreshing
    drag (no `renderSpecPanel` rebuild per movement).
  - Bonus regression observed working: undo/redo across the Apply step
    restores/reapplies all 16 lines.
