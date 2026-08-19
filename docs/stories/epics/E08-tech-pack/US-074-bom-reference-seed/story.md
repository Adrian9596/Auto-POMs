# US-074 BOM reference seed: first-ever BOM materializes as the reference sheet's exact 12 rows

## Status

done

## Lane

normal

Reason: two risk flags — existing behavior (a fresh or pre-US-072 project's
BOM used to seed EMPTY; it now seeds the reference sheet's 12 rows) and data
model (`state.bom` gains a persisted `seedId` key guarding one-shot seeding).
No hard gate. Normal lane with stronger validation: `bom-check` gained a
verbatim per-row deep-compare of the whole seed (step 1b) plus revised
legacy-load expectations.

## Product Contract

FD request (2026-08-16, Vietnamese): "đưa chính xác BOM từ đây
'/Users/crossian/Downloads/Tech pack Output/TechPack output.html' vào phần
BOM" — put the exact BOM from the reference tech pack into the BOM page.

1. **A project's first-ever BOM materializes as the reference BOM, verbatim.**
   The 12 rows in the reference's embedded `#pack-data` JSON (`bom.rows`,
   style RSL vDraft 1.0) become `BM_SEED_ROWS` in `src/ui/bom.js`: every cell
   string byte-exact (only the key `area_of_use` renames to `areaOfUse`),
   list order preserved, scopes preserved (Allover lace is LACE-only), and
   the two `group_id` size-split pairs (`strap-elastic`,
   `nylon-coated-slider`) become shared numeric `groupId` pairs so the sheets
   number them 8.1/8.2 + 9.1/9.2 (SOLID) and 9.1/9.2 + 10.1/10.2 (LACE),
   matching the reference. `cw_default`/`cw_override` are empty on every
   reference row, so dropping `cw_default` (per ADR 0041) loses nothing.
2. **Seeding is one-shot per project.** `bom.seedId` (`rsl-vdraft-1.0`)
   records that seeding ran. A TD who deletes every row keeps an empty BOM on
   the next load — the seed never resurrects (BOM rows are deletable on
   purpose, unlike MAIN PAGE fields). A bom that already has rows or callouts
   is stamped only, never modified.
3. **Undo/history safety.** Both seeding call paths run before
   `seedHistory()` (boot: `src/state.js` initBom → seedHistory; open:
   `src/project/project-io.js` ensureBom → seedHistory), so the seed is part
   of the history baseline, never an undoable step.
4. **Legacy migration.** A pre-US-072 project (no `state.bom`) opens with the
   seeded reference BOM — same convention as MAIN PAGE seeding its default
   fields on legacy loads.

## Relevant Product Docs

- `docs/stories/epics/E08-tech-pack/US-073-bom-reference-parity/` — the
  parity story this seed completes content-wise; it verified the Downloads
  copy is byte-identical to `Tech pack Output/TechPack output.html`.
- `docs/decisions/0041-bom-annotation-and-table.md` — BOM page decision
  record; its drop list is unchanged by this story.

## Acceptance Criteria

- Fresh app boot → BOM page shows the reference sheet: SOLID numbering
  `1..7, 8.1, 8.2, 9.1, 9.2` (Allover lace filtered out), LACE numbering
  `1..8, 9.1, 9.2, 10.1, 10.2` with Allover lace as row 4.
- All 12 rows' cells deep-equal the reference JSON verbatim.
- A loaded project carrying `bom: { rows: [], callouts: [], seedId }` stays
  empty; a loaded project with rows keeps them untouched.
- A pre-US-072 (version 1) project seeds the 12 rows and stamps `seedId`.
- The seed creates no callouts, anchors, or drafts.

## Design Notes

- Commands: none new; seeding lives in `ensureBom()` (`src/ui/bom.js`).
- Tables: `state.bom` gains `seedId: string` (persisted, round-trips).
- Domain rules: seed only when `!bom.seedId && !bom.rows.length &&
  !bom.callouts.length`; always stamp `seedId` afterwards.
- UI surfaces: BOM Table + print sheets render the seed through the existing
  row pipeline — no new render code.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | — |
| Integration | `npm run bom-check` step 1b: 12-row verbatim deep-compare, SOLID/LACE numbering, seedId stamp; step 2 emptied-BOM stays empty; step 13 legacy seeds 12 rows |
| E2E | `npm run bom-check` 77/77; `npm run smoke` failures: []; `npm run autosave-check` PASS |
| Platform | — |
| Release | `npm run check` (build freshness + wiring) PASS |

## Harness Delta

- `scripts/bom-check.mjs` step 11b's callout click moved to the exact canvas
  center: the headless window leaves the matkey canvas ~104px tall, so the
  fitted sketch is ~32x24px around the center — the old center+(30,30) click
  landed off the image and `bmCreateCalloutAt` rejected it (root cause of the
  pre-existing 11b FAIL; verified by instrumented repro, `sawPointerDown`
  true, armed stayed true, image bounds miss).

## Evidence

- `npm run bom-check` → PASS 77/77 (2026-08-16).
- `npm run check`, `smoke`, `autosave-check`, `mainpage-check` 31/31,
  `construction-check` 31/31, `golden` PASS, `contract` 753/753,
  `invariants` 135/135, `export-xlsx`, `export-hidden` — all green after the
  seed landed (2026-08-16).
- Browser proof: BOM tab on a fresh boot renders BOM-SOLID with
  `1 Shell fabric … 9.2 Nylon coated slider`, Lace tab shows
  `4 Allover lace`; `exportProject().state.bom` = 12 rows,
  `seedId: 'rsl-vdraft-1.0'`.
