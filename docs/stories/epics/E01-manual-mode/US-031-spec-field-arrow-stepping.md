# US-031 Arrow-key stepping in Size L / L2 / TOL fields

## Status

implemented

## Lane

normal

## Product Contract

With focus in a Size L, Size L2, or TOL field in the Measurements panel,
ArrowUp / ArrowDown steps the value by 1/8 (matching the Excel export's
fraction convention) — or 0.1 when the board unit is cm — and Shift+arrow
steps by a whole unit. Values never go below 0. A blank field starts from 0.
Each step is applied to the spec immediately (the row's Value-cell tolerance
chip updates live when a line + scale exist); a rapid burst of steps commits
to history once, ~0.7 s after the last press — the same one-commit-per-burst
contract as the canvas nudge. Focus stays in the field throughout. The 中文,
description, and POM-number fields are unaffected, as are the canvas arrow
shortcuts (which already ignore field focus).

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 6)
- `docs/stories/epics/E01-manual-mode/US-027-arrow-key-line-nudge.md`

## Acceptance Criteria

- ArrowUp/Down in a focused sizeL / sizeL2 / tol input steps ±1/8
  (±0.1 in cm mode), Shift = ±1, clamped at 0, no caret jump.
- The tolerance chip in the same row's Value cell refreshes per step.
- One history entry per stepping burst; focus is not stolen by the commit.
- Blank field: first ArrowUp yields 0.125 (or 0.1 cm).
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- UI surfaces: `buildSpecInputCell` in `src/ui/spec-panel.js` gains a
  keydown handler for the three numeric fields; a module-level 700 ms
  debounce (`scheduleSpecStepCommit`) pushes history once per burst.
  `renderSpecPanel`'s existing editing-field guard prevents the commit's
  rebuild from stealing focus; the Value chip refreshes via the US-028
  targeted `refreshMeasuredValueForAnnotation`.
- Values are written through `setPomSpec` (same path as typed edits), so
  suggestion-clearing semantics and blank handling stay identical.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass: step values with/without Shift, chip refresh, focus held, one undo per burst, clamp at 0 |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15.
- Browser pass on demo1 after Apply Lines:
  - Size L (library-suggested 14): ArrowUp ×4 → 14.5, ArrowDown → 14.375,
    Shift+ArrowUp → 15.375 — stepping starts from the suggested value and
    the stepped values land in `state.pomSpecs` via `setPomSpec`.
  - Blank Size L2: ArrowDown → 0 (clamped, holds on repeat), ArrowUp →
    0.125.
  - With scale set (line = 10 in) and target 9.5: each ArrowUp refreshed
    the row's tolerance chip live (+0.4 ✓ → +0.3 ✓) with focus held in the
    field, including across the debounced history commit.
- cm-mode 0.1 step is code-path only (no cm board in the fixture set).
