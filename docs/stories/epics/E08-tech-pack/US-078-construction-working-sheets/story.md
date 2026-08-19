# US-078 Construction working sheets align with BOM

## Status

implemented

## Lane

normal

Reason: the change is bounded to the Construction page but touches its saved
data model, replaces existing user-visible behavior, and requires stronger
migration/browser proof. No auth, external system, or destructive migration
hard gate applies.

## Product Contract

Construction is authored as two continuous sheets, Lace and Solid. Each sheet
shows a wide Outer/Inner annotation working board above one live Construction
Table. Each view owns its images; each table row may own one synchronized
multi-leader callout. A fresh project starts with Area-only draft rows and blank
technical detail.

## Relevant Product Docs

- [`docs/decisions/0045-construction-sheets-own-working-views-and-rows.md`](../../../../decisions/0045-construction-sheets-own-working-views-and-rows.md)
- [`docs/decisions/0044-bom-row-owns-one-callout-per-variant.md`](../../../../decisions/0044-bom-row-owns-one-callout-per-variant.md)

## Acceptance Criteria

- Lace and Solid tabs each show Outer and Inner working panels plus one always-
  visible table below; the old table visibility toggle and side-note editor are
  removed.
- Each of the four sheet/view combinations owns an independent image list and
  supports upload, paste, and drop without replacing existing images.
- A new Construction model seeds six blank-detail rows per view using CUP,
  SLING, CRADLE, SIDE SEAM, BACK CLOSURE, and FRONT CLOSURE.
- The table exposes editable View and Area dropdowns plus Construction Detail,
  add/delete actions, and a callout action. Detail starts as an empty string.
- Select, Add Callouts, and Add Leaders match BOM behavior. One row owns at
  most one callout; row edits redraw its label; multiple leader targets stay
  attached to that callout.
- Deleting a row deletes its callout in one undo transaction. Changing View
  deletes the old callout in the same transaction. Undo restores the full
  relationship.
- Legacy note projects migrate without losing note text, leader targets, label
  position, or available image bytes; new draft rows are not injected into a
  project that already has Construction content.
- Save/open and autosave round-trip the new model; detection anchors, drafts,
  and POM output remain unchanged.

## Design Notes

- Commands: none.
- Queries: none.
- API: none; runtime remains fully offline.
- Tables: Construction Table is the editing source for operation rows; callout
  labels derive from those rows.
- Domain rules: ADR 0045.
- UI surfaces: `#constructionPage`, `src/ui/construction.js`, Construction
  state serialization/migration, and `scripts/construction-check.mjs`.

## Validation

`scripts/bin/harness-cli story update --id US-078-construction-working-sheets --unit 1 --integration 1 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | Focused model/seed/migration assertions in `construction-check` |
| Integration | `npm run build`, `npm run check`, save/open/undo assertions |
| E2E | `npm run construction-check` with real DOM interactions |
| Platform | Direct in-app browser QA with realistic images and clean console |
| Release | `npm run bom-check`, `npm run mainpage-check`, `npm run autosave-check` |

## Harness Delta

- ADR 0045 and Construction glossary terms added.
- Existing Construction story lane retained; focused suite extended rather
  than adding a parallel validator.

## Evidence

- `npm run build` and `npm run check` — pass; generated `app.js` rebuilt from
  64 source parts.
- `npm run construction-check` — **55/55 assertions**. Covers the exact 24-row
  blank-detail seed, Lace/Solid and Outer/Inner image ownership, batch
  callouts, persistent multi-leaders, row/callout ownership, View move and row
  delete with Undo, legacy-note migration, save/open, and detector isolation.
- `npm run bom-check` — **100/100**; `npm run mainpage-check` — **31/31**;
  `npm run autosave-check` — pass.
- Detection regression: `npm run golden` — 13/13 fixtures with max drift
  `0.0000`; `npm run invariants` — **135/135**; `npm run contract` —
  **753/753**; `npm run smoke` — pass with 18/18 applied POMs and no failures.
- Direct in-app browser QA used `demo/demo1.jpg` in Solid Outer and
  `demo/demo3.jpg` in Solid Inner. It visually confirmed the wide paired
  Working Board, independent images, row 1 batch callout, three leader
  targets, live table edit changing the label to
  `1. SLING — Attach sling with clean finish`, and a clean independent Lace
  sheet. Browser warning/error log: `[]`.
