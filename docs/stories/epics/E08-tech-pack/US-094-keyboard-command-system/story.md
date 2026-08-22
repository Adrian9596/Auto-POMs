# US-094 Every stable command is reachable from the keyboard

## Status

implemented

## Lane

normal

Reason: this changes existing, user-visible keyboard behavior across all five
tech-pack pages and adds new browser UI, but it does not touch authentication,
authorization, persisted project data, external systems, or the 18-POM
contract. Risk flags: existing behavior and public contract; the latter is a
browser interaction contract rather than an API or storage migration.

## Product Contract

Every stable command in the offline app is discoverable and operable from the
keyboard. Frequent commands keep direct shortcuts; every other stable command
is available through one context-aware Command Palette. Repeated row- or
record-specific operations remain keyboard-operable through standard focus and
activation keys instead of generating one palette command per record.

## Relevant Product Docs

- `README.md` — current Board shortcuts and five-page workflow.
- `ARCHITECTURE.md` — shared-scope source ordering and UI module map.
- `docs/stories/epics/E08-tech-pack/US-069-page-navigation/story.md` — the
  five-page registry and session-only page state.

## Acceptance Criteria

- `Cmd/Ctrl+K` opens a searchable Command Palette from any page; Arrow keys,
  Home/End, Enter, and Escape operate it without moving focus behind it.
- `Cmd/Ctrl+1` through `Cmd/Ctrl+5` switch Board, Main Page, Construction, BOM,
  and Preview; `?` opens Help & Shortcuts.
- Existing Board shortcuts retain their current behavior and only run on the
  Board. Direct page-specific shortcuts only run on their owning page.
- The palette covers every stable Board, Auto, Main Page, Construction, BOM,
  and Preview command. Contextually unavailable commands remain visible,
  disabled, and explain why.
- Inputs, textareas, contenteditable cells, open dialogs, and inline editors
  keep ownership of normal typing. Standard global Save/Open/Undo/Redo and the
  palette opener remain intentionally available where safe.
- Destructive commands keep their existing confirmation and history behavior.
- Shortcut labels shown by the palette, menus/tooltips, and Help come from one
  registry so documentation cannot silently drift from the router.
- No shortcut customization UI or persisted key map is added in this story.

## Design Notes

- Commands: one shared registry owns command id, label, category, keywords,
  page scope, availability, disabled reason, action, and optional direct key.
- Queries: palette filtering is local, deterministic, case-insensitive text
  matching; no network or storage.
- API: none.
- Tables: none.
- Domain rules: `state.activePage` owns page scope; selection, app mode, active
  tool, and sheet/view state own contextual availability.
- UI surfaces: command registry, modal palette, global shortcut router, page
  tab keyboard behavior, Board menu hints, and Help & Shortcuts.

## Validation

`scripts/bin/harness-cli story update --id US-094-keyboard-command-system --unit 1 --integration 1 --e2e 1 --platform 1 --verify "npm run keyboard-shortcuts-check"`

| Layer | Expected proof |
| --- | --- |
| Unit | Registry uniqueness, shortcut collision, page ownership, and command inventory assertions. |
| Integration | `npm run build` and `npm run check`; generated `app.js` is fresh. |
| E2E | `npm run keyboard-shortcuts-check` drives palette search/execution, disabled reasons, typing guards, page navigation, and retained Board shortcuts. |
| Platform | Direct browser pass on all five pages at desktop width with keyboard-only interaction and focus inspection. |
| Release | Existing `board-toolbar-check`, `board-interaction-check`, `mainpage-check`, `construction-check`, `bom-check`, `preview-check`, and `autosave-check`. |

## Harness Delta

Add `keyboard-shortcuts-check` as the focused executable proof for the command
registry and palette.

## Evidence

- `npm run build` and `npm run check` pass with the registry, palette, dialog,
  focus-management, and page-navigation modules included in generated
  `app.js`.
- `npm run keyboard-shortcuts-check` passes 32/32 focused assertions covering
  registry integrity, palette interaction, disabled reasons, page scope,
  typing guards, focus restoration, retained Board behavior, and the rule that
  closing a modal must not leak Escape into page-level navigation.
- Regression checks pass: `board-toolbar-check` 54/54,
  `board-interaction-check`, `mainpage-check` 54/54, `construction-check`
  55/55, `bom-check` 100/100, `preview-check` 58/58, and `autosave-check`.
- Direct Chrome verification at `http://127.0.0.1:4173/` confirmed 110
  searchable palette commands, initial search focus, modal semantics, Escape
  close/focus restoration without leaving Main Page, Construction, BOM, or
  Preview, page-dependent disabled reasons, `Ctrl+1` through `Ctrl+5`, `?`
  Help, and roving tab focus. Browser warning/error log: empty.
