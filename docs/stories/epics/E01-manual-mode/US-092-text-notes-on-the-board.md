# US-092 Text notes on the Board

## Status

**Implemented.** All 8 steps landed: model + persistence, rendering, exports,
photo parity, pointer + editor, leaders, the icon-only toolbar (pulled forward
into step 5, re-measured in step 7), and docs + harness (ADR
[0052](../../../decisions/0052-notes-are-the-boards-third-object.md),
`docs/TEST_MATRIX.md`, `CLAUDE.md`'s suite list, `harness-cli story add` /
`decision add`). An independent audit on 2026-08-20 then fixed 4 real
behaviour bugs and closed 4 test gaps; see "Independent audit" below. The
three design decisions were settled by the TD on 2026-08-20; see "Decisions
taken". A follow-on change request the same day added the note's own size
chip, resolving the last open decision from step 5 — see "The note's own size
control" below. Full battery: 24/24 suites PASS, `notes-check` 188 assertions,
`board-interaction-check` 88 assertions.

## Lane

normal, with stronger validation.

Risk checklist: **Data model** (the project file gains a `notes` array),
**Public contracts** (the saved-project shape and every export image surface are
TD-visible contracts), **Existing behavior** (selection model, board hit-test
order, export bounds, history, toolbar layout). 3 flags, no hard gate — old files
load with no notes and nothing is migrated destructively. A decision record is
warranted anyway: this adds the Board's **third** first-class object, alongside
POM lines and photos.

## Product Contract

A TD can put free text anywhere on the Board — a remark for the factory, a
reminder to themselves, a label on a detail — and:

- it can **point**: a note may carry one or more leader arrows to the exact spot
  on the sketch it is talking about, or none at all;
- it is **not a measurement**: it never appears in the Measurements panel, never
  becomes a POM row, and never enters the exported spec workbook's table;
- it **stays where it was put**: moving or resizing the sketch it sits on carries
  it, exactly as POM lines are carried;
- it **prints**: the note is part of the board picture in Copy Image, Export PDF,
  the Excel embedded sketch, and the Preview & Export board sheet;
- it **survives**: save/open, autosave restore, and undo/redo.

## Why this is not already possible

It half is, and that is the problem. Today a TD can draw a single-arrow straight
line and double-click its label to type words into `ann.text`. That is the only
free-text path on the Board, and it is actively harmful:

- `getLabelText(ann)` falls back from `ann.text` to `ann.seq`, so a typed line
  becomes an annotation whose POM key is the typed sentence;
- `renderSpecPanel` (`src/ui/spec-panel.js:155`) buckets annotations by that key
  and renders anything outside 1–18 as an **extra spec row**;
- `state.deletedPomKeys` then remembers that sentence as a deleted POM key when
  the line is removed (`src/manual/annotation-lifecycle.js`);
- the same key flows into the Excel export.

So the workaround corrupts the deliverable. A first-class note is what removes
the incentive to use it.

## Relevant Product Docs

- [ADR 0050](../../../decisions/0050-lines-are-the-work-photos-are-the-backdrop.md) — the Board's press-priority rule, which a note has to slot into.
- [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md) — the geometry class of defect this must not reintroduce.
- [ADR 0041](../../../decisions/0041-bom-annotation-and-table.md) — Construction/BOM callouts are a deliberate parallel fork; the Board gets its own, they are not merged.
- [US-089](US-089-sketch-carries-its-drafts.md) / [US-091](US-091-resizing-the-sketch-scales-its-lines.md) — "everything drawn on a photo travels with it", the two transforms a note must join.

## The one measured blocker: the toolbar has no room

Measured live at 1512 px, Manual Mode, one sketch loaded, nothing selected:

| State | `#boardToolbarGroups` height |
| --- | --- |
| Today | **38 px — one row** |
| \+ a labelled `Text` tool button (97 px) | **74 px — two rows** |
| 4 existing tools icon-only (64 px each, saves 202 px) + a 5th icon-only tool | **38 px — still one row** |

The drawing toolset's flex gap is 2 px and the row has **0 px** of slack: a probe
of width 0 already wraps it. So a new labelled toolbar button is not a free
addition — it permanently costs the Board 36 px of vertical workspace on the TD's
own screen width, in the *unselected* state. This is the same toolbar-growth
problem left open after US-088, and this feature would make it fire earlier.

Resolved by decision 2: icon-only tools. See "The icon-only toolbar change".

## Decisions taken (TD, 2026-08-20)

1. **The leader arrow is optional, and it is an arrow — not a number.** A note
   may have no leader (a plain caption) or one or more leaders, each drawn as a
   line from the note box's edge to a point on the sketch, ending in an
   arrowhead. Explicitly **unlike** the Construction / BOM callouts, whose pin is
   a filled circle carrying the row's sequence number: a Board note carries no
   number, because it is not a row in any table. This rules out reusing
   `ccDrawCallout` wholesale and is one more reason the Board gets its own
   renderer (ADR 0041 already says these engines stay parallel).
2. **The five tool buttons become icon-only.** Measured to fit with room to
   spare, and it keeps the Board's working area at its current height.
3. **Manual Mode only.** `setTool` keeps refusing non-select tools in Auto.
   Notes still **render** in both modes — they are board content, like applied
   lines.

## Acceptance Criteria

- With the Text tool active, clicking the board opens an editor at that point;
  typing and committing creates a note. An empty commit creates nothing.
- A note is selectable, draggable, editable (double-click), and deletable
  (Delete / the toolbar Delete button).
- A note starts with **no** leader. With the note selected, dragging its leader
  handle out to a point creates one; dragging a leader's tip moves it;
  double-clicking a tip removes that leader. A leader ends in an arrowhead and
  carries **no number**.
- Leaders travel with their note and with the photo, and scale with a resize,
  exactly as the note box does.
- The five drawing-tool buttons are icon-only, each keeps its `title`, gains an
  `aria-label`, and keeps its `data-key` shortcut badge.
- A note never appears in the Measurements panel, never produces a POM row, never
  enters `state.deletedPomKeys`, and never changes `getExportAnnIds()`.
- Dragging the sketch the note sits on moves the note by exactly the same delta.
- Resizing that sketch scales the note's position about the resize anchor, and
  scales its font with the photo. No measured POM value changes.
- The note is drawn in Copy Image, Export PDF, the Excel embedded sketch and the
  Preview board sheet, and it widens `getContentBounds()` so it is never cropped.
- Save → open, and autosave → restore, both round-trip note text, position,
  colour and size. A project file written before this story opens with no notes
  and no error.
- Undo/redo covers create, edit, move, restyle and delete, one step per gesture.
- Multi-line text wraps and renders identically on screen and in every export.
- The Board toolbar's height in the unselected state is unchanged from today:
  38 px at 1512 px, one row, with the fifth tool present.

## Design Notes

### Data model — a note is NOT an annotation

The decisive constraint. `state.annotations` is the measurement collection: the
spec panel, the tolerance check, grading, the Excel table and `deletedPomKeys`
all derive from it by label. A note must therefore live in its own array.

```js
// state.notes — Board text notes (US-092). World coordinates, like annotations.
{
  id,                 // state.idCounter++
  text: 'string',     // may contain \n
  pos: { x, y },      // world coords of the text box's top-left
  color: 'red',       // LINE_COLORS key, reuses the existing colour menu
  fontSize: 16,       // world px, scaled by a photo resize
  boxWidth: 220,      // world px wrap width
  leaders: [],        // 0+ world points, each drawn box-edge -> point + arrowhead
}
```

A note is born with `leaders: []` — a plain caption. The TD adds arrows only
where they mean something.

**The leader is an arrow, not a numbered pin.** `ccDrawCallout` fills a circle at
the target and writes the row's sequence number into it; a Board note has no row
and no number, so the Board renderer draws line + arrowhead and stops. The edge
geometry is the same idea as `ccEdgeToward` (start the line at the box edge
facing the target, not at its centre) and gets its own small `noteEdgeToward`
here rather than reaching across into the Construction part.

**Coordinates: world, not normalized-to-image.** Anchors and Construction
callouts are normalized to their owning image and follow it for free, but they
*require* an owner — and a note pinned in blank space beside the sketch (a title,
a general remark) has none. World coordinates match annotations, so a note joins
the two transforms US-089/US-091 already hardened rather than inventing a third
rule. The cost is that both transforms must be extended explicitly; that is
exactly what the new test section asserts.

### Files to change

| File | Change |
| --- | --- |
| `src/state.js` | `notes: []` in `state`; a `NOTE_*` size constant block. |
| **`src/manual/note-model.js`** *(new part)* | `createNote`, `noteBounds`, `wrapNoteLines`, `noteEdgeToward`, `hitTestNotes`, `getNoteById`, `moveNote`, `scaleNoteAbout`. Registered in `scripts/source-parts.mjs` **after** `annotation-lookup.js` and **before** `render/`. |
| **`src/render/render-notes.js`** *(new part)* | `drawNote(note, selected)` — box, wrapped text, each leader as line + arrowhead (no number), selection handles including the leader-add handle. Sizes through `featureZoom()` so exports keep proportion. |
| `src/render/render-loop.js` | Draw notes in `render()` between the annotation bodies and the label pass; draw the selected note's handles. |
| `src/manual/pointer-events.js` | Text tool → `openNoteEditor` at the click; `drag-note`, `drag-note-leader` and `drag-note-leader-new` interactions (all armed through `dragArmed`, US-086); extend `startImageDrag`'s grouped set with the notes on that photo (**US-089 parity**). |
| `src/render/viewport.js` (`onDoubleClick`, line 77) | Double-click a note → edit; double-click a leader tip → remove that leader (Construction precedent). |
| `src/render/hit-testing.js` | `hitTestNotes(world)` returning `{ id, part: 'box' \| 'leader' \| 'leader-add', index }`; call it in the press chain (order below). |
| `src/manual/viewport.js` | `notesWithinBounds(bounds)` beside the existing `annotationsWithinBounds` (line 209); a `scaleNotesForImageResize` sibling of `scaleAnnotationsForImageResize` (line 254) that scales position, `fontSize`, `boxWidth` and every leader about the resize anchor (**US-091 parity**). |
| `src/ui/label-editor.js` | A second editor overlay for notes — a `<textarea>`, since notes are multi-line and `#labelEditor` is a single-line `<input>`. New `#noteEditor` element + CSS in `index.html`. |
| `src/manual/selection.js` | `getSelectedNote()`; `setSelection` accepts `kind: 'note'`. |
| `src/manual/annotation-lifecycle.js` | A `'note'` branch in `deleteSelected()` — today it silently returns for an unknown kind. |
| `src/manual/keyboard-shortcuts.js` | `T` = Text tool (verified free); Escape cancels the note editor; Delete removes the selected note; the arrow-key nudge stays annotation-only. |
| `src/ui/bindings.js` | `setTool('text')` allowed; the colour menu applies to a selected note. |
| `src/manual/ui-status.js` | Tool-button active state; the colour/size chips reflect a selected note. |
| `src/ui/board-toolbar.js` | Show Delete for a selected note. |
| `index.html` | The Text tool button; the four existing tool buttons go icon-only (labels out, `aria-label` in, `title` and `data-key` kept); `#noteEditor` + its CSS. |
| `src/project/project-save.js` | `notes: clone(state.notes || [])` in `buildProjectSnapshot` (this covers **autosave** too — it shares the snapshot). |
| `src/project/project-load.js` | `state.notes = Array.isArray(s.notes) ? clone(s.notes) : []`. |
| `src/project/history.js` | `notes` in `makeSnapshot` + `restoreSnapshot`, and drop a stale `'note'` selection like the annotation/image guards do. |
| `src/render/export-pdf.js` | `getContentBounds()` unions note boxes; `createExportCanvas` draws notes. |
| `src/render/copy-image.js` | `renderBoardRegionToCanvas` draws notes (this one function also feeds the Excel embedded sketch and the Preview board sheet — one edit, four surfaces). |
| `src/project/autosave.js` | `hasUnsavedWork()` counts notes, so a notes-only board still warns and autosaves. |
| `src/auto/debug-api.js` | `getNotes()`, `addNote()` test hooks — by-name contract, additive. |

Roughly 20 files, all small, no reordering of `source-parts.mjs` beyond two
appended entries.

### Press priority

Today: anchors (Auto) → selected handles → **any endpoint** → line body →
photo → marquee. Proposed, with the note parts inserted:

```text
anchors (Auto only)
  -> selected line's handles
  -> selected note's leader tips / leader-add handle
  -> any line endpoint
  -> note box
  -> line body
  -> photo
  -> marquee
```

Endpoints stay the most precise target and keep winning over a note *box*
(ADR 0050: lines are the work). The selected note's own tiny handles sit above
them, the same privilege `hitTestSelectedHandles` already gives the selected
line. A note box must beat the photo, or a note placed over the sketch would be
unreachable.

### The icon-only toolbar change

Four buttons lose their text labels; the fifth is born without one. Measured
widths: 110/121/116/111 → 64 each (the 64 already includes the `data-key`
badge, which is a `::after` pseudo-element and is unaffected by the label). Net
−202 px, so the row absorbs the new tool and still has slack.

Two things must not be lost with the labels:

- **The accessible name.** Each button keeps its `title` and gains an explicit
  `aria-label`; without a text node, `title` alone is a weak accessible name.
- **The shortcut hint.** `button[data-key]::after` is independent of the label,
  so `S / 0 / C / X / T` survive unchanged.

`scripts/board-toolbar-check.mjs` clicks these buttons by id and asserts nothing
about their text, so it is unaffected — verified by reading it, and it still gets
re-run.

## Implementation order

Each step ends green before the next starts. Steps 1–3 are invisible to the TD,
so a stop after any of them leaves the app shippable.

1. **Model + persistence, no UI.** `state.notes`, `note-model.js`,
   save/load/history/autosave/`hasUnsavedWork`, `getNotes()`/`addNote()` debug
   hooks. Proof: a note injected through the hook survives save → open and
   undo/redo. `npm run check`, `npm run autosave-check`.
2. **Rendering.** `render-notes.js` + the `render()` call. Proof: the injected
   note is visible on the board and in `exportBoardDataUrl()`.
3. **Exports.** `getContentBounds()` unions note boxes and leaders;
   `renderBoardRegionToCanvas` and `createExportCanvas` draw them. Proof: a note
   at the board's edge is not cropped; `getExportAnnIds()` is unchanged;
   `npm run export-hidden`, `npm run preview-check`.
4. **Photo parity.** Notes join the image-drag group and the resize scaling.
   Proof: the new `board-interaction-check` assertions, each first run against
   the previous bundle to confirm it fails there.
5. **Pointer + editor.** Text tool, `#noteEditor`, create / select / move /
   double-click-edit / delete. **Done — and it forced step 7's icon-only change
   to come with it**: measured, the fifth button took the toolbar from 96 px to
   131 px while the other four still carried labels.
6. **Leaders.** Add, drag, double-click-remove, and their share of steps 2–4.
   Done. Their share of steps 2–4 was already paid: rendering, export bounds and
   the photo transforms all took `leaders` from the start, so this step is
   purely the gesture layer plus one deferred render fix (an edited note keeps
   its arrows).
7. **Toolbar.** ~~Icon-only buttons + the Text button~~ (landed in step 5);
   what remains is the re-measure across widths, which `board-toolbar-check`
   already covers.
8. **Docs + harness.** Done. ADR 0052, `TESTING.md`, `docs/TEST_MATRIX.md`,
   `CLAUDE.md`'s suite list, `harness-cli story add` / `decision add`.

### Deliberately out of scope

- Notes in the Measurements panel, the spec table, or any Excel *cell*. They are
  drawing content, not data.
- Rich text, fonts, alignment. One size field, one colour, wrapped text.
- Construction / BOM pages — they have their own callout engines (ADR 0041) and
  are not touched.
- Multi-select and marquee for notes (the marquee stays lines-only in v1).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` — parse, wiring, and the shared-scope rules for two new parts. |
| Integration | `npm run board-interaction-check` — a new section: create → edit → move → the photo-drag carries it → the photo-resize scales it → delete. Every assertion must be run against the **pre-change** bundle first to confirm it actually fails there. |
| E2E | `npm run autosave-check` (notes round-trip), `npm run export-hidden` (a note never changes `getExportAnnIds()`), `npm run preview-check` (the board sheet paints notes), `npm run smoke`, `npm run golden`, `npm run accuracy` — the last three must be **unchanged**: this story adds no anchor, no POM and no detection input. |
| Platform | n/a — single offline page. |
| Release | `npm run board-toolbar-check` (icon-only buttons still clickable by id), the toolbar height re-measured at 1512 px, and a before/after board screenshot. |

The trap to avoid, from US-091: an assertion that merely reads "the note moved"
can pass vacuously if the gesture never opened. Assert the gesture type via
`getInteraction()` and assert the photo actually moved/scaled, exactly as
sections 7b and the draft-carry section do.

## Harness Delta

Turned out larger than predicted: a whole new suite, not just a grown section.
`scripts/notes-check.mjs` is new (`npm run notes-check`, 25 → 174 assertions
across steps 2/3/5/6/audit — sections 7/7e/7e2/8/8a2/8-undo/9 all live here),
registered in `CLAUDE.md` and `docs/TEST_MATRIX.md`'s Evidence Rules;
`board-interaction-check` grew from 73 to 88 checks (this story's section 7c —
photo drag/resize carries notes). The debug API grew `getNotes()`,
`addNote()` and `getNoteHandles()`. Durable records: [ADR
0052](../../../decisions/0052-notes-are-the-boards-third-object.md) and
`harness-cli story add US-092`.

## Evidence

### Step 1 — model + persistence (done)

`state.notes`, `src/manual/note-model.js`, save / load / history / autosave /
`hasUnsavedWork` / `inferNextIdCounter` / `resetWorkingBoard`, and the
`getNotes()` / `addNote()` debug hooks. No UI yet — nothing a TD can see changed.

`autosave-check` grew a Step 7 covering the whole round trip: a pre-US-092 file
opens with no notes; a note carrying newlines, colour, size and a leader survives
`exportProject`, the autosave slot, Undo → Redo, and reload → Restore; and it
never reaches `state.annotations` or the Measurements panel.

Both halves were proved to be able to fail, by breaking the app and re-running:

| Removed | Result |
| --- | --- |
| `notes` from `buildProjectSnapshot` | `FAIL the saved project did not carry the note` |
| `notes` from `makeSnapshot` | `FAIL Redo did not restore the note` |

Restored, rebuilt to the identical bundle hash (`6936d4caf5d1`), and re-run green.

Suites at step 1: `check`, `autosave-check`, `export-hidden`, `smoke`,
`golden` (maxDrift 0.0000 on every fixture), `board-interaction-check` (73/73),
`construction-check` (55/55), `bom-check` (100/100), `preview-check` (58/58),
`mainpage-check` (54/54).

The load-bearing assertion is the Measurements-panel row count: a note that
reached `state.annotations` would be bucketed by `getLabelText()` into an extra
POM row and exported into the spec workbook — the corruption this story exists to
remove.

### Step 2 — rendering (done)

`src/render/render-notes.js` (part 151) plus one call in `render()`. Notes paint
above every line body — a note is a remark **on** the drawing — but below the
anchor layer, so a note can never hide an anchor pin in Auto Mode, and below the
POM-number pass, which still paints last.

**Sizes are world units derived from the note's own `fontSize`, deliberately not
divided by `featureZoom()`.** POM lines and callout numbers do that because they
are review chrome that must hold a constant *screen* size; a note is part of the
drawing and scales with the sketch. That single decision is what will make step 3
free: the export paths redirect the global `ctx` and re-run this same code with no
compensation.

New suite **`npm run notes-check`** (25 assertions), asserting pixels on the real
`#boardCanvas`, never state — `state.notes.length === 1` would pass with the
renderer deleted. It generates its own black fixture image in-page, so unlike
`board-interaction-check` it needs no `demo/` and runs in the public mirror too.

| Measured | |
| --- | --- |
| Text paints where it was put | 1019 red px, region clean beforehand |
| The box keeps text legible over ink | interior rgb 0 → **235** (0.92 white over black) |
| A newline stacks, not stretches | ink 19px → **54px** tall, width held at 111px |
| Identical in Auto Mode | 1019 px in both |

Three negative controls, each run against a deliberately broken build:

| Broken | Result |
| --- | --- |
| the `drawNote` call removed from `render()` | `FAIL the note did not paint: only 0 red px` |
| `drawArrowhead` removed from the leader | `FAIL the leader ends in a line, not an arrow: 2px vs 2px` |
| `wrapNoteLines` ignoring `\n` | `FAIL a newline did not add a line: 19px vs 19px` |

The second control caught a vacuous assertion of **mine**: the first version
checked "blue pixels reach the leader tip", which the bare line satisfies on its
own, so it passed with the arrowhead deleted. It now measures the ink's thickness
*across* the leader just behind the tip against the same leader's shaft — self-
calibrating, and it survives any change to the line width or arrow size.

Restored, rebuilt to the identical bundle hash (`9a8957f70090`), green again.
Regression battery at step 2: `check`, `notes-check`, `autosave-check`,
`export-hidden`, `golden` (maxDrift 0.0000), `board-interaction-check` (73/73).

### Audit before step 3

Steps 1 and 2 were reviewed by five independent lenses (model/persistence,
rendering, missed call sites, test integrity, shared-scope hygiene), each finding
then handed to a skeptic told to refute it. **19 findings judged, 9 survived**,
plus 6 coverage gaps from a completeness critic. Three lenses independently found
the same top defect, which is the strongest signal the exercise produced.

**Fixed — product:**

- **A white note was invisible.** `drawNoteBox` hardcoded a white ground while
  `drawNoteText` painted the glyphs in the note's own colour, and White is a
  first-class board colour whose own tooltip reads *"White line (for dark sketch
  areas)"*. Measured: **0** non-white pixels out of 31410 where the text should
  be, against 3763 for the same note in red. `drawLabel` in
  `render-annotations.js` already guards exactly this for POM numbers. A note has
  a real ground to work with, so it now inverts — dark chip, white text — rather
  than outlining every glyph.
- **`hasContent` in the autosave restore banner did not count notes.** It and
  `hasUnsavedWork()` are a matched pair — one decides whether a record is
  *written*, the other whether it is *offered back* — and step 1 had taught only
  the first. The miss is destructive by design: a false there falls through to
  `clearAutosave()`. **But I could not reproduce the data loss**: `ensureBom()`
  seeds a 12-row BOM at boot, so `s.bom` is truthy in every record this app
  writes and the `clearAutosave()` branch is unreachable today (verified in the
  browser: a fresh boot exports `bom.rows.length === 12`). The fix stands because
  the gate should not depend on an unrelated seeded object — not because a bug
  was demonstrated.
- **The Project Library's "your board will be replaced" prompt was skippable.**
  `library-dialog.js` still derived "is there work here" from
  `state.annotations.length || state.images.length`, having drifted behind the
  identical gate in `project-load.js`, which asks `hasUnsavedWork()`. It now asks
  the same question. This repairs a **pre-existing** data-loss path that has
  nothing to do with notes: a board holding only BOM or Construction work was
  already being replaced with no prompt.

**Fixed — the suite, which the audit showed was weaker than claimed.** Four of
its assertions could pass while the thing they name was broken:

- `meanColor` had no alpha filter, and the board clears to *transparent*, so
  `(0,0,0,0)` reads as black: the "the backdrop is dark" precondition passed even
  if the fixture photo never drew. It now asserts mean alpha > 200 first.
- The white ground was only ever sampled *beside* the glyphs, never behind them —
  which is precisely why the white-note bug slipped through 25 green assertions.
  Replaced by a colour-agnostic legibility measure: the luminance **spread**
  inside the box, run over all four palette colours. Pre-fix, white scores 20
  (min 235, max 255); post-fix, 233.
- The stacking test measured red glyph ink, but `drawNoteText` positions lines
  without ever reading `box.height`, so `noteBounds` could collapse the box and
  the ink would look identical. It now measures the painted **ground**.
- Word wrap — the only thing `boxWidth` does — was never exercised: every fixture
  fit on one line. A long sentence in a narrow box now proves 3+ lines inside the
  requested width.

Also added the missing coverage the critic named: **`resetWorkingBoard`** was the
only landed path that destroys notes and no suite touched it. It now asserts the
notes go and one Undo brings them back.

`notes-check` is 25 → **43 assertions**. The white fix has its own control:
reverting it produces `FAIL a white note is not readable: luminance spread inside
its box is only 20`.

**Deliberately not changed** (recorded so the next reader does not re-raise them):

- `project-load.js` still picks the reopen mode from `annotations.length` alone,
  so a notes-only project reopens in Auto. The Auto-first contract asks "has this
  sketch been measured yet?", and notes do not answer that question. Revisit at
  step 5, when the Text tool makes "reopened where I cannot edit my notes" real.
- `wrapNoteLines` collapses whitespace runs and drops leading indentation when it
  renders (the stored text round-trips byte-exact). Every wrapper in this codebase
  does this, including the Construction and BOM engines; consistency wins.
- `setAppMode` does not clear a `'note'` selection. Nothing can select a note
  until step 5 — it lands with the selection model, not before it.

Ten findings were refuted, including two that sounded serious: `scaleNoteAbout`'s
clamps making a photo resize irreversible (they cannot bite between 5 and 200 px),
and `normalizeNote`'s `state.idCounter++` fallback racing the restore order.

### Step 3 — exports (done)

Notes now ship in the tech pack. Three edits:

- `getContentBounds()` unions `noteOuterBounds(note)` — box **and** leader tips,
  so a note beside the sketch widens the frame instead of being cropped.
- `drawBoardContentForExport()` — **one** definition of what an export paints and
  in what order, replacing the two hand-kept copies in `export-pdf.js` and
  `copy-image.js`. It covers four surfaces at once: Export PDF, Copy Image, the
  Excel embedded sketch, and the Preview board sheet.
- `exportNotes()` beside `visibleExportAnnotations()`. Every note exports — notes
  have no hide toggle, because the spec panel's × hides a POM row and a note is
  not a POM — but a future per-note toggle now has one place to land.

**The export z-order changed, and it was worth measuring rather than assuming.**
The live board draws all POM numbers last so a line can never cover one; the
export drew each line *with* its own number, so it could. Making them match is a
two-pass loop. Measured, with the same two-line fixture rendered on both builds:

| Fixture | Old order | New order |
| --- | --- | --- |
| Two lines apart — no line crosses a number | `4cbd8c08:19530` | `4cbd8c08:19530` — **byte-identical** |
| Line 2 crossing line 1's number | `e34fde4d:13606` | `d92e53a8:13714` — **differs** |

So an ordinary board's export is unchanged to the byte; output moves only where a
line crossed a callout number, which is exactly the clutter the screen renderer
was already fixed for. (The auto pipeline could not be driven from the plain
preview URL for this — the view-roles modal blocks without a recognized `?contract=`
param — so the fixture was built synthetically, which isolates the question better
anyway.)

`notes-check` gains a section that decodes the exported PNG and reads its pixels:
a note placed clear of the photo lands in the export (**+1818** blue px) and grows
the frame **897 → 1215 px**, while `getExportAnnIds()` is untouched. Two controls:

| Broken | Result |
| --- | --- |
| `noteOuterBounds` dropped from `getContentBounds` | `FAIL the export frame did not grow (897px -> 897px) — it would be cropped` |
| `drawNote` dropped from the export painter | `FAIL the earlier blue fixture is missing from the export` |

47 assertions, up from 43. PDF is not asserted directly (it downloads a file);
it shares `drawBoardContentForExport` with Copy Image, which is asserted, and the
Preview board sheet is covered by `preview-check`.

### Step 4 — the note rides with its sketch (done)

`moveNote` and `scaleNoteAbout` existed since step 1 with nothing calling them.
They are now wired into the same two transforms US-089 and US-091 hardened:
`startImageDrag` collects `groupedNoteIds` beside `groupedAnnotationIds`, and
both resize paths call `scaleNotesForImageResize` beside
`scaleAnnotationsForImageResize`.

**The one real design question was which notes belong to a sketch.** A line
answers with its midpoint, and a note's box centre is the obvious analogue — but
a note has a second, stronger claim a line does not: its **leader**. The
commonest way a TD writes one is to park the text in the white space beside the
sketch and point an arrow at the detail, which puts the box centre *outside* the
photo. Under a box-centre-only rule that note sits still while the sketch moves
out from under its arrow — the exact detachment US-089/US-091 fixed for lines,
reintroduced by the feature meant to annotate them. So the rule is: **box centre
inside the bounds, OR any leader tip inside them.** A note pointing into two
photos follows whichever is dragged (honest answer to an ambiguous question),
and a group drag de-duplicates through a `Set`.

No `measureScale` counterpart: a note carries no measurement, so scaling it
restates nothing. That asymmetry with `scaleAnnotationsForImageResize` is the
point, and the code says so.

`board-interaction-check` gains section 7c with **two** fixtures — one written on
the photo, one beside it with a leader — driven through real
mousedown/mousemove/mouseup, asserting the gesture type first so it cannot pass
vacuously:

| | Measured |
| --- | --- |
| Photo dragged | +42.1 world units; both notes and the leader tip follow to within 0.5 |
| Photo resized | ×1.2538; both notes land on the scale-about-the-anchor prediction to within 1.5, and font size and wrap width both scale ×1.2538 |

Three controls, each on a deliberately broken build:

| Broken | Result |
| --- | --- |
| the `groupedNoteIds` move loop | `FAIL the inside note did not travel: photo moved 42.08, note moved 0.00` |
| `scaleNotesForImageResize` | `FAIL the inside note did not scale about the photo's anchor: expected (465.0, 280.1), got (434.8, 275.1)` |
| the leader rule (box centre only) | `FAIL the **outside** note did not travel with the photo` — and the on-photo note still passes |

That third control is the one worth keeping: it isolates the leader rule and
shows it is load-bearing rather than decorative.

`board-interaction-check` is 73 → **88 assertions**.

### Step 5 — the pointer layer and the editor (done)

The first step a TD can see. The Text tool (`T`, Manual only), the `#noteEditor`
overlay, and create / select / move / double-click-edit / restyle / delete.

**Step 7's icon-only change had to be pulled forward, and is done.** The plan
predicted this and it measured true: with the four tool buttons still labelled,
adding the fifth took the toolbar from **96 px to 131 px** — a whole extra row.
Dropping the labels takes each button from 110/121/116/111 px to **64 px**, and
the toolbar returns to exactly **96 px** with all five tools on one row. Every
button keeps its `title` and its `data-key` badge (a `::after` pseudo-element,
unaffected by the label) and gains an explicit `aria-label`, because with no
text node `title` alone is a weak accessible name. Shipping step 5 without this
would have left the toolbar visibly worse between steps. What remains for step 7
is the re-measure at other widths, which `board-toolbar-check` already covers.

Four decisions worth recording, each with a reason that is not obvious from the
diff:

1. **The click-away commit is owned by `onMouseDown`, not by `blur`.** A focus
   change is the *default action* of mousedown, so `blur` arrives **after** the
   canvas handler. If the same press were allowed to also place the next note,
   the late blur would commit the *new*, empty session and close the editor the
   TD had just opened. So a press on the board while an editor is open finishes
   that note and does nothing else — one extra click to place a second note,
   bought for a deterministic editor. The blur listener still covers every other
   way focus can leave (toolbar, Tab, window). The control that removes this
   guard fails with `the click on the board did not close the editor`.
2. **A new note is born at a constant SCREEN size**, `NOTE_DEFAULT_FONT_SIZE /
   zoom`, and is world geometry from that moment on. Without it a note placed on
   a zoomed-out board is written at a few pixels and reads as broken; the control
   that removes it produces `32.7px on screen` where 16 was asked for.
3. **Enter inserts a newline; ⌘/Ctrl+Enter or a click away commits.** The
   opposite of `#labelEditor`, whose Enter commits — because a POM label is one
   short token and a note is prose. That difference is the entire reason the note
   editor is a `<textarea>` and a separate part.
4. **Emptying a note deletes it.** The alternative is an empty box the TD then
   has to find, select and delete. One history step, so Undo brings the text
   back.
5. **Re-opening a note puts the caret at the END, not select-all.** The label
   editor selects all, and is right to: a callout label is one short token,
   almost always being replaced. A note is prose, and re-opening one is nearly
   always to fix a word or add a line — select-all there means the next
   keystroke silently destroys a paragraph the TD wrote.
6. **The editor inverts for a white note**, exactly as the renderer does. This
   is the step-2 audit bug one layer up, and worse: there the TD saw a blank
   chip afterwards; here they would be typing into an invisible field. Measured
   for all four swatches as the luminance gap between the editor's own computed
   ink and ground — 161 / 159 / 231 / 231.

**Press priority, both halves measured.** A note box beats the *line body* and
the *photo* — it is an opaque filled box, so a line under it is not visible to
aim at, the same reason `hitTestAnnotations` already skips hidden lines, and it
must beat the photo or a note written on the sketch could never be picked up.
It loses to any line **endpoint** (ADR 0050 — lines are the work).

`notes-check` gains section 7, **47 → 106 assertions**, all driven with real
`MouseEvent`s on `#boardCanvas`. It rebuilds a clean board first: a priority
claim measured on the crowded board the earlier sections leave behind proves
nothing.

Two of my own assertions were caught vacuous and fixed rather than kept:

- the arming check drove **no `mousemove` at all**, so nothing could move whether
  armed or not. With 1.2 world px of jitter added — inside the 3 px grace — the
  control that removes arming now fails with `the SELECTING press moved the note
  (313.26 -> 314.24)`.
- the export-chrome check compared two exports **against each other**, which
  cannot see chrome drawn for *every* note. It now also counts `#356dff` pixels
  in the decoded PNG, and both variants of the bug fail (993 px for all-notes,
  308 px for selected-only).

The endpoint fixture also had to be rebuilt: run horizontally, the note box sat
on the line's callout number and the press opened a **label drag** — the
documented priority working correctly on an ambiguous fixture. The line is now
vertical, keeping the label 0.2 × height clear of the box.

| Control (deliberately broken build) | Result |
| --- | --- |
| note branch removed from the press chain | `FAIL a press on the note box did not open a note drag: {"type":"marquee"…}` |
| note box tested **before** any line endpoint | `FAIL the line endpoint under the note box was unreachable` |
| zoom compensation removed from a new note | `FAIL a new note was not born at the default SCREEN size: 32.7px` |
| click-away guard removed from `onMouseDown` | `FAIL the click on the board did not close the editor` |
| arming removed from the note drag | `FAIL the SELECTING press moved the note (313.26 -> 314.24)` |
| note branch removed from `deleteSelected` | `FAIL Delete did not remove the selected note: 2 -> 2` |
| emptying a note no longer removes it | `FAIL emptying a note's text did not remove it: 2 -> 2` |
| selection chrome painted for every note in the export | `FAIL … 993 select-coloured px unselected` |
| selection chrome painted for the selected note only | `FAIL … 0 unselected, 308 with the note selected` |
| the four tool labels put back (icon-only reverted) | `board-toolbar-check: FAIL 1440px toolbar exceeded two rows: 131px` |
| the editor centred like `#labelEditor` | `FAIL the committed note did not land where the editor was: offset (110.0, 27.5) px` |
| the white editor kept a light ground | `FAIL typing a white note is invisible: only 0 luminance between the editor's text and its own background` |
| the re-opened note pre-selected its text | `FAIL re-opening a note pre-selected its text (caret 0..23 of 23)` |

That last one is worth noting for what it says about the suite rather than the
code: `board-toolbar-check` already carried a "toolbar stays within two rows"
guard, and it catches the labelled-button overflow on its own. The icon-only
change is therefore proven necessary by the harness, not only by a hand
measurement. The same suite's empty-Manual assertion did have to change — it
counted buttons (`9 direct buttons, got 10`), which is true but does not say
WHICH control appeared, so it now compares the exact id **set**. The Text tool
belongs there: a note needs no photo, so it is an authoring entry point exactly
like Straight and Curved, and the three claims that section really makes (no
line settings, no selection actions, no Export on an empty board) are asserted
separately and unchanged.

The audit item deferred from step 3 is closed here: `setAppMode('auto')` now
clears a `'note'` selection and commits any open editor, which only became
reachable once a note could be selected at all.

**One line of step 5's file table is NOT implemented, and needs a decision.**
`src/manual/ui-status.js` was to make "the colour/size chips reflect a selected
note". Colour is done — the swatch shows the note's own colour and a click on
another retints it. **Size is not**: there is no size control for a note
anywhere yet, so a TD can only change a note's type size by resizing the photo
under it. The plan's out-of-scope section implies one ("Rich text, fonts,
alignment" are out; "one size field, one colour, wrapped text" are in), but
neither the acceptance criteria nor step 5's own brief name it, and the obvious
home — the `Line: 2.0` width field — means something else. Two options, both
small, and the choice is the TD's:

- a dedicated size chip that appears only with a note selected (or with the Text
  tool active), leaving the line-width field alone; or
- reuse the line-width field, retitled per selection kind — fewer controls, one
  more overloaded meaning.

**Resolved 2026-08-20** — see "The note's own size control" under the
independent-audit section below: the TD chose a dedicated chip, kept separate
from `#lineWidthChip`.

Still deferred, deliberately: the reopen-mode predicate in `project-load.js`
still asks "does this project have applied lines", so a notes-only project
reopens in Auto. That is the Auto-first contract answering the question it was
built to answer, and notes do not answer it. Revisit only if a TD reports it.

### Step 6 — the arrows become interactive (done)

`leaders` has existed since step 1, rendered since step 2, shipped in exports
since step 3 and travelled with its photo since step 4 — but only a debug hook
could put one there. Step 6 is the gesture: a **+** handle at the note's
bottom-right that pulls a new arrow out, a grab handle on each tip, and
double-click-a-tip to remove that one arrow.

**Two hit-tests, not one.** The plan sketched a single `hitTestNotes` returning
`'box' | 'leader' | 'leader-add'`, but the press priority it also specifies puts
the note's *handles* above every line endpoint and the note's *box* below them.
That is two different privileges, so it is two functions —
`hitTestSelectedNoteHandles` (selected note only, early, mirroring
`hitTestSelectedHandles` for lines) and the existing `hitTestNotes` (any note,
after the endpoints). It reads the same way the line code already does.

**Handles are selected-only**, matching exactly where they are drawn. A
grabbable target that is never painted is worse than one that asks for a click
first — and unlike the US-086 endpoint case, missing one costs nothing: the
press falls through to a marquee, not to a silent geometry change.

**The arrow is created on the frame the drag ARMS, not on the press.** A stray
click on the + handle otherwise leaves a zero-length arrow pointing at the
note's own corner, plus a history entry.

**A tip drag carries the same grab offset the line endpoints use.** The catch
radius is 11 screen px, so without it an arrow caught 10px off its tip teleports
to the cursor on the first move — and where the arrow points *is* the content of
the gesture.

**A note open in the editor keeps its arrows** (the box and text are still
suppressed, since the textarea is showing them live). This closes the item step
5 left open: the arrows are not chrome, they say what the note points at, which
is what the TD is looking at while deciding what to write.

`notes-check` gains section 8, **106 → 142 assertions**.

Three things this section had to learn, all recorded so the next reader does not
re-derive them:

- **Aim through `getNoteHandles`, never through `pos + boxWidth`.** The box
  shrink-wraps to the measured text: this fixture's box is 98.6 world px wide
  where `boxWidth` says 150. Computed by hand, the + handle lands 50px into
  empty canvas.
- **Offsets are SCREEN pixels over zoom.** The first draft grabbed a tip "8 units"
  off it in WORLD units against an 11 SCREEN px radius — a 17.8px miss. The miss
  then selected the photo, so the *next* press dragged the sketch, which carried
  the note and its arrow along (US-089 working exactly as designed) and read as a
  leader bug. Two probes and a browser measurement to unpick.
- **Select the note before measuring either side of an edit.** Selecting reveals
  the contextual toolbar row and shortens the canvas ~35px (US-088). Do that
  between two samples and the second falls off the canvas and reads 0 — which
  looks precisely like "the arrow vanished".

**A false positive the suite raised, and the tolerance that fixes it.** Section
8g reported 43 select-coloured pixels in the export. Measured in the browser, the
count was *identical with the note selected and deselected* (274 at the original
tolerance) and the pixels read (69,122,238) — the Blue swatch `#2563eb`
antialiased toward white, which lands inside an 18-per-channel window of
`SELECT_COLOR` `#356dff`. The detector was wrong, not the code. At tolerance 6
the two separate cleanly (blending blue toward white lifts green into range only
around 10% white, where the blue channel is still ~237 against the 255 the
select colour needs), and both chrome controls still fail there — 1178 px for
all-notes chrome, 397 for selected-only — so the tightening did not buy the pass
with vacuity.

| Control (deliberately broken build) | Result |
| --- | --- |
| selected-note handle branch removed | `FAIL dragging the + handle did not open a new-leader drag: {"type":"marquee"…}` |
| arrow created on the press, not on arming | `FAIL a click on the + handle created an arrow: 1 -> 2` |
| grab offset dropped from the tip drag | `FAIL the tip did not track the pointer 1:1: expected (-40, -30), got (-38.2, -31.8)` |
| double-click no longer removes a tip | `FAIL double-clicking a tip removed 0 arrows, not exactly one` |
| `removeNoteLeader` drops the LAST arrow | `FAIL double-click removed the WRONG arrow` |
| handles grabbable on any note | `FAIL an unselected note's tip was grabbable` |
| edited note loses its arrows | `FAIL the arrow vanished while its note was being edited: 90 -> 30 blue px` |
| handles painted into the export | `FAIL … 1178 select-coloured px` |
| chrome for the selected note only (tol 6) | `FAIL … 0 unselected, 397 with the note selected` |

The second row is a repeat of a step-5 lesson I failed to apply here first time:
the stray-click assertion drove **no `mousemove` at all**, so deleting the arming
check still passed. With 2 screen px of jitter added — inside the 3px grace — it
fails correctly.

### Independent audit (2026-08-20) — 8 confirmed, 4 fixed, 4 test gaps closed

"kiểm tra lại" — an independent re-verification, run as a 5-lens Workflow
audit (press-chain / data-lifecycle / editor-lifecycle / render-export /
test-quality) over the whole of steps 5–6, each finding adversarially
verified by a second agent before being trusted. 9 raw findings, 8 confirmed,
1 refuted.

**Refuted, and worth recording why:** deleting a photo leaves its notes/leaders
in place at their old world position rather than removing them. The finding
called this a bug contradicted by the code's own intent; it isn't — it is the
SAME behaviour POM lines already had before notes existed (`deleteImageById`
never touched `state.annotations` either), stated explicitly in `note-model.js`
("the two transforms that carry board content with its photo have to carry
notes explicitly" — naming only drag and resize, not delete) and in this very
doc's Design Notes. `positionNoteEditor`'s comment about "a photo delete that
took it along" is loose defensive phrasing about a hypothetical, not a
contract, and it doesn't override two contemporaneous, explicit design
statements that say the opposite.

**Four confirmed BEHAVIOUR bugs, fixed and pinned (`notes-check` section 9,
+30 assertions):**

1. **Creating a note never selected it.** Every other creation gesture in this
   codebase selects what it just made (`handleDrawToolClick` does, for every
   line) — `commitNoteEditor`'s create branch didn't. Since the Text tool
   deliberately stays active after a commit and `setTool` never clears a
   stale selection, a TD who had a POM line selected, switched to Text to jot
   a remark, and pressed Delete to tidy up got the OLD LINE deleted instead of
   the note they just wrote — recoverable via Undo, but with nothing on
   screen to say the wrong object went away. Fix: `commitNoteEditor` now calls
   `setSelection('note', note.id)` on create, matching the line-drawing
   convention.
2. **Group photo resize double-scaled a note whose leader spans two grouped
   images.** `resizeImagesFromCorner` used to decide membership and apply the
   scale PER IMAGE, in one pass. `notesWithinBounds`' membership rule (box
   centre in bounds OR any leader tip in bounds) makes it ORDINARY — the
   commonest way a TD writes a note, not a contrived edge case — for a note
   captioning one grouped photo with its arrow pointing at a neighbour to
   qualify under BOTH images' bounds at once. Every grouped image tracks the
   same shared factor, so a double-claimed object was scaled twice per frame,
   compounding toward the SQUARE of the intended factor over a drag — measured
   on the reverted build: expected × factor put the note at x=373.6, the bug
   put it at x=388.9, and 388.9 is the squared prediction to the first decimal.
   Fix: `resizeImagesFromCorner` now snapshots every grouped image's
   pre-mutation bounds, unions the claimed annotation/note ids into two Maps
   BEFORE moving any image, then scales each claimed object exactly once — the
   resize counterpart of the `Set` `startImageDrag` already uses for a group
   PAN. `scaleAnnotationAbout` was split out of `scaleAnnotationsForImageResize`
   (viewport.js) to make this possible without duplicating its per-annotation
   logic.
3. **Double-click bypassed the Auto-Mode note lock.** `onDoubleClick` had no
   `state.appMode` check at all, while `onMouseDown`'s Auto-Mode branch never
   reaches a note hit-test — so a genuine double-click (or a touch double-tap)
   could open the live `#noteEditor` over a read-only Auto Mode board, and an
   empty commit from there deleted the note even though `deleteSelected()`
   explicitly refuses to while `state.appMode` is `'auto'`. Fix: both note
   gestures in `onDoubleClick` (remove-a-tip, edit-the-text) now sit behind
   `if (state.appMode !== 'auto')`, matching the single-click lock.
4. **Selection chrome froze at the pre-edit box instead of hiding.** The dashed
   outline and both leader-handle kinds are derived from `noteBounds(note)`,
   which reads `note.text` — written only on commit, never while typing. So
   this chrome sat frozen at the OLD box while the textarea grew or shrank
   under it: a stale outline, and handles left floating detached (note
   shrank) or buried under the textarea (note grew) — inert either way, since
   any mousedown while the editor is open commits and returns before any
   hit-test runs. Fix: `render-loop.js` now also skips `drawNoteSelection` for
   the note in `state.noteEditor.id` — hidden, not tracked, which is simpler
   and more honest than making dashed canvas chrome follow a live DOM
   textarea's measured size.

**Four confirmed TEST-QUALITY gaps, closed:**

5. Section 7e's own vacuousness guard (`boxCoversEndpoint`) was a tautology —
   substituting the note's `pos` (constructed a few lines up as `b.x-30,
   b.y-16`) into the guard collapses it to `30>0 && 30<200 && 16>0 && 16<40`,
   true regardless of what the real rendered box measures. Section 8's own
   comments warn against exactly this pattern ("aim through `getNoteHandles`,
   never through `pos + boxWidth`"); 7e just hadn't followed its own sibling's
   rule. Fixed to read the real box via `getNoteHandles`.
6. Nothing proved the OTHER half of the note-vs-endpoint priority: that a
   SELECTED note's own leader tip/leader-add handle beats a nearby line
   endpoint (the design's stated priority, and the reason the hit-test had to
   be split into two functions in the first place). Added 7e2: drop a leader
   exactly onto a line's endpoint, press there, confirm the note's handle
   wins. Control (endpoint check moved ahead of the note-handle check):
   `FAIL a leader tip sitting exactly on a line endpoint lost to the endpoint`.
7. Every add-handle press in section 8 landed at the exact `{x,y}`
   `getNoteHandles` reports — distance 0, which passes for any positive
   radius including a badly regressed one. 8c already proved the TIP's catch
   radius was real by grabbing off-centre; the add handle never got the same
   treatment. Added 8a2, self-cleaning via Undo. Control (radius shrunk to
   2px): `FAIL a press 4 screen px off the + handle's centre missed it`.
8. No test pressed Undo/Redo right after a pointer-driven leader CREATE or
   DRAG — 8d's Undo exercises `removeNoteLeader`'s own direct
   `pushHistoryIfChanged()` call, a different code path from the generic
   `changed → fingerprint-diff → pushHistoryIfChanged()` plumbing the two drag
   types rely on, and which — uniquely among all drag branches — sets
   `interaction.changed = true` unconditionally rather than gating on
   `dx || dy`. Added 8a-undo and 8c-undo. Control (leader drags never mark
   history changed): the suite crashed with a TypeError reading `.leaders` off
   `undefined` — Undo, with no entry to undo, walked the history back past
   the note's own creation. A hard crash is a stronger failure than a clean
   assertion, not a weaker one.

**One accidental self-inflicted false positive, caught before it shipped.**
Fixing bug 4 (hiding chrome while editing) broke 8f's own "arrows survive
editing" check: 90 → 73 px. Diagnosis: 8f measured "before" while the note was
SELECTED, and the tip's own grab-handle circle (`SELECT_COLOR` `#356dff`) sits
in the exact sampled region — close enough to the blue swatch `#2563eb` to
fall inside the probe's 26-per-channel tolerance. So the "before" sample was
partly counting chrome as ink, and "during" only matched it by accident,
because the bug being fixed meant stale chrome was STILL there during editing
too. Fixed by deselecting before measuring "before", so both samples are pure
arrow ink; now reads 73 → 73.

**One fixture mistake in my own new tests, caught before it shipped.** The
first draft of the group-resize regression test (9b) tried to reposition the
two fixture photos by assigning `imgs[0].x = 0` etc. on the object
`getImages()` returned — which is a clone (deliberately, so a test can read
the board without racing the render loop), so the assignment was a silent
no-op and the images stayed at their auto-placed default positions. The note
and its leader ended up somewhere unrelated to the intended photo bounds, and
the test failed with a scaled value that matched neither the single-factor
nor the squared prediction. Fixed by reading the images' real positions from
`getImages()` and placing the note/leader relative to THOSE, plus an explicit
`dualClaim` guard (box centre in photo A, leader tip in photo B) so the
fixture can never silently degrade into single-claim and stop testing the bug.

`notes-check` is now 142 → **174 assertions**. All four behaviour fixes and
three of the four test-gap fixes were proven against deliberately-reverted
code (the tautology fix, 5, needed only the algebraic proof above — the check
literally cannot fail, with or without a live control).

### The note's own size control (change request, 2026-08-20)

Resolves the size-field decision step 5 left open. TD chose "add a dedicated
size chip" over "reuse the Line-width field, retitled" — a note has no line
thickness and a line has no font, so overloading one control's meaning was the
worse of the two options once there was a real choice to make.

`#fontSizeChip`/`#fontSizeInput` sits beside `#lineWidthChip` in the drawing
toolbar group, wired exactly like it: `state.noteFontSize` is the note's own
`state.lineWidth` — a sticky preference persisted with the project, history,
and autosave (same three files, same pattern: `state.js`, `project-save.js`,
`project-load.js`, `history.js`). `getActiveNoteFontSize()` /
`setNoteFontSize()` / `applyFontSizeToSelectedNote()` mirror
`getActiveLineWidth()` / `setLineWidth()` / `applyToSelectedAnnotation()`
line for line. Visibility (`ui-status.js`) is the one new predicate: shown for
the Text tool or a selected note, hidden for a selected line — the two chips
are never both visible, matching the single-kind selection model that already
makes colour retinting a note vs. a line branch cleanly in `setDrawColor`.

**The one real subtlety, and it produced a genuine bug before this shipped.**
A note's *stored* `fontSize` is world px, deliberately compensated for the
zoom at creation time (`newNoteWorldFontSize`, step 5's "born at a constant
SCREEN size" decision) — so the chip's number is a SCREEN-px target, not the
same unit as the field it eventually becomes. The first version of this change
wired the chip's read/write for a *selected* note correctly (that path mutates
`note.fontSize` directly, already in world units, no conversion needed) but
never actually connected `state.noteFontSize` to `newNoteWorldFontSize()` —
new notes kept using the hardcoded `NOTE_DEFAULT_FONT_SIZE` constant no matter
what the chip said. Caught by hand in the browser before it reached a test:
set the chip to 33 with nothing selected, place a note, and its `fontSize`
came back `15.6`, matching the OLD default (16) divided by zoom, not 33.
Fixed by one line in `newNoteWorldFontSize()` — read `state.noteFontSize`
instead of the constant, still divided by zoom. The regression test for this
(`notes-check` 10c) asserts the ZOOM-COMPENSATED value (`33 / zoom`), not the
literal 33 — asserting the literal would have been the exact `pos + boxWidth`
mistake section 8's own comments warn against, one unit over, and the first
draft of the test made exactly that mistake before the manual browser check
surfaced the real bug underneath it.

Three controls, each on a deliberately reverted build:

| Broken | Result |
| --- | --- |
| `newNoteWorldFontSize` reverted to the hardcoded constant | `FAIL a new note was not born at the chip's sticky default converted for zoom: expected ~16.326 world px…, got 7.915773864689526` |
| chip visibility forced to always-hidden | `FAIL the size chip stayed hidden with the Text tool active` |
| `applyFontSizeToSelectedNote` reverted to a no-op | `FAIL the chip did not write the selected note's fontSize: 7.915773864689526 -> 7.915773864689526` |

`notes-check` is now 174 → **188 assertions**.
