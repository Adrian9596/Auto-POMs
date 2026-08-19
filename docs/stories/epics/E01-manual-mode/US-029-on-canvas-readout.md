# US-029 On-canvas measurement readout while adjusting

## Status

implemented

## Lane

normal

## Product Contract

While a line is being adjusted — an endpoint / curve handle mouse-drag, or
an arrow-key nudge burst — a small floating readout appears on the canvas
next to the point being moved, showing the line's measured value exactly as
the Measurements panel formats it (calibrated unit or px), plus the ± delta
against Size L with the ✓ / ✗ tolerance verdict when one can be computed.
The readout disappears when the gesture commits (mouseup / nudge-burst
flush). The TD's eyes never have to leave the sketch to hit a target value.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 2)
- `docs/stories/epics/E01-manual-mode/US-028-live-measured-value.md`

## Acceptance Criteria

- Readout appears during a handle drag and during a key-nudge burst, near
  the active point (line midpoint when nudging the whole line).
- Shows the same value text as the panel's Value cell; when Size L (+ TOL)
  and a scale are set, appends the signed delta with ✓ (in tolerance) /
  ✗ (out), matching the panel chip exactly (shared helper).
- Disappears on gesture commit; never renders on an idle selected line.
- Works on Auto-Mode draft handle drags too (same helper path).
- Screen-stable size (divides by zoom), readable over sketch ink.
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- Queries: `specDeltaText(ev)` extracted in `src/ui/spec-panel.js` so the
  panel chip and the canvas readout can never disagree.
- UI surfaces: `drawAdjustmentReadout(ann)` in
  `src/render/render-annotations.js`, called from `drawSelectionHelpers`;
  gesture detection via `state.interaction` (drag-handle) and a new
  `isLineNudgeActive(annId)` accessor in `src/manual/interactions.js`.
- `flushLineNudgeSession` and `onMouseUp` request a render so the pill is
  removed the moment the gesture commits.
- Domain rules: display-only — no geometry, history, or detection change.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass: pill visible mid-drag and mid-burst with correct value, gone after commit |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15.
- Browser pass on demo1 after Apply Lines:
  - Mouse: held mid-drag on a start handle, pill rendered "115 px" beside
    the point (uncalibrated) and, after Set Scale (line = 10 in) with
    Size L 9.5 / TOL 0.25, rendered "9.6 in +0.1 ✓" with a green verdict —
    exactly matching the panel's Value cell. Pill pixel count in the region:
    ~3 089 mid-gesture vs ~10 idle/after release.
  - Keyboard: pill appeared during a 3-press ArrowRight burst and cleared
    when the 700 ms flush committed.
  - Verification note: the Browser pane clamps `setTimeout` hard (400 ms
    waits fired after ~2.4 s), which initially made the flush look broken —
    sampling at longer horizons showed the timer fires and clears the pill;
    real focused-tab timing is unaffected.
