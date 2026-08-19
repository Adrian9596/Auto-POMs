# US-034 Accessibility cues

## Status

implemented

## Lane

normal

## Product Contract

Three cheap, real accessibility wins (full screen-reader support remains
out of scope for this desktop TD tool):

1. **Toasts are announced.** The toast element carries
   `role="status" aria-live="polite"`, so assistive tech hears the
   keyboard-workflow narration that sighted users see (Tab part cycling,
   learning samples, lock toggles) without any change to its visuals.
2. **Keyboard focus is visible on buttons.** All buttons get a
   `:focus-visible` outline, so a TD tabbing through the toolbar / panel
   controls can see where they are. Mouse clicks do not show the outline
   (`:focus-visible`, not `:focus`). Inputs already had focus styles.
3. **The active handle has a non-color cue.** The point the arrow keys move
   is now a bullseye — filled disk, white ring, plus a detached outer
   ring — distinguishable from hollow handles in grayscale and for any
   color-vision deficiency, not just by its blue fill.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 8)

## Acceptance Criteria

- `#toast` has `role="status"` and `aria-live="polite"`.
- Buttons show an outline under `:focus-visible`; existing input focus
  styles unchanged.
- Active handle renders a detached outer ring in addition to the fill;
  inactive handles are unchanged.
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- UI surfaces: `index.html` (toast attributes + one `button:focus-visible`
  CSS rule — index.html is hand-edited, not generated) and
  `src/render/render-annotations.js` `drawHandle` (outer ring when active).
- The vis-toggle buttons already carry `aria-pressed`; the canvas already
  has an `aria-label`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass: toast attrs present, focus-visible outline shown on keyboard focus, bullseye handle visible when a point is armed |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15.
- Browser pass:
  - `#toast` carries `role="status"` / `aria-live="polite"`.
  - A keyboard-focused button matches `:focus-visible` with a computed
    2 px outline; the rule is in the stylesheet (mouse clicks unaffected).
  - Active handle bullseye confirmed two ways: a radial pixel profile
    around the armed start point shows solid disk (r≤12 dev px) → white
    gap (blue fraction ≈0 at r 18–20) → detached blue annulus (r 21–29) →
    empty; and a screenshot shows the bullseye clearly distinct from the
    hollow handle at the other end of the same line.
