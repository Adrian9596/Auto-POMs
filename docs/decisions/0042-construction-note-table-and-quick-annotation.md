# 0042 Construction: live note table below the canvas + quick annotation

Date: 2026-08-16

## Status

Accepted

## Context

Following up on the Construction feature audit (a three-agent research pass
comparing this tool's Construction page against the `construction-tech-pack`
workspace at `Tech pack Output/` and real factory tech-pack PDFs — see the
session that produced this ADR), the TD asked for two things (Vietnamese):
*"tôi muốn phần construction hiện tại có bảng để paste ảnh và annotation, còn
có bảng construction bên dưới, có thể annotation nhanh, smart"* — the image +
annotation board already exists (the canvas); the ask is a construction
*table* below it, plus faster/smarter annotation.

Three concrete product questions were resolved with the TD before building
(via AskUserQuestion):

1. **Table source** — auto-derived from pinned notes (not a second data
   entry surface, not a pinned/table-only split). Zero note-schema change.
2. **"Smart"** — continuous add (Add Note stays armed after placing a note)
   + keyboard shortcuts (Enter commits a note's text, Tab moves between
   fields).
3. **Layout** — a collapsible panel below the canvas, not a separate
   full-page view (unlike BOM's Table/Material-Key tab switch) and not
   print-only.

The earlier audit had flagged the *reference* tool's own `.con-table`
(deferred non-goal since [ADR 0040](0040-construction-lace-solid-leader-lines.md))
as something real factory PDFs don't actually use (they render callouts
directly on the sketch, never a separate written table) — that finding still
stands, and shaped this decision: **this is not that table**. It is not
zone-grouped, not printed as a factory spec sheet, and does not make `zone`
load-bearing for BOM/export. It is a flat, seq-ordered, live mirror of the
same notes already pinned on the canvas — a faster editing/review surface,
not a new factory-facing artifact.

## Decision

- **Table is a view, not a second data source.** One row per note visible on
  the current Lace/Solid tab (`ccVisibleNotes()`, seq-sorted), columns
  `# / Zone / Construction note / delete`. Every cell reads/writes the exact
  same `note.zone` / `note.note` fields the canvas and side panel already
  use — no `pinned` flag, no table-only rows, no new note fields.
  (`ccRenderTable()`, `ccTableRowHtml()`, `src/ui/construction.js`.)
- **Three synchronized views.** Canvas, side panel, and table all render from
  `state.construction.notes`; editing in any one keeps the other two live
  (side-panel keystroke → table row updates; table-row edit → side panel
  updates if that note is selected; either → canvas redraws). No view is a
  cache of another.
- **Collapsible, not a tab.** A toolbar toggle (`#ccTableToggleBtn`) shows/
  hides `#ccTableWrap` via a session-only `ccTableCollapsed` flag (never
  persisted, same pattern as `ccVariant`/`ccArmed`) — distinct from BOM's
  Table/Material-Key view switch, since the TD wants image+annotation and the
  table visible together, not as alternate pages.
- **Continuous add mode.** `ccCreateNoteAt()` no longer disarms itself after
  placing a note (previously `ccArmed = false` on every placement); Escape or
  clicking "+ Add Note" again still cancels. A picked zone (`ccPendingZone`)
  now persists across a placement streak too, so stamping several same-zone
  notes in a row no longer requires re-opening the zone menu each time.
- **Enter / Shift+Enter convention**, on both the side-panel textarea and
  every table-row textarea: Enter commits (blurs, which already triggers the
  existing `focusout` → `pushHistoryIfChanged()`); Shift+Enter inserts a
  literal newline. Newline insertion is done explicitly via a small
  `ccInsertAtCursor()` helper rather than relied on as the browser's default
  textarea action — this matters because some synthetic/automated keystrokes
  (and this was caught by testing, not assumed) never trigger that default,
  so relying on it would silently break for anyone but a live human typist.
  Multi-line notes stay supported deliberately: real factory tech-pack notes
  routinely run multi-clause with a `+size: value` sub-spec on its own line
  (ground truth from the earlier PDF research), so no line-count/word-count
  cap was added.

## Consequences

Positive:

- A TD annotating a busy sketch can rapid-stamp several notes without
  re-arming each time, and review/retype any of them from a compact table
  instead of hunting for a small pin on a crowded cup.
- Zero note-schema change — a project saved before this story opens and
  round-trips with no migration.
- `zone` stays exactly as decorative as ADR 0040 left it for BOM/export
  purposes; it is now additionally *visible* in one more render surface, but
  still drives nothing downstream.

Tradeoffs / things a future reader should not assume:

- The table is **not** a per-zone grouped summary and is **not** part of any
  print/export artifact yet — it is a flat, seq-ordered edit surface. The
  `.con-table` per-zone print view ADR 0040 anticipated is still not built,
  and real-factory-PDF ground truth suggests it may never be worth building
  (see this story's originating research).
- No "table-only" row exists — every table row has a pinned canvas
  annotation and vice versa. A TD who wants a fact recorded without cluttering
  the sketch has no way to do that today.
- Two focus-related edge cases were found only by live browser testing (not
  by the headless suite's first draft, which used `.click()` without
  `.focus()` and so never exercised them) and fixed during this story:
  Shift+Enter/Enter relying on the browser's default action instead of
  explicit insertion (broken under synthetic keystrokes), and the table's
  own "don't rebuild while a row's control has focus" guard incorrectly also
  blocking the rebuild *after* the delete button itself is clicked (a click
  focuses the button, which is inside the table) — fixed by blurring the
  delete button before re-rendering. Both are now covered by
  `scripts/construction-check.mjs`, the second one specifically via an
  explicit `.focus()` before `.click()` in the test so the assertion can't
  silently stop exercising the real-click focus path again.

## Follow-Up

- A zone-grouped or print-oriented table remains a candidate if a TD asks for
  a factory-facing spec sheet later — but per this story's research, real
  tech-pack PDFs don't use one, so it should not be assumed to be the next
  obvious step.
- Table-only rows (a fact with no pin) were explicitly not built — if
  requested, additive: a `pinned:boolean` on the note plus an "add table-only
  row" control, no other schema change.
- Bilingual (EN/中文) notes remain out of scope (ADR 0039/0040 non-goal,
  reaffirmed here) — flagged again given the "smart annotation" ask sits
  adjacent to it and this tool's ecosystem already has a `chinese-overlay`
  skill for other tech-pack PDFs.
