# 0052 — Notes are the Board's third first-class object

## Status

Accepted — 2026-08-20.

## Context

A TD needs to put free text on the Board — a remark for the factory, a
reminder to self, a label pointing at a detail — that is explicitly **not** a
measurement. Today there is a way to type text onto the Board, and it is
actively harmful: drawing a single-arrow line and double-clicking its label
writes into `ann.text`, which is the *same* field a POM line's own label
lives in.

- `getLabelText(ann)` falls back from `ann.text` to `ann.seq`, so a typed line
  becomes an annotation whose POM key is the typed sentence.
- `renderSpecPanel` buckets annotations by that key and renders anything
  outside 1–18 as an extra spec row.
- `state.deletedPomKeys` then remembers that sentence as a deleted POM key
  once the line is removed.
- The same key flows into the Excel export.

So the only free-text path corrupts the deliverable it is meant to annotate.
Removing the incentive to (mis)use it means giving the TD a real one.

## Decision

**A note is a new kind of Board object — `state.notes[]` — held apart from
`state.annotations`, alongside POM lines and photos as the Board's third
first-class kind of content.**

```js
// state.notes — Board text notes. World coordinates, like annotations.
{
  id, text, pos: { x, y }, color, fontSize, boxWidth,
  leaders: [],   // 0+ world points, each drawn box-edge -> point + arrowhead
}
```

Four sub-decisions, each forced by a place a note could otherwise have been
folded into something that already exists, and each rejected for a specific
reason:

1. **Its own array, not a flag on `state.annotations`.** The spec panel,
   tolerance check, grading, the Excel table, and `deletedPomKeys` all derive
   from `state.annotations` by label — anything living there is measurement
   data by construction. A note that is *not* a measurement needs to live
   somewhere those derivations never look, not somewhere they have to be
   taught to skip.
2. **World coordinates, not normalized-to-an-image.** Anchors and the
   Construction/BOM callouts normalize to their owning image and get carried
   for free — but they *require* an owner, and a note pinned in blank space
   beside the sketch (a title, a general remark) has none. World coordinates
   match how `state.annotations` already works, so a note joins the two
   transforms US-089/US-091 already hardened (drag carries it, resize scales
   it) instead of inventing a third geometry rule for the Board to maintain.
3. **A leader is an arrow, not a numbered pin.** `ccDrawCallout` (Construction
   / BOM) fills a circle at its target and writes the row's sequence number
   into it. A Board note is not a row in any table, so it carries no number —
   line + arrowhead, and stop. This is one more reason the Board keeps its
   own renderer rather than reusing `ccDrawCallout` (ADR 0041 already settled
   that these engines stay parallel).
4. **Manual Mode authors notes; both modes render them.** `setTool` keeps
   refusing every non-select tool in Auto, so a note cannot be created or
   edited there — but a note already on the board is board content, exactly
   like an applied POM line, and stays visible when the TD switches back to
   Auto to re-run detection.

## Alternatives Considered

1. **Reuse `ann.text` on a line, formalized.** Rejected — this is the
   corruption the story exists to remove; formalizing it would still leave
   every free-text remark as a phantom spec row.
2. **A numbered callout pin, matching Construction/BOM.** Rejected — a note
   has no row to number, and pretending it does invites the spec panel or the
   Excel exporter to try to bucket it as one, reopening the exact defect this
   decision closes.
3. **Normalize a note to its nearest image, like an anchor.** Rejected — a
   note has no image to be nearest to until one exists on the board, and a
   note titling the whole sketch (not any one photo) is a real, common case.

## Consequences

Positive:

- The only free-text path on the Board no longer touches measurement data;
  `getExportAnnIds()`, `state.deletedPomKeys`, and the spec panel's row count
  are all provably unaffected by a note's existence (`notes-check`,
  `export-hidden`).
- A note travels with its photo exactly as a POM line does — `startImageDrag`
  and both resize paths were extended, not duplicated, by reusing the same
  grouped-id-`Set` shape US-089 established for lines.
- Notes print: `drawBoardContentForExport()` became the **one** definition of
  what an export paints, replacing two hand-kept copies in `export-pdf.js`
  and `copy-image.js`, so Export PDF, Copy Image, the Excel embedded sketch,
  and the Preview board sheet all gained notes from a single edit.

Tradeoffs:

- **A fifth toolbar button had no room.** Measured at 1512px, one new
  labelled button took `#boardToolbarGroups` from one row (38px) to two
  (74px) in the *unselected* state — a permanent cost on every TD's screen,
  not just a selection-time reflow like ADR 0051's finding. Resolved by
  making all five drawing-tool buttons icon-only (each keeps `title`, gains
  an explicit `aria-label` since a bare icon has no other accessible name,
  and keeps its `data-key` shortcut badge unchanged). Net −202px let the row
  absorb the fifth tool and return to 38px, one row — `board-toolbar-check`'s
  existing "two rows" guard independently proves this was necessary, not just
  measured by hand.
- **The press-priority chain grew two more links**, both privileged above a
  plain line endpoint's neighbors but below the endpoint itself: a selected
  note's own leader handles (mirroring the selected line's handles), and any
  note's box (beating the line body and the photo, so a note written on the
  sketch stays pickable, but still losing to a line endpoint per ADR 0050 —
  lines are the work).
- **The membership rule for "which notes belong to this photo" is an OR, not
  the box-centre rule a line uses**: box centre in bounds, OR any leader tip
  in bounds. A note is commonly parked beside a photo with its arrow pointing
  into it, which puts the box outside the very bounds a centre-only rule
  would check — a box-centre-only rule would leave that note behind mid-drag,
  reintroducing the class of bug US-089/US-091 fixed for lines, in the
  feature meant to annotate them. The cost of the OR is that a note can
  legitimately be claimed by two grouped photos in a group resize — an
  ordinary case, not a contrived one — which had to be de-duplicated
  explicitly (see "Independent audit" below).
- Roughly 20 files touched, all small, two new parts appended to
  `scripts/source-parts.mjs` (no reordering).

## Independent audit (2026-08-20)

After the pointer/editor/leader gesture layer landed, an independent 5-lens
audit (press-chain, data-lifecycle, editor-lifecycle, render-export,
test-quality) found and fixed four behaviour bugs that this decision's own
sub-decisions made possible, and closed four coverage gaps in the tests that
should have caught them:

- Creating a note never selected it, so Delete right after typing one could
  remove a stale prior selection instead — fixed by selecting on create,
  matching every other creation gesture in the codebase.
- A group photo resize scaled a dual-claimed note (sub-decision 4's OR rule)
  once per claiming image instead of once total, compounding toward the
  *square* of the intended factor — fixed by de-duplicating claimed ids
  before scaling, the resize counterpart of the `Set` group drag already
  uses.
- Double-click bypassed the Auto-Mode lock that single-click already
  honoured, reaching the live editor (and an empty-commit delete) over a
  read-only board — fixed by gating both double-click note gestures on
  `state.appMode`.
- Selection chrome froze at the pre-edit box instead of hiding while a note
  was being typed — fixed by hiding it for the note currently in the editor.

Full evidence, negative controls, and the two self-caught test mistakes made
while building the fixes are in
[US-092](../stories/epics/E01-manual-mode/US-092-text-notes-on-the-board.md#independent-audit-2026-08-20---8-confirmed-4-fixed-4-test-gaps-closed).
`notes-check` carries all of it: 25 assertions at first render, 174 after this
audit.

## Follow-Up

- **Resolved 2026-08-20.** A dedicated size chip (`#fontSizeChip`) was added,
  mirroring `#lineWidthChip` — the TD's own choice over reusing the line-width
  field. See US-092's "The note's own size control" section for the fix, the
  bug it caught (a new note's stored size never actually read the chip's
  preference until one line in `newNoteWorldFontSize` was corrected), and the
  three negative controls that proved it.
- `project-load.js`'s reopen-mode predicate still asks "does this project
  have applied lines", so a notes-only project reopens in Auto Mode.
  Deliberately deferred; revisit only if a TD reports it as a problem.
