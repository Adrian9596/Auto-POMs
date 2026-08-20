# 0051 — The board holds still when the chrome moves

## Status

Accepted — 2026-08-20.

## Context

A TD testing the US-086 pointer work reported that clicking a line to correct it
made the screen jump and left the line impossible to adjust. A screen recording
of the session showed the whole board sliding down the instant a line was
selected.

Selecting a line changes what the Board toolbar contains: `.board-line-settings`
(Arrow, Colour) becomes visible, and `Copy` and `Reflect` join
`#boardContextActions` while `Lock` leaves it. Measured at 1512px, that takes
`.board-toolbar-groups` from 1415px of content to 1630px against 1470px of
width, so `.board-menu-tray` wraps onto a second row. The toolbar grows 35.5px
and, because `.app` is a `grid-template-rows: auto auto 1fr`, the workspace
below it loses exactly that much — the canvas top edge moves **down** 35.5px and
its height drops 35.5px.

Nothing responded to that. `resizeCanvas()` ran only on `window.resize`, on the
Measurements panel toggle, and on a mode change. Two things followed:

- **The board was painted stretched.** `canvas { width:100%; height:100% }`
  means a backing buffer that no longer matches its CSS box is not clipped, it
  is scaled into it. The buffer stayed at its old height while the box shrank
  5.25%, so every line was drawn short of where the pointer code — which assumes
  1:1 — believed it to be. The error is zero at the canvas origin and grows with
  distance from it.
- **The board moved.** The canvas origin shifted 35.5px down and the drawing
  went with it.

Measured on `demo/demo1.jpg` with the 18 lines applied, comparing where a fixed
world point is *painted* against where the app computes it:

| Window | Board moved on screen (top / mid / bottom) | Gap between the drawn line and where the app tests for it |
| --- | --- | --- |
| 1440×900 | 4.8 / 3.2 / 1.5 px | 1.5 / 3.2 / 4.8 px |
| 1512×950 | 26.5 / 17.5 / 8.5 px | 9.0 / 18.0 / **27.0 px** |
| 1728×1000 | 27.9 / 17.5 / 7.1 px | 7.6 / 17.9 / **28.4 px** |

The endpoint catch radius is 10px and the line-body tolerance 8px. Over most of
the board the gap was two to three times either, so a TD aiming exactly at a
line could not hit it — and the gap **persisted** for as long as a line stayed
selected, which is why the session never recovered.

This is also the other half of the reflow US-086 found. That story pinned the
canvas rect for the duration of a gesture (`state.gestureCanvasRect`) so the
line stopped lurching when grabbed. The pin froze the coordinates but not the
canvas: the stale buffer and the moved origin were untouched, and the 35.5px was
recorded as a fact of life rather than as a bug with a fix.

## Decision

**The drawing does not move when the chrome around it does, and the canvas
backing buffer always matches its CSS box.**

Two changes, both in `resizeCanvas()` and its trigger:

1. **A `ResizeObserver` on the canvas drives `resizeCanvas()`**
   (`initCanvasResizeObserver`, called from `init()` after the first sizing).
   The canvas box changes far more often than the ad-hoc call sites covered —
   contextual toolbar rows, panel toggles, page tabs, mode switches — and
   correctness should not depend on each of them remembering. The
   `window.resize` listener stays as a backstop.

2. **`resizeCanvas()` preserves the board's screen position, not the world-space
   centre.** It now holds `pan + rect.origin` constant:

   ```js
   state.panX += previousRect.left - rect.left;
   state.panY += previousRect.top  - rect.top;
   ```

   Centre-preservation is the wrong rule for a chrome reflow, because the top
   edge moves down by the same amount the height shrinks: re-centring still slid
   the board 17.75px. "The view did not change" means the pixels did not move.

Two details that are load-bearing:

- **The diff baseline is `state.sizedCanvasRect`, not `state.lastCanvasRect`.**
  `getMousePos` overwrites `lastCanvasRect` with the live rect on every pointer
  event, so diffing against it would read zero change and skip the compensation
  in exactly the case that matters — a reflow during a gesture.
- **The gesture pin moves with the pan.** `resizeCanvas` re-pins
  `state.gestureCanvasRect` whenever it compensates. `pan + rect.top` is what
  maps a `clientY` to a world point; this shifts both halves by the same amount,
  so the mapping is *identical* either side of a reflow and a drag in flight
  cannot feel it. Moving one without the other would put the line back exactly
  where US-086 found it.

## Consequences

Measured again with the same harness, after the change:

| Window | Board moved on screen | Gap between drawn and tested |
| --- | --- | --- |
| 1440×900 | ≤ 0.24 px | ≤ 0.24 px |
| 1512×950 | **0** | **0** |
| 1728×1000 | **0** | **0** |

The residual sub-pixel at 1440 is the backing buffer rounding to whole device
pixels (`Math.round(rect.height * dpr)`), which is inherent.

Hiding the Measurements panel improved too, and was not part of the report: a
470px width change now moves the board **0px**, where centre-preservation slid
it 235px. Window resizes now reveal board instead of sliding it. Both are
behaviour changes to paths that were not broken, and both are what "keep the
current view" already claimed to do.

`board-interaction-check` grew a section 0 that measures the invariant against
the **painted** geometry — buffer size versus CSS box — rather than against the
app's own screen maths. That distinction is the whole point: every other
assertion in that suite computes screen positions the same way the app does, so
both sides of the comparison moved together, agreed with each other, and
disagreed only with the pixels the TD was aiming at. A stretched board is
invisible to a test that trusts the app's own transform. The suite is 58 checks,
up from 52.

Section 0 also asserts that the reflow it depends on **still happens**. If a
future toolbar change stops moving the canvas, the invariant becomes trivially
true and the test would sit green while measuring nothing; it fails instead and
says to re-point it.

## Follow-up: density is part of the invariant too

Found by probing the fix rather than reading it, immediately after shipping.

The buffer is a function of the CSS box **and** `devicePixelRatio`, and the first
version of this decision only put the box in the "does this need redoing?" test:

```js
const resized = !previousRect
  || Math.abs(previousRect.width  - rect.width)  > 0.01
  || Math.abs(previousRect.height - rect.height) > 0.01;
```

That early return was new in this ADR — the code it replaced re-sized the buffer
unconditionally — so it introduced a regression in the one case it did not
consider. Drag the window from a Retina laptop panel to an external 1080p
monitor and `devicePixelRatio` changes while the CSS box does not.
`render()` reads `devicePixelRatio` fresh on every frame for its
`ctx.setTransform`, so it immediately starts drawing at the new density into a
buffer still sized for the old one. Measured with
`Emulation.setDeviceMetricsOverride` at 1512×950, dpr 1 → 2: the buffer stayed
1016×773 where it needed to be 2032×1545, and the whole board rendered at **2×**.

Three things had to change, and the third is the one that matters:

1. `state.sizedCanvasDpr` records the density the buffer was sized for, and a
   change to it counts as a resize.
2. `watchDevicePixelRatio()` re-arms a `(resolution: Ndppx)` media query on every
   change. A `ResizeObserver` is structurally unable to see a density change —
   the box it observes is identical — and while Chrome happened to emit a
   `resize` on the 1 → 2 step in testing, it emitted **none** on the 2 → 1 step.
   Event plumbing is not a guarantee.
3. **`render()` verifies the invariant before it draws** (`syncCanvasBufferBeforeDraw`).
   Whatever the events do or fail to do, the buffer cannot be wrong at the moment
   the board is painted. It reads the cached rect rather than forcing layout, and
   `resizeCanvas`'s own early return makes the common case a no-op; it cannot
   loop, because `resizeCanvas` refreshes `state.lastCanvasRect` so the next frame
   has nothing left to fix.

With (1) and (2) alone the 2 → 1 step stayed broken, because no event fired at
all. With (3) it self-heals on the first draw after the change — which is also
the first moment it could have been visible, since the pixels already on screen
were painted at the old density and displayed at the matching scale.

The general lesson, and the reason this is recorded rather than quietly patched:
an invariant enforced only by event handlers holds exactly as well as the event
plumbing does. Enforce it where it is consumed.

### Not done here

**The toolbar still grows a row when a line is selected.** The board no longer
moves, but the board's viewport loses 35.5px off the top for as long as a line
is selected, so a line sitting in that top strip slides under the toolbar. Not
fixed because the only ways to fix it are layout decisions rather than defects:
`.board-toolbar-groups` needs ~160px less content to stay on one row at 1512px,
and the candidates are moving `.board-menu-tray` (File / Export / More, 215px)
onto the page-tab row, or shrinking `.board-drawing-group` (717px) to icon-only
tools. Both change where a TD looks for controls, which is the TD's call to make
and not a change to slip in under a bug fix.

Reserving two rows unconditionally was rejected: at 1728px the toolbar does not
wrap at all before selection, so a reservation costs a row of board on every
window that does not need one.
