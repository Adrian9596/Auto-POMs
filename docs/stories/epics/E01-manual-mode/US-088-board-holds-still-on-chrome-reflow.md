# US-088 The board holds still when the chrome reflows

## Status

implemented

## Lane

normal

## Product Contract

Selecting a POM line must not move the drawing, and must not change where the
app looks for it:

- The sketch and its lines stay at the same screen position when the toolbar
  gains or loses a row, when the Measurements panel toggles, and when the window
  resizes.
- The canvas backing buffer always matches its CSS box, so a line is drawn where
  the pointer code tests for it — at every point on the board, not just near the
  top.

## Relevant Product Docs

- [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md) — this decision.
- [ADR 0050](../../../decisions/0050-lines-are-the-work-photos-are-the-backdrop.md) — US-086, which found the reflow and fixed only its coordinate half.
- `docs/decisions/0008-reenable-manual-mode.md` — Auto-first with a Manual handoff.

## Measured Problem

Reported from a TD test session on the deployed build: *"khi click vào line để
chỉnh thì màn hình bị nhảy, không thể điều chỉnh line"* — clicking a line to
correct it makes the screen jump and the line cannot be adjusted. A screen
recording showed the whole board sliding down the moment a line was selected.

Selecting a line makes `.board-line-settings` visible and swaps `Lock` for
`Copy` + `Reflect` in `#boardContextActions`. At 1512px that takes
`.board-toolbar-groups` from 1415px of content to 1630px against 1470px of
width, so `.board-menu-tray` wraps to a second row: the toolbar grows 35.5px and
the canvas below it moves down 35.5px and loses 35.5px of height.

`resizeCanvas()` ran only on `window.resize`, the panel toggle, and a mode
change — so nothing responded. `canvas { width:100%; height:100% }` means the
stale backing buffer was **stretched** into the smaller box rather than clipped.

Measured on `demo/demo1.jpg`, 18 lines applied, comparing where a fixed world
point is *painted* against where the app computes it:

| Window | Board moved on screen (top / mid / bottom) | Gap between the drawn line and where the app tests for it |
| --- | --- | --- |
| 1440×900 | 4.8 / 3.2 / 1.5 px | 1.5 / 3.2 / 4.8 px |
| 1512×950 | 26.5 / 17.5 / 8.5 px | 9.0 / 18.0 / **27.0 px** |
| 1728×1000 | 27.9 / 17.5 / 7.1 px | 7.6 / 17.9 / **28.4 px** |

Against a 10px endpoint radius and an 8px line tolerance, that gap makes a line
unhittable over most of the board — and it persists for as long as a line stays
selected, which is why the session could not recover by trying again.

US-086 had already found this reflow and pinned the canvas rect for the duration
of a gesture. The pin froze the coordinates but not the canvas: the stretched
buffer and the moved origin were untouched, and the 35.5px went into the docs as
a fact rather than as a bug with a fix.

## Acceptance Criteria

- Selecting a line moves the board 0px on screen (≤1px, for buffer rounding to
  whole device pixels).
- After any layout change, `canvas.width/height` equals
  `Math.round(cssBox * devicePixelRatio)` exactly — the board is never painted
  stretched.
- Hiding or showing the Measurements panel moves the board 0px.
- A drag in flight when the chrome reflows keeps tracking the pointer 1:1: the
  gesture pin and the pan move together, so the `clientY` → world mapping is
  identical either side of the reflow.
- Auto Mode anchor interaction, the Apply Lines handoff, and detection geometry
  are unchanged.

## Design Notes

- Commands: none.
- Queries: none.
- API: none.
- Tables: none.
- Domain rules: the 18-POM template and anchor schema are untouched.
- UI surfaces: `src/manual/viewport.js` (`resizeCanvas`, new
  `initCanvasResizeObserver`), `src/bootstrap.js` (observer wired after the
  first sizing), `src/state.js` (`sizedCanvasRect`), `src/render/viewport.js`
  (comment only — `getMousePos`'s pin is now half of a pair, not the whole fix).

`state.sizedCanvasRect` exists because `getMousePos` overwrites
`state.lastCanvasRect` with the live rect on every pointer event. Diffing the
compensation against `lastCanvasRect` would read zero change and skip it in
exactly the case that matters — a reflow during a gesture.

Preserving the world-space **centre** was the previous rule and is wrong for a
chrome reflow: the top edge moves down by the same amount the height shrinks, so
re-centring still slid the board 17.75px. The rule is now screen position —
hold `pan + rect.origin` constant.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` — build freshness, wiring, shared-scope gates |
| Integration | `npm run board-interaction-check` section 0 — buffer vs CSS box, and board drift, across two different reflows |
| E2E | `npm run smoke`, `npm run golden`, `npm run accuracy` — unchanged, nothing here touches detection |
| Platform | `npm run preview-check`, `mainpage-check`, `construction-check`, `bom-check` — the other pages own canvases the observer does not watch |
| Release | Before/after run of the measured table above at three window widths |

Section 0 measures against the **painted** geometry — backing buffer versus CSS
box — not against the app's own screen maths. That is the whole reason this
shipped undetected through a suite that drives real pointer events: every other
assertion computes screen positions the same way the app does, so both sides
moved together, agreed with each other, and disagreed only with the pixels the
TD was aiming at.

It also asserts the reflow it depends on still happens, so it fails rather than
going quietly vacuous if a future toolbar change stops moving the canvas.

## Harness Delta

None — `board-interaction-check` grew from 52 to 58 assertions.

## Evidence

Decision: [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md).

Same harness, after the change:

| Window | Board moved on screen | Gap between drawn and tested |
| --- | --- | --- |
| 1440×900 | ≤ 0.24 px | ≤ 0.24 px |
| 1512×950 | **0** | **0** |
| 1728×1000 | **0** | **0** |

From the suite at 1440×900:

```text
chrome reflow {"selecting":{"canvasTopDelta":35.5,"canvasHeightDelta":-35.5,
"canvasWidthDelta":0,"buffer":{"w":0,"h":0},"drift":0.39},
"panel":{"canvasTopDelta":0,"canvasHeightDelta":0,"canvasWidthDelta":470,
"buffer":{"w":0,"h":0},"drift":0}}
```

The canvas still moves 35.5px — the toolbar still grows a row — and the board
now does not follow it.

Hiding the Measurements panel was not in the report and improved anyway: a 470px
width change moves the board **0px**, where centre-preservation slid it 235px.

The press/move sweep logs `shift.top: 35.5` with `panY: 0`, which is correct and
not a broken compensation: `shift` is read synchronously inside the mousedown
task, before the `ResizeObserver` has run. Within that task the pinned rect and
the pan are still each other's match; by the time anything is painted both have
moved together. The sweep still shows presses tracking the pointer 1:1.

## Not Done Here

**The toolbar still grows a row when a line is selected**, so the board's
viewport loses 35.5px off the top while a line is selected and a line sitting in
that strip slides under the toolbar. `.board-toolbar-groups` needs ~160px less
content to stay on one row at 1512px. The two candidates — moving
`.board-menu-tray` (File / Export / More, 215px) to the page-tab row, or
shrinking `.board-drawing-group` (717px) to icon-only tools — both change where
a TD looks for controls, so they are the TD's call rather than something to slip
in under a bug fix. Reserving two rows unconditionally was rejected: at 1728px
the toolbar does not wrap before selection, so the reservation would cost a row
of board on every window that does not need one.

US-087 (hover feedback, cursor changes, cycling through overlapping lines, and
the two drawing bugs) is untouched by this story and its brief in US-086 still
stands.
