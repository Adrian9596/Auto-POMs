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
| Endpoint grab on an unselected line, exact | 0 / 36 | **32 / 36** (suite run: 30/36) |
| …of which dragged the whole line instead | 35 | **0** |
| Press 12px off a line → photo moved | 14 / 18 | **0** |
| Press 20px off a line → photo moved | not measured | **0 / 18** |
| Line movement per 1px and 2.24px press | 1px, 2.24px | **0, 0** |
| Line movement per 4.47 / 8.94 / 13.42px press | — | 1.41 / 4.47 / 10.3 (tracks 1:1 after the 3px arm) |

Live single-gesture confirmation on a fresh board with nothing selected: pressing
POM 2's `end` opened `drag-handle{part:'end'}` immediately, moved that endpoint
23.32px for 23.32px of pointer travel, and moved `start` and the photo 0px.

A third defect surfaced while measuring and is fixed here: selecting a line
reveals the contextual toolbar row, which shifts the canvas **35.5px** between
mousedown and the first mousemove. With `getMousePos` reading a live rect the
line lurched ~35px the moment it was grabbed, and no click-vs-drag threshold
could hold. The rect is now pinned per gesture (`state.gestureCanvasRect`).

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

## Not Done Here

Deferred to US-087, with the reasons in ADR 0050: hover feedback and cursor
change, click-cycling through overlapping lines (the only thing that can reach
POM 5/6/8 and the coincident endpoint pairs), and two drawing bugs found on the
way — `drawLabel`'s `selected` argument is computed and never read, and
`drawLabelHandle` paints a white disc over the POM number of the line you just
selected.
