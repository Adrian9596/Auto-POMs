# US-086 First-press line editing on the board

## Status

implemented

## Lane

normal

## Product Contract

After Apply Lines hands the TD off to Manual Mode, correcting a POM line must
work on the **first** press:

- Pressing near any line endpoint grabs **that endpoint**, whether or not the
  line was already selected.
- A press that misses every line must never move the sketch photo. The photo
  stays movable and copyable — it just requires an explicit "I mean the photo"
  press first.

## Relevant Product Docs

- `docs/decisions/0008-reenable-manual-mode.md` — Auto-first with a Manual handoff.
- `POMS_CONTRACT.md` — the 18 POMs (unchanged by this story).

## Measured Problem

Driven with synthetic pointer events on `demo/demo1.jpg`, 18 applied lines,
zoom 2.14 (harness prototype in the US-086 evidence section):

| Gesture | Result before this story |
| --- | --- |
| Drag an endpoint of an unselected line (36 gestures) | 35 → whole line moved, 1 → label. **0 endpoint drags** |
| Same, on a line already selected (36) | 34 → correct endpoint |
| Same, selected from the Measurements panel (6) | 6/6 correct |
| Press 0px / 6px off a line (18 each) | 18/18 hit the line |
| Press 12px off a line (18) | **14/18 dragged the photo** |

Cause: `hitTestSelectedHandles` is consulted only for the already-selected
annotation (`src/manual/pointer-events.js:121`), and there is no click-vs-drag
threshold for line/image drags, so the first press is itself a whole-line drag.
That press leaves the line selected, so the *second* endpoint the TD tries
works — which reads as "one end works, the other drags the whole line".

Eight of the 36 endpoint grabs were additionally stolen by a **different** line,
because POMs share endpoints by design and `hitTestAnnotations` iterates
topmost-first: `POM1.end→POM2`, `POM3.end→POM18`, `POM4.start→POM18`,
`POM5.start→POM17`, `POM5.end→POM6`, `POM6.start→POM8`, `POM8.start→POM17`,
`POM13.start→POM14`.

## Acceptance Criteria

- Pressing within ~10 screen px of any visible line's endpoint selects that line
  and starts an endpoint drag in the same press. Nearest endpoint wins.
- The handles of the line already selected keep their larger (14px) catch radius
  and still win a tie, so an in-progress edit is not stolen by a neighbour.
- Shift and Cmd/Ctrl keep their existing meanings: Shift builds a line
  multi-selection and never starts an endpoint drag; Cmd/Ctrl stays dedicated to
  photo multi-selection. Shift+click on a line keeps toggling it in the group.
- A press on a photo that is **not** the current selection selects the photo and
  starts a marquee — a drag rubber-bands lines, a plain click just selects. It
  does **not** move the photo.
- A press on a photo that **is** already selected drags it (group drag and the
  lines-follow-their-photo behaviour unchanged).
- A locked photo is still selectable (so it can be unlocked from the toolbar) and
  never moves.
- A press that moves less than 3 screen px does not change any geometry — no
  history entry, no measured-value change.
- Auto Mode dispatch is unchanged in this story.

## Design Notes

- Commands: none.
- Queries: new `hitTestAnyEndpoint(world)` in `src/render/hit-testing.js`.
- API: none.
- Tables: none.
- Domain rules: the 18-POM template and anchor schema are untouched.
- UI surfaces: `src/manual/pointer-events.js` (`onMouseDown` Manual branch,
  `startMarquee`, drag arming), `src/manual/selection.js`
  (`selectAnnotationsInRect` keep-selection flag).

Deliberately **not** in this story (deferred to US-087): hover feedback, cursor
changes, cycling through overlapping lines, and the selected-line drawing bugs
(`drawLabel`'s unused `selected` parameter; `drawLabelHandle` covering the POM
number). Also deliberately not done: auto-locking the sketch after Apply — the
TD needs to move and copy photos after drafting.

Tolerance widening was considered and rejected: measured ambiguity (share of a
line's length within X px of another line) is 25% at 8px and 32% at 14px, and
POM 5/6/8 are 100% ambiguous at any radius, so a wider corridor trades one
failure for another. POM 7's whole length sits inside its own label box, which
`hitTestAnnotations` tests before the line body — the endpoint pass above is
what makes POM 7 reachable.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` — build freshness, wiring, shared-scope gates |
| Integration | `npm run board-interaction-check` (new) — drives real mousedown on `#boardCanvas` |
| E2E | `npm run smoke`, `npm run golden`, `npm run accuracy` unchanged |
| Platform | Manual pass on touch (`src/manual/touch-input.js` routes into `onMouseDown`) |
| Release | Before/after run of the measured table above |

Before this story **no npm suite drove a single mousedown on `#boardCanvas`** —
`bom-check` and `construction-check` drive their own forked canvases. That is
the "weak proof" risk flag for this lane and is why the new suite is required
rather than optional.

## Harness Delta

New suite `scripts/board-interaction-check.mjs` + `npm run board-interaction-check`.
Demo-fixture dependent, so it runs in the private repo only (like `smoke`,
`golden`, `accuracy`) and is excluded from the public mirror's suite list.

## Evidence

Decision: [ADR 0050](../../../decisions/0050-lines-are-the-work-photos-are-the-backdrop.md).

Same harness, before and after (`demo/demo1.jpg`, 18 applied lines, zoom 2.14):

| Measurement | Before | After |
| --- | --- | --- |
| Endpoint grab on an unselected line, exact | 0 / 36 | **30 / 36** |
| …of which dragged the whole line instead | 35 | **0** |
| Press 12px off a line → photo moved | 14 / 18 | **0** |
| Press 20px off a line → photo moved | not measured | **0 / 18** |
| Line movement per 1px and 2.24px press | 1px, 2.24px | **0, 0** |
| Line movement per 4.47 / 8.94 / 13.42px press | — | 1.41 / 4.47 / 10.3 (tracks 1:1 after the 3px arm) |

An intermediate run of this table read 32/36, taken after the endpoint pass but
**before** the pinned canvas rect. That number was contaminated by the very bug
it preceded: the 35px mid-gesture jump changed which line ended up moving. 30/36,
from `board-interaction-check` on the shipped build, is the honest figure — and
the six are the coincident-endpoint pairs listed below, not a partial fix. Take
suite output over hand measurement when the two disagree.

The six that still land on a sibling POM: POM1.end, POM3.end, POM4.start,
POM5.start, POM8.start, POM13.start.

Live single-gesture confirmation on a fresh board with nothing selected: pressing
POM 2's `end` opened `drag-handle{part:'end'}` immediately, moved that endpoint
23.32px for 23.32px of pointer travel, and moved `start` and the photo 0px.

A third defect surfaced while measuring and is fixed here: selecting a line
reveals the contextual toolbar row, which shifts the canvas **35.5px** between
mousedown and the first mousemove. With `getMousePos` reading a live rect the
line lurched ~35px the moment it was grabbed, and no click-vs-drag threshold
could hold. The rect is now pinned per gesture (`state.gestureCanvasRect`).

> **Correction (US-088).** The pin fixed only half of that shift, and this story
> wrongly recorded the other half as a fact of life. Freezing the coordinates
> left the canvas itself alone: its backing buffer went on being stretched into
> a box that had shrunk, painting the board up to 5.25% short and putting a POM
> line up to 28px from where the pointer code tested for it — for as long as the
> line stayed selected, not only during the gesture. A TD hit exactly that on the
> deployed build. See
> [US-088](US-088-board-holds-still-on-chrome-reflow.md) and
> [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md).

Suites, all green on 2026-08-20:

```sh
npm run check && npm run board-interaction-check   # 26 assertions, new
npm run smoke && npm run golden && npm run accuracy && npm run invariants && npm run contract
npm run pipeline-tests && npm run junction-tests && npm run learning-tests && npm run evidence-tests
npm run autosave-check && npm run board-toolbar-check && npm run mainpage-check
npm run construction-check && npm run bom-check && npm run preview-check
npm run export-xlsx && npm run export-hidden && npm run suggestions-tests
npm run pom6-limitations && npm run pom7-limitations && npm run pom14-limitations
npm run viewrole-limitations && npm run detection-limitations && npm run library-l0-tests
```

`golden` held with no drift and `accuracy` did not regress, as expected — nothing
in this story touches detection.

## Review Pass Before US-087

The shipped diff was reviewed adversarially before stage 3 was allowed to build
on it. Four real defects came out of it and are fixed — details and reasoning in
ADR 0050's "Follow-Up Landed": the photo fix only covered the *first* mis-aim
(measured 25.5px on the second), `dragArmed` re-based `prevWorld` and so left
every drag ~3px behind the cursor while silently reshaping curves, `drag-anchor`
was the one drag left unarmed, and both image-resize drags mutated geometry
unarmed. The pinned rect was also leaking into `state.lastCanvasRect`.

The same pass turned on the suite itself and found it wanting in three ways,
now fixed:

- **It polluted the learning store.** Every gesture it drives is a real TD edit
  as far as the app is concerned, so ~200 of them fed `evaluateManualPomSample`.
  It now turns learning off for the run and restores the previous setting.
- **The endpoint bound was a count.** `epOk >= n - 6` passes just as happily
  when six *different* grabs break — exactly what a detection change would do.
  It now asserts the exact set of coincident-endpoint POMs.
- **"Nothing moved" was ambiguous.** A press that never reached the line looks
  identical to a threshold working. It now asserts, via `getInteraction()`, that
  the press opened a line drag and opened it *unarmed*.

It also refuses to run against a bundle that predates US-086, rather than
reporting the missing behaviour as broken.

## Brief for US-087

Measured on the shipped build, pressing each line's drawn geometry at four
points (t = 0.25 / 0.45 / 0.55 / 0.75) and recording which gesture opened:

| Line | Own-line presses | What claims the rest |
| --- | --- | --- |
| POM 5 | **0 / 4** | POM 8 (×3) and POM 6 — unreachable anywhere on the canvas |
| POM 9 | 2 / 4 | POM 10's label and body |
| POM 15 | 2 / 4 | POM 12's endpoints |
| POM 1 | 3 / 4 | POM 6's body |
| POM 3 | 3 / 4 | POM 8's label |
| POM 11, 17 | 3 / 4 | their own label (legitimate) |
| the other 11 | 4 / 4 | — |

That is a much smaller target than the pre-fix analysis suggested: **only POM 5
is unreachable now**, not POM 5/6/8, and POM 7 went from "100% of its length
inside its own label box" to 4/4. Cycling has to solve POM 5, the four partials,
and the six coincident endpoint grabs the suite pins down.

Two things in this story's code will get in the way and should be dealt with
first:

- `hitTestAnyEndpoint` returns only the nearest hit and throws the tie set away.
  Coincident endpoints — POM 1's end *is* POM 2's start — are exactly what
  cycling must step through, so it needs to return a ranked list.
- The dispatch order now lives inline in `onMouseDown` behind six independent
  gates (mode, tool, Shift, Cmd/Ctrl, line-selection size, photo-selection
  membership). Hover has to answer "what would a press here do?" with the same
  answer, so extract that predicate before adding cursor feedback rather than
  reproducing the ladder and letting the two drift.

Two regressions this story knowingly accepts, both worth revisiting in US-087:
a line drawn shorter than ~30 screen px has its own label box inside the
endpoint catch radius, so that label can no longer be dragged; and below ~20
screen px of drawn length the two endpoint discs cover the whole line, so the
mouse can no longer grab its body to move it whole (Shift+click and the Tab +
arrow-key path still can).

## Not Done Here

Deferred to US-087, with the reasons in ADR 0050: hover feedback and cursor
change, click-cycling through overlapping lines (the only thing that can reach
POM 5/6/8 and the coincident endpoint pairs), and two drawing bugs found on the
way — `drawLabel`'s `selected` argument is computed and never read, and
`drawLabelHandle` paints a white disc over the POM number of the line you just
selected.
