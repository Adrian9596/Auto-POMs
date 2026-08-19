# US-036 Touch support for the board

## Status

implemented

## Lane

normal

## Product Contract

The board becomes usable on touch devices (iPad, touch laptops) without
changing anything about mouse or keyboard behaviour:

- **One finger** does what the mouse does: tap to select, drag to move a
  line / endpoint / label / image, tap-tap to draw with the line tools,
  drag to erase.
- **Two fingers** pinch to zoom (anchored at the pinch midpoint) and drag
  to pan. Putting a second finger down mid-drag commits the in-flight drag
  first (one history entry, per the existing gesture contract), then
  pinches.
- **Double-tap** fits the view (same as double-click / F).
- The browser's own touch scrolling/zooming is disabled on the canvas only
  (`touch-action: none`); the Measurements panel and dialogs keep native
  touch scrolling.
- Mouse events keep their existing listeners untouched; touch is a
  separate pointer-event layer filtered to `pointerType !== 'mouse'`, with
  `preventDefault()` suppressing compatibility mouse events so nothing
  double-fires.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 9)

## Acceptance Criteria

- Synthetic touch-pointer sequences drive select, drag (geometry changes,
  one history entry), and pinch (zoom + pan change, anchored at the
  midpoint) through the real handler path.
- A second finger during a drag commits the drag before pinching.
- Mouse interactions are bit-identical to before (regression probe).
- Canvas has `touch-action: none`; panel/dialogs do not.
- `npm run check` and `npm run smoke` stay green.
- Known gap, documented: verified with synthetic PointerEvents in desktop
  Chrome; a hands-on pass on a physical touch device is still owed.

## Design Notes

- `src/manual/interactions.js`: `onTouchPointerDown/Move/End` — a Map of
  active touch points; size 1 routes to `onMouseDown/Move/Up` (PointerEvent
  is a MouseEvent subtype, so `getMousePos`, `button`, `altKey` all work);
  size 2 opens a pinch session `{d0, zoom0, world0}` and each move sets
  `zoom = zoom0 · d/d0` (clamped) with pan solved so `world0` stays under
  the finger midpoint — same math as `zoomAtScreenPoint`. Double-tap
  detection (< 350 ms, < 20 px) calls the existing `onDoubleClick`.
  `setPointerCapture` wrapped in try/catch (synthetic events have no real
  pointer id).
- `src/ui/bindings.js`: pointer listeners beside the mouse ones (up/cancel
  on window, mirroring the mouseup precedent).
- `index.html`: `touch-action: none` on the board canvas.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass with synthetic touch PointerEvents (select / drag / pinch / commit-on-second-finger) + mouse regression probe |
| Platform | Physical touch-device pass — owed, tracked here |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-16.
- Browser pass with synthetic touch PointerEvents on demo1:
  - Tap selects / deselects / reselects; endpoint touch-drag moved only
    the grabbed point and one Cmd+Z restored it exactly.
  - Pinch out doubled the zoom exactly (1.912 → 3.823) with the world
    point under the finger midpoint pinned; parallel two-finger moves
    converge (sequential per-finger updates wobble transiently and settle
    on the next event — invisible at real touch event rates).
  - Second finger mid-drag committed the drag (geometry frozen through
    the following pinch) and one undo restored the pre-drag position.
  - Double-tap fit fires only on clean up-up taps: an immediate second
    pinch at the same spot no longer triggers it (the original down-based
    detector did — caught and fixed during verification).
  - Mouse regression probe: synthetic MouseEvent drag + undo identical to
    before; `touch-action` is `none` on the canvas, `auto` on the panel.
- **Platform gap (owed):** a hands-on pass on a physical touch device
  (iPad / touch laptop) has not been run — synthetic PointerEvents cover
  the handler logic, not real gesture recognizers or Safari quirks.
