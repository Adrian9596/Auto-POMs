# US-077 BOM callout selection and batch leader tools

## Status

implemented

## Lane

normal

## Product Contract

Make Material Key annotation fast and explicit while keeping every callout
owned by, numbered from, and synchronized with one BOM table row.

## Relevant Product Docs

- `docs/decisions/0043-bom-owned-material-key-images.md`
- `docs/decisions/0044-bom-row-owns-one-callout-per-variant.md`
- `docs/stories/epics/E08-tech-pack/US-075-bom-workboard/design.md`

## Acceptance Criteria

- Material Key exposes mutually exclusive Select, Add Callouts, and Add
  Leaders tools with visible active state and tool-specific cursor/help text.
- Select can choose a callout from its label, leader, or target; the label and
  each target remain independently draggable and undoable.
- Add Callouts places continuously, advances to the next visible BOM row
  without a callout, and returns to Select after all visible rows are covered.
- One row has at most one callout per variant. The row action selects an
  existing callout instead of creating a duplicate.
- Add Leaders places multiple targets on the selected callout until Select or
  Escape ends the mode.
- Callout number and description remain derived from the linked BOM row.
- Deleting a row or narrowing Scope removes now-invalid linked callouts in the
  same undoable change; widening Scope does not create placement geometry.
- Print keeps Material Key above the table and includes all leader targets.

## Design Notes

- Commands: `npm run build`, `npm run check`, `npm run bom-check`,
  `npm run autosave-check`.
- Domain rules: ADR 0044.
- UI surfaces: BOM Solid/Lace Material Key toolbar, canvas, callout side panel,
  BOM row action and Scope select.
- State schema remains BOM schema v2; tool selection is session-only UI state.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Static/runtime assertions for mutually exclusive tools and row ownership |
| Integration | Delete/scope/undo and save/open preserve synchronized row-callout state |
| E2E | Batch placement, duplicate prevention, persistent leaders, independent drag |
| Platform | Direct Chrome check on Solid and Lace with no console errors |
| Release | Draft boundary and print order remain unchanged |

## Harness Delta

Adds ADR 0044 and extends the focused BOM suite so future UI changes cannot
restore orphan or duplicate callouts.

## Evidence

- `npm run build` — pass; `app.js` regenerated from 64 source parts.
- `npm run check` — pass.
- `npm run bom-check` — 100/100 assertions pass, including batch advancement,
  duplicate prevention, persistent leaders, independent target drag, live
  label sync, delete/scope ownership, Undo, print, and save/open.
- `npm run autosave-check` — pass.
- Direct browser QA on localhost with `demo/demo1.jpg`: visible three-tool
  state, batch row advancement, existing-callout selection, two consecutive
  leader additions, Escape to Select, label drag, Solid/Lace reset, attached
  Material Key/table, and no browser warnings or errors.
