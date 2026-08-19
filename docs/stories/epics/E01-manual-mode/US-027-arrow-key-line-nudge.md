# US-027 Arrow-key nudge for Manual Mode lines and endpoints

## Status

implemented

## Lane

normal

## Product Contract

In Manual Mode, a TD can fine-tune a measurement line with the keyboard:

- With a line selected, the arrow keys move the whole line by 1 source-image
  pixel per press (Shift = 10 px), exactly like the Auto-Mode anchor nudge.
- Pressing Tab with a line selected cycles the *active handle*:
  whole line → start point → (mid point, curved lines only) → end point →
  whole line. The active handle is visually highlighted on the canvas.
- With an endpoint (or mid point) active, arrow keys move just that point —
  changing the line's length and therefore its measured value in the
  Measurements panel.
- A rapid burst of presses commits to history once, ~0.7 s after the last
  keystroke, so one Cmd/Ctrl+Z undoes the whole burst (mirrors the
  one-commit-per-drag contract). Undo/redo pressed mid-burst flushes the
  burst first.
- Escape clears the active handle before it clears the selection.
- Arrow keys are untouched while typing in any panel field, and the
  Auto-Mode anchor nudge behavior is unchanged.

## Relevant Product Docs

- `docs/decisions/0008-reenable-manual-mode.md` (Manual Mode is the TD
  correction surface after Apply Lines)

## Acceptance Criteria

- Arrow keys move a selected line 1 source-image px (Shift = 10) in Manual
  Mode; no movement in Auto Mode (anchors keep owning the arrows there).
- Tab cycles whole line → start → (midPoint) → end; the active handle is
  rendered distinctly; changing selection resets the active handle.
- Nudging an endpoint updates the measured value in the Measurements panel
  when the burst commits.
- One history entry per nudge burst; Cmd/Ctrl+Z mid-burst undoes the burst.
- Nudging an applied auto-draft line marks it TD-touched and feeds the
  manual learning sample on commit, same as a mouse drag.
- `npm run check`, `npm run golden`, and `npm run smoke` stay green.

## Design Notes

- Commands: keyboard nudge session (debounced history commit, 700 ms).
- Queries: annotation → source image association via image bounds (line
  midpoint containment, same rule as `getAnnotationsOnImage`); step =
  `image.width / naturalWidth` world units per source px, falling back to
  `1 / state.zoom` when the line is not over an image.
- UI surfaces: `src/manual/interactions.js` (keydown branch + Tab cycle +
  nudge session), `state.selection.part`, `src/render/render-annotations.js`
  (active-handle highlight), `src/ui/dialogs/help-dialog.js` (shortcut rows),
  `src/manual-tools.js` (select-tool hint text).
- Domain rules: reuses `dragHandle` / `moveAnnotation` so curved-line handle
  semantics stay identical to mouse drags; no detection or rule-JSON change.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a (no pure helpers added) |
| Integration | `npm run check` (build + wiring) |
| E2E | `npm run smoke`, `npm run golden` unchanged; hands-on browser pass (nudge, Tab cycle, undo-as-one-step, measured value refresh) |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check` passed, `npm run golden`
  12/12 PASS (maxDrift 0.0000), `npm run smoke` failures: [] — 2026-07-14.
- Browser pass on demo1 after Apply Lines (Manual Mode): ArrowLeft with the
  start point active moved only `start.x`; 10 presses moved it exactly
  10 source px (0.163 board px each at the demo's display scale); measured
  value refreshed 66 px → 68 px on session flush; one Cmd+Z restored the
  pre-burst position exactly. Tab toasts cycled start → end → whole line →
  start; Escape cleared the active point but kept the selection; the active
  handle renders filled blue vs the hollow inactive handle.
