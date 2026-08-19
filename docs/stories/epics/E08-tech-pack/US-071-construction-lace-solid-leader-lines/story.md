# US-071 Construction annotation gains Lace/Solid split, zone taxonomy, multi-anchor leader lines

## Status

done

## Lane

normal

Reason: three risk flags apply — existing behavior (extends the note shape
and rendering shipped in US-070, and every existing project's saved notes
must migrate forward without error), data model (`target` → `targets[]` is a
shape change to persisted data, plus two new fields), and weak proof (the
richer interaction — multi-anchor leader lines, double-click delete — has no
prior test coverage to lean on). No hard gate applies: no auth,
authorization, external system, or public contract is touched, and the data
model change is additive/migrated in place (`ccMigrateNote()`), not a
destructive migration of existing data. Normal lane with stronger validation
per `docs/FEATURE_INTAKE.md`.

## Product Contract

The Construction page (US-070) is brought in line with the reference
tech-pack tool's construction feature
(`Tech pack Output/TechPack output.html`, `mod-con`), per
[ADR 0040](../../../../decisions/0040-construction-lace-solid-leader-lines.md):
notes split into **Lace** and **Solid** variants via toolbar tabs, each with
its own independent note numbering; every note carries a **zone** tag from a
7-value garment taxonomy (`CUP, NECKLINE, ARMHOLE, CRADLE, UNDERBAND, BACK,
STRAP`), defaulted by keyword inference and editable in the side panel; and
leader lines are drawn from the callout label's own box **edge** (not a fixed
point) to one or more **anchors** per note, with an arrowhead, where a note
can point at more than one detail and a double-click on any one anchor
removes just that leader line. Detection, anchors (the POM kind), and the 16
POMs remain untouched.

## Relevant Product Docs

- `docs/decisions/0040-construction-lace-solid-leader-lines.md` — this
  story's decision record (scope, the reference read, alternatives
  considered, the shared-image-board deviation).
- `docs/decisions/0039-construction-annotation-page.md` — the original
  Construction page this story extends; its own Follow-Up section predicted
  the `targets: [...]` shape this story implements.
- `docs/stories/epics/E08-tech-pack/US-070-construction-annotation/` — the
  page and note model this story extends in place.

## Acceptance Criteria

- Every Construction note carries `targets` (a non-empty array of `{nx,ny}`
  anchors, replacing the old singular `target`), `zone` (one of the 7
  `CC_ZONES` values), and `variant` (`'solid'` or `'lace'`, default
  `'solid'`).
- A project saved before this story reopens without error: `ccMigrateNote()`
  runs once per note on load, wrapping any legacy `target` into a 1-element
  `targets` array and defaulting `zone`/`variant` — no version bump, no
  schema flag.
- Two toolbar tabs (`[data-cc-variant="solid"]` / `[data-cc-variant="lace"]`)
  switch which notes render, hit-test, and get numbered; each variant has its
  own independent `seq` sequence starting at 1 (`ccVisibleNotes()` filters by
  variant).
- `#ccAddArrowBtn` arms a one-shot mode (mirroring `#ccAddNoteBtn`'s existing
  arm/click convention): clicking the sketch adds one more anchor/leader line
  to the currently selected note. The first anchor keeps the existing
  numbered-pin visual; later anchors render as small plain dots.
- Double-clicking an anchor removes just that one leader line
  (`ccOnDoubleClick` → `ccDeleteAnchorAt`). A note must always keep at least
  one anchor: double-clicking a note's last remaining anchor is a no-op with
  a toast, not a deletion. `Delete note` / Backspace remains the only way to
  remove a note entirely.
- Leader lines are computed from the label box's own edge toward each anchor
  (`ccLabelBox()` + `ccEdgeToward()`), with a canvas-drawn arrowhead
  (`ccDrawArrowHead()`) at the anchor end — never stored, recomputed every
  render, same invariant as US-070.
- `#ccNoteZone` is a `<select>` in the side panel showing/editing the
  selected note's zone; changing it updates `note.zone` directly. Zone
  defaults via `ccInferZone()`, a keyword classifier reading only the note's
  own text (this tool's notes carry no `region`/`html` field to also match
  against, unlike the reference tool).
- `zone` is purely descriptive in this tool: nothing downstream (no export,
  no printed table) reads it, unlike the reference tool where it drives a
  printed per-zone operation table — that table is explicitly out of scope
  for this story (see ADR 0040 Follow-Up).
- Both variants continue to annotate the same shared board sketch images —
  Lace and Solid do not get separate image sets. This is an explicit,
  documented simplification versus the reference tool's per-sheet image
  pages, not an oversight.
- No regression to detection, POMs, or Main Page: `npm run
  golden`/`invariants`/`contract`/`smoke`/`autosave-check`/`mainpage-check`
  stay green/byte-identical — this story touches only Construction's note
  model and rendering.

## Design Notes

- Commands: none (no backend).
- Queries: none.
- API: none — offline, no network.
- Tables: none.
- Domain rules: the Construction note shape becomes
  `{id, seq, imageId, zone, variant, targets:[{nx,ny}, ...], textPos:{nx,ny},
  note, color, showArrow}`. `targets`/`textPos` keep US-070's normalization
  convention (normalized `[0,1]` within the owning image's own rect, distinct
  from POM anchors' whole-image `[0,1]`). `seq` is scoped per-variant, not
  global, so Lace and Solid each number their own notes from 1.
- UI surfaces (all in `src/ui/construction.js` unless noted):
  - `ccMigrateNote()` — one-time idempotent migration run by
    `ensureConstruction()` over every note on load.
  - `CC_ZONES` — the 7-value taxonomy constant; `ccInferZone(text)` — trimmed
    keyword-based zone default, ported from the reference tool's
    `inferZone()`.
  - `ccVisibleNotes()` — filters `state.construction.notes` by the active
    variant tab; used everywhere rendering, hit-testing, and `seq` assignment
    read the note list.
  - `ccAddArrowAt()` / `ccArrowArmed` — the one-shot "add another anchor"
    mode armed by `#ccAddArrowBtn`, mirroring the existing `ccArmed`/
    `#ccAddNoteBtn` pattern; `ccSyncArmedButton()` reflects armed state on
    both buttons.
  - `ccDeleteAnchorAt()` / `ccOnDoubleClick` — double-click-to-remove-one-
    anchor, wired via `canvas.addEventListener('dblclick', ...)`; refuses to
    drop a note's last anchor.
  - `ccLabelBox()`, `ccEdgeToward()`, `ccDrawArrowHead()` — edge-based leader
    line geometry and arrowhead rendering, ported math from the reference
    tool's `edgeToward()`.
  - `ccSyncVariantTabs()` — reflects the active variant on
    `[data-cc-variant]` buttons (`aria-pressed`).
  - `index.html` — `.cc-variant-tabs`/`.cc-variant-btn` markup + CSS;
    `#ccNoteZone` `<select>` (7 `CC_ZONES` options) in the side panel; a new
    `.cc-side-row` wrapping `#ccAddArrowBtn` next to the existing
    `#ccDeleteNoteBtn`.
- No changes to `src/state.js`, `src/project/history.js`,
  `src/project/project-io.js`, `src/ui/page-nav.js`, or
  `scripts/source-parts.mjs` — this story is entirely inside the note shape
  and rendering US-070 already wired into save/undo/reopen.

## Validation

`scripts/bin/harness-cli story update --id US-071 --unit 0 --integration 1 --e2e 1 --platform 0 --verify "npm run construction-check"`

| Layer | Expected proof |
| --- | --- |
| Unit | Not a separate layer — covered by the E2E suite below (DOM-level state, no isolated pure-function unit to test). |
| Integration | `npm run check` (build freshness + wiring). |
| E2E | `scripts/construction-check.mjs` (extended from US-070's 21 assertions to 31): zone default + change (step 6), add/remove/no-op arrow via double-click (step 7), Lace/Solid variant split + independent `seq` numbering + cleanup (step 8), plus the original drag/delete/undo/anchors/legacy-load/round-trip steps (renumbered 9-13, `.target` reads updated to `.targets[0]`). |
| Platform | Not re-run standalone this story — covered by the full regression pass below (no new screenshot-only surface introduced beyond US-070's). |
| Release | Full regression: `golden` (13/13), `invariants` (135/135), `contract` (753/753), `smoke`, `autosave-check`, `mainpage-check` (31/31) — all green/byte-identical, confirming this story is additive/isolated to Construction. |

## Harness Delta

None anticipated — `scripts/bin/harness-cli` already covers story tracking
for this shape of change, same as US-070.

## Evidence

- `npm run build` / `npm run check` — pass.
- `npm run construction-check` — 31/31 assertions pass.
- `npm run golden` — 13/13 fixtures, 0 drift.
- `npm run invariants` — 135/135.
- `npm run contract` — 753/753.
- `npm run smoke` — no failures.
- `npm run autosave-check` — pass.
- `npm run mainpage-check` — 31/31.
