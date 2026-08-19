# US-030 Curve bend handles in the Tab ring

## Status

implemented

## Lane

normal

## Product Contract

Curved lines become fully keyboard-tunable: pressing Tab on a selected
curved line cycles through the main points first (whole line → start →
mid → end), then the bend handles (start bend → mid bend toward start →
mid bend toward end → end bend), skipping handles the curve doesn't have.
Arrow keys nudge the active bend handle exactly like an endpoint —
1 source px, Shift = 10, one history commit per burst — reshaping the
curve with the same semantics as a mouse drag on that handle. The active
bend handle gets the same filled highlight and on-canvas readout as
endpoints. Straight lines are unchanged.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 3)
- `docs/stories/epics/E01-manual-mode/US-027-arrow-key-line-nudge.md`

## Acceptance Criteria

- Tab ring on a two-segment curve: whole line → start → midPoint → end →
  control1 → midHandleIn → midHandleOut → control2 → whole line; missing
  handles are skipped; Shift+Tab cycles backwards.
- Arrows on an active bend handle move only that handle (curve reshapes;
  endpoints stay put), via the existing dragHandle path.
- Toast names each bend handle clearly; the active one renders filled.
- Straight-line ring unchanged (whole → start → end).
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- UI surfaces: `lineNudgeParts` builds the ring dynamically from the parts
  the annotation actually has; `nudgePartLabel` gains bend-handle names
  (`src/manual/interactions.js`). Help dialog row text updated.
- Nudge, highlight (drawHandle active param), and US-029 readout already
  accept arbitrary parts — no changes needed there.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass on a curved line: full Tab ring order, arrows reshape via a bend handle, endpoints unmoved, one undo per burst |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15.
- Browser pass on demo1's applied two-segment curve (all 5 extra parts):
  - Tab toasts in exact ring order: start point → mid point → end point →
    start bend handle → mid bend handle (start side) → mid bend handle
    (end side) → end bend handle → whole line (wraps).
  - With the start bend handle armed, 5 ArrowUp presses moved `control1`
    by exactly 5 source px while start / end / midPoint stayed
    bit-identical; one Cmd/Ctrl+Z reverted `control1` exactly (Δ 0).
