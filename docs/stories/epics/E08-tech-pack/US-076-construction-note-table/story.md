# US-076 Construction gets a live note table and quicker annotation

## Status

done

## Lane

normal

## Product Contract

The Construction page (US-070/071, ADR 0039/0040) must let a TD:

- see all notes visible on the current Lace/Solid tab as a flat, editable
  table below the canvas — one row per pinned note (seq, zone, note text),
  auto-derived from the same data the canvas draws from (no separate entry,
  no schema change);
- edit a note's zone or text directly from its table row, staying in sync
  with the canvas pin and the side panel, whichever the TD is looking at;
- show/hide that table via a toolbar toggle, independent of placing/editing
  notes;
- keep annotating faster: placing a note no longer requires re-pressing
  "+ Add Note" for each one (stays armed until Escape or the button cancels
  it), and a note's text field commits on Enter / takes a literal newline on
  Shift+Enter.

## Relevant Product Docs

- [`docs/decisions/0039-construction-annotation-page.md`](../../../decisions/0039-construction-annotation-page.md)
- [`docs/decisions/0040-construction-lace-solid-leader-lines.md`](../../../decisions/0040-construction-lace-solid-leader-lines.md)
- [`docs/decisions/0042-construction-note-table-and-quick-annotation.md`](../../../decisions/0042-construction-note-table-and-quick-annotation.md)

## Acceptance Criteria

- A `#ccTableWrap` panel renders below `.cc-body`, listing every note in
  `ccVisibleNotes()` (current Lace/Solid tab), seq-ascending, as `<tr>` rows
  with a zone `<select>`, a note `<textarea>`, and a delete button.
- Editing a row's zone or text updates the same note object the canvas/side
  panel use — no new note fields, no separate table data.
- The table stays in sync with edits made via the side panel and vice versa,
  and with the canvas selection (clicking a row selects that note; selecting
  a note on the canvas highlights its row).
- A toolbar button toggles the table's visibility without touching note
  data.
- Placing a note via "+ Add Note" keeps the tool armed for the next click
  (Escape or the button cancels); a zone picked from the Add-Note zone menu
  persists across a placement streak.
- In a note's text field (side panel or table row), Enter commits (blurs)
  and Shift+Enter inserts a newline — both explicit, not dependent on the
  browser's default textarea action.
- `state.construction.notes` schema is unchanged; a pre-US-076 project loads
  and round-trips with no migration.

## Design Notes

- Commands: none (no new persisted commands — table edits write directly to
  the existing note fields already covered by `ccMigrateNote()`).
- Queries: none (no new query surface).
- API: none (offline tool, no network surface touched).
- Tables: `#ccTable` (`src/ui/construction.js`'s `ccRenderTable()` /
  `ccTableRowHtml()`) — a rendered view, not a data table.
- Domain rules: `zone` remains decorative (ADR 0040); no BOM/export logic
  reads it. The table adds no new domain rule.
- UI surfaces: `#ccTableToggleBtn`, `#ccTableWrap` / `#ccTable` /
  `#ccTableBody` / `#ccTableEmpty` (`index.html`); event delegation on
  `#ccTableBody` for row zone/text/delete (`src/ui/construction.js`).

## Validation

`scripts/bin/harness-cli story update --id US-076 --unit 0 --integration 1 --e2e 1 --platform 0`

| Layer | Expected proof |
| --- | --- |
| Unit | — |
| Integration | `npm run construction-check` (headless CDP, DOM + state assertions) |
| E2E | Manual live-browser pass in this story (continuous add, table sync both directions, row delete, toggle) |
| Platform | — |
| Release | `npm run bom-check`, `npm run mainpage-check` (shared `.cc-*` CSS regression check) |

## Harness Delta

- Added decision `docs/decisions/0042-construction-note-table-and-quick-annotation.md`,
  registered via `harness-cli decision add`.
- No new harness tooling needed; existing `construction-check.mjs` extended
  in place rather than a new suite created.

## Evidence

- `npm run build && npm run check` — clean.
- `npm run construction-check` — 49/49 assertions (was 13 numbered steps/31
  assertions pre-story; added continuous-add, Enter/Shift+Enter, table
  mirror/edit/delete, and toggle coverage).
- `npm run bom-check` — 77/77 (sanity check: BOM's page reuses this
  project's `.cc-variant-tabs`/`.cc-variant-btn` CSS classes).
- `npm run mainpage-check` — 31/31.
- Live browser verification (this tool's own dev server, `demo/demo1.jpg`)
  caught two real bugs before they shipped, both fixed and now covered by
  `construction-check.mjs`:
  1. Shift+Enter/Enter relying on the browser's default textarea action
     never fired under this session's synthetic keystrokes (`e.key` arrived
     as `""` for Return) — fixed by inserting the newline / committing
     explicitly (`ccInsertAtCursor()`) instead of trusting the default
     action, which also makes the behavior deterministic for real users.
  2. Clicking a table row's delete button focuses the button itself (inside
     the table), which the table's own "don't rebuild mid-edit" focus guard
     then mistook for "still editing," leaving a stale row after deletion —
     fixed by blurring the delete button before re-rendering. The test that
     should have caught this originally used `.click()` without `.focus()`
     and missed it; strengthened to `.focus(); .click();` to match a real
     user click.
