# 0050 Lines are the work, photos are the backdrop

Date: 2026-08-20

## Status

Accepted

## Context

A TD reported that correcting POM lines after Apply Lines was very hard: dragging
a line's endpoint "only works on one end — the other end drags the whole line",
and "quite often dragging a line drags the photo instead".

Driven with synthetic pointer events on `demo/demo1.jpg` (18 applied lines,
zoom 2.14), the board measured as follows:

| Gesture | Result |
| --- | --- |
| Drag an endpoint of an unselected line (36) | 35 → whole line moved, 1 → label. **0 endpoint drags** |
| Same, line already selected (36) | 34 → correct endpoint |
| Press 0px / 6px off a line (18 each) | 18/18 grabbed the line |
| Press 12px off a line (18) | **14/18 dragged the photo** |

Three mechanisms, all confirmed against `src/`:

1. `hitTestSelectedHandles` is consulted only for the **already-selected**
   annotation. The first press near an endpoint therefore fell through to the
   line-body test and opened a whole-line drag. That press left the line
   selected, so the *second* endpoint the TD tried worked — which is exactly the
   reported asymmetry. `setAppMode('manual')` clears the selection at the Apply
   handoff, so this was the state every line started in.
2. The photo is a full-bounding-box drag target sitting behind every line, and
   the only thing protecting it was the ~8 screen px catch ribbon around each
   2.5px line. Miss it and the whole sketch slid — carrying its lines, so the
   result looked internally consistent and was easy not to notice.
3. Found while fixing the above: selecting a line calls `updateUI()`, which
   reveals the contextual toolbar row and pushes the canvas down **35.5px**
   between the mousedown and the first mousemove. `getMousePos` deliberately
   read a live rect, so the same physical cursor position then resolved to a
   world point ~35px away and the line lurched the instant it was grabbed.

Widening the line tolerance was considered as the primary fix and rejected on
measurement: the share of a line's length lying within X px of another POM line
is 25% at 8px and 32% at 14px, and POM 5, 6 and 8 are **100% ambiguous at any
radius** (they are the center-front cluster; 16 of 153 line pairs come within
4px). POM 7's entire length sits inside its own label box, which
`hitTestAnnotations` tests before the line body.

## Decision

In Manual Mode the POM lines are the work and the sketch photo is the backdrop,
and the pointer model says so:

- **Any** visible line's endpoint is grabbable on the first press
  (`hitTestAnyEndpoint`, 10px, nearest wins), ahead of the line-body test. The
  selected line keeps its larger 14px handles so an in-progress edit is not
  stolen by a neighbour.
- A press on a photo that is not the current selection **selects** it and starts
  a marquee — a drag rubber-bands the lines on it, a plain click just selects.
  Only a press on an already-selected photo drags it.
- No geometry changes until the pointer has travelled 3 screen px.
- The canvas rect is pinned for the duration of a gesture
  (`state.gestureCanvasRect`), so a mid-gesture toolbar reflow cannot move the
  board under the cursor.

The photo is **not** auto-locked after Apply: the TD moves and copies photos
while correcting, so it stays a first-class object that simply asks to be picked
before it is moved.

## Alternatives Considered

1. **Auto-lock the sketch at the Apply handoff.** Cheapest fix for symptom 2 —
   the lock already exists, is persisted, and has a toolbar button and the `L`
   key. Rejected by the TD: photos must stay movable and copyable after
   drafting.
2. **Widen the line-body tolerance.** Rejected on the measurement above: it buys
   little and costs ambiguity, and cannot help the POMs that are 100% ambiguous.
3. **Make the photo click-through in Manual.** Would have removed a supported
   feature (photo arrange, group drag, Cmd+A "drag one to move all") for a
   problem that select-then-drag solves without taking anything away.
4. **Reserve the contextual toolbar row's height so the canvas never reflows.**
   Fixes cause 3 at the CSS layer, but leaves every other mid-gesture reflow
   (mode switches, status changes) able to reintroduce it. Pinning the rect per
   gesture is the invariant; the CSS is one instance of it.

## Consequences

Positive:

- Endpoint editing on an unselected line went from 0/36 to **30/36 exact**, with
  zero whole-line drags and zero photo drags.
- 72 presses at 0/6/12/20 px off a line: the photo **never** moves. A miss now
  starts a rubber-band, which is usually what the TD wanted anyway.
- A grabbed endpoint tracks the pointer 1:1 instead of lurching ~35px.
- Accidental sub-3px nudges no longer reach history — and no longer feed
  `evaluateManualPomSample`, which was training the learning loop on edits the
  TD never made.
- The board pointer path has automated proof for the first time
  (`board-interaction-check`, 26 assertions).

Tradeoffs:

- Moving a photo now takes two presses. Discoverable (the first press reveals
  its resize handles) but it is a learned change.
- The 6 remaining endpoint misses are POM pairs whose endpoints are *identical*
  by template (POM 1's end **is** POM 2's start; likewise 3/4). Nearest-wins
  cannot separate coincident points.
- A 3px dead zone means the mouse can no longer make a 1–2px correction; the
  arrow-key nudge (US-027) remains the precise path.

## Follow-Up

- US-087: hover feedback (cursor + highlight of the line under the pointer) and
  click-cycling through overlapping lines — the only thing that can reach POM
  5/6/8 and the coincident endpoint pairs.
- Two drawing bugs found during this work and deliberately deferred to US-087:
  `drawLabel`'s `selected` parameter is computed and never read, so a selected
  line is drawn identically to the other 17; and `drawLabelHandle` paints a 95%
  white disc over the POM number, so selecting a line hides the number used to
  identify it.
- Auto Mode's dispatch keeps the old order and was left unchanged here; decide
  whether the same first-press rule should apply to draft handles.
