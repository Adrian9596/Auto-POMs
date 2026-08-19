# Design — US-011 Flexible POMs, size-selective export, editable grading

Status: data shapes DECIDED (TD interview 2026-07-10); touch-point inventory
filled by discovery pass; refine during implementation slices.

## TD decisions (locked 2026-07-10)

1. Size export = **dialog with checkboxes**, presets, remembered per project.
2. Custom POMs = **continue numbers 17, 18, …** per project.
3. Grading = **editable per-POM per-size delta table, per project**,
   built-ins pre-filled, reset-to-standard.
4. Custom POMs get **full parity** (panel row, Size L/L2/TOL, grading, export).

## Data model (project file `state`, all additive)

```js
// Which size columns Export Excel emits. Absent => all sizes (back-compat).
sizeSelection: { alpha: ['S','M','L',...], depth: ['M2','L2',...] }

// v2 grade rules: per-POM per-size deltas (inches, may be fractional).
// Absent pom/size => built-in default. Constant-step v1 (state.gradeRules =
// { [pom]: step }) migrates on load to the expanded per-size shape.
gradeRules: { version: 2, alpha: { [pom]: { S: -1.5, M: -0.75, ... } },
              depth: { [pom]: { M2: ..., ... } } }

// TD-defined POMs beyond the 16. Numbering continues from 17 per project.
customPoms: [ { pom: '17', en: '...', zh: '...', tol: '1/2' } ]
```

Rule JSON (`pom-template.json`) is NEVER touched: custom POMs are project
state; the auto pipeline continues to generate only the 16 (ADR 0018).

## UI

- **Export size picker**: dialog on Export Excel; checkboxes for the 15 sizes
  grouped alpha/depth; presets All / Size L only / Alpha / Depth; OK exports,
  selection persists to `sizeSelection` + autosave.
- **Grading dialog**: table POM × size with delta inputs (fraction or decimal
  accepted, rendered as fractions like the sheet); per-row and global
  "Reset to standard"; includes custom POMs (default flat 0 until edited).
- **Spec panel**: "+ Add POM" row after POM 16 (and existing customs) →
  inline name entry (EN required, 中文 optional) → creates `customPoms`
  entry; labeled lines with that number bind to it like any template row;
  "remove" only when no line carries the number.

## Export column algebra (the one tricky part)

Sheet emits only selected size columns. Formula strategy:
- Base size present in selection → per-size cells keep live formulas
  referencing the base column (as today, but column letters computed from the
  SELECTED subset, not fixed G/N).
- Base size absent → affected cells emit cached values only (no dangling
  formula references).
- Column letters/indices must be derived from the selected layout everywhere
  (header, rows, drawing anchor, column widths).

## Discovery findings (filled by discovery pass — file:line inventory)

All paths relative to repo root. Line numbers as of 2026-07-10 discovery.

### S1 — Data model + persistence (sizeSelection, gradeRules v2, customPoms)

Four parallel whitelists must ALL gain each new field (there is no shared
field list; missing one silently drops data on save, load, or undo):

- `src/state.js:140` — the mutable `state` object; init new fields near the
  existing project fields:
  - `:197` `pomSpecs: {}` (comment says keyed "1".."16" — update it)
  - `:203` `gradeRules: {}` (v1 constant-step → becomes v2)
  - `:209` `depthRules: {}` (v1 L2−L offset overrides, no UI today)
  - `:22-23` `PROJECT_FORMAT` / `PROJECT_VERSION = 1` — keep 1; version the
    gradeRules field itself (`version: 2`), since `loadProject` never checks
    `project.version` and old builds drop unknown fields silently anyway.
- `src/project/project-io.js:10` `buildProjectSnapshot()` — save whitelist;
  add next to `:35-38` (styleId/pomSpecs/gradeRules/depthRules).
- `src/project/project-io.js:171` `loadProject()` — restore with defaults at
  `:230-233`. **`:232` is THE single v1→v2 gradeRules migration point** —
  both saved files and autosave restores funnel through `loadProject`
  (autosave.js:202 restore banner; autosave.js:75 `writeAutosave()` calls
  `buildProjectSnapshot()`, so autosave needs no direct edit).
- `src/project/history.js:15` `makeSnapshot()` / `:67` `restoreSnapshot()` —
  undo whitelist mirrors at `:29-31` / `:81-83`; add `customPoms` (+
  `sizeSelection` if undoable). `restoreSnapshot` must default new fields
  (`clone(x || {})`) or pre-edit in-flight snapshots throw.
- v1 shape detection: v1 gradeRules entries are version-less
  `{ [pom]: {step, hold} }` (written by size-run-dialog.js:59-60); v2 is
  `{version: 2, alpha: {...}, depth: {...}}`. v1 WRITERS must be converted in
  the same slice (size-run-dialog.js:48/59-60/215) or a migrated project gets
  re-polluted with v1 keys.
- `state.depthRules` (offset override; consumers export-xlsx.js:88-95,
  buildFullSizeRun :136-137) is absorbed by gradeRules v2 — needs its own
  load-time migration, not deletion, so old projects keep loading.

### S2 — Export size picker + column algebra

- `src/render/export-xlsx.js:23-32` `SPEC_SIZE_RUN` — the 15-size layout
  `{label, base, tier}`; the picker's checkbox list and the selected-subset
  layout both derive from it.
- `:271-277` `SPEC_XLSX_COLS = 4 + SPEC_SIZE_RUN.length` +
  `specColLetter(index)` — the only column-letter machinery; all refs are
  index-derived (no hardcoded letter strings), so it re-derives cleanly if
  made per-export.
- `:400-422` `buildSpecSheetXml` — `<dimension>` lastCol, `<cols>` widths
  (cols 5..SPEC_XLSX_COLS), both `mergeCells` A1:{lastCol}1/2 — all from
  SPEC_XLSX_COLS; must take the selected layout's count.
- `:504-506` `lCol`/`l2Col` — computed via `findIndex` over SPEC_SIZE_RUN
  (NOT hardcoded 'G'/'N'). Under a subset, recompute from the filtered
  layout; when L or L2 is deselected findIndex → −1 → `specColLetter(3)` =
  'D' (the TOL column) — silently-wrong formulas, so the cached-value
  fallback must be explicit.
- `:508-542` per-POM row writer — labels A–D, then blank / static
  `numberFrac` (base==null) / `specFormulaCell` `=G{r}±Δ` or `=N{r}±Δ` with
  cached `<v>` (`:391-394`, delta quantized by `roundSpecDelta` `:97-102`);
  this branch is where the base-absent → cached-only fallback lands.
- `:140,147` `depthLabels.indexOf(col.label)` delta lookup and `:126-128`
  `GRADE_SIZES` positional alpha lookup — positional against the FULL run.
  **Compute the full 15-cell run first, filter columns after**; never feed
  `buildFullSizeRun` a filtered layout.
- `:294-319` + `:498` depth header fills (SPEC_XF.headDepth0 +
  `depthLabels.indexOf`) — must keep indexing the FULL depth list so colors
  stay per-size, not per-position.
- `:427-447,588-590` drawing anchor — ROW-based (`3 + pomKeys.length + 2`);
  unaffected by size columns, moves with custom POM rows (already tracks
  `pomKeys.length`).
- `:631-647` `exportSpecXlsx` entry point — where the size-picker dialog
  intercepts before `buildSpecWorkbookXlsx`.
- `:653-667` test hooks `__braAutoModeDebug.exportSpecXlsxBase64` /
  `buildFullSizeRun` — extend options arg with sizeSelection for the suite.
- Dialog shell: `src/ui/dialogs/core.js:11-58` `buildDialog()`
  (overlay/panel/Esc/click-outside; `escapeHtml` at :60). New picker part
  must register in `scripts/source-parts.mjs` after core.js (line 18).
- Determinism: the export-xlsx suite asserts byte-identical output incl.
  formula text — any header/formula/column change re-baselines it; the
  `export-hidden` suite covers the hiddenAnnIds row-omission path.

### S3 — Grading dialog (per-POM per-size deltas)

- Built-in defaults the dialog pre-fills / resets to (all inches, keyed
  '1'..'16', in `src/render/export-xlsx.js`):
  - `:38-55` `SPEC_ALPHA_DELTA_L_IN` (8 entries, positional vs GRADE_SIZES;
    held POMs 6/14/15 all-zero)
  - `:61-65` `SPEC_DEPTH_OFFSET_IN` (L2 = L + offset)
  - `:66-83` `SPEC_DEPTH_DELTA_L2_IN` (7 entries vs M2..5XL2; `:73` POM 7
    4XL2 = 0.4375 interpolated, "TD to confirm" — surface provenance)
- Canonical prose source: `Grading rules.md` §1–§2.1 (:28-117 model + depth
  table), §4 (:151-168 alpha Δ map — includes 6XL, which the 15-size
  SPEC_SIZE_RUN does not), §3/§6 (:124-135, 229-234 method switches + held
  POMs, not encoded in code).
- Grading engine: `src/render/export-xlsx.js:114-168` `buildFullSizeRun()` —
  emits `{value, base:'L'|'L2'|null, delta}`; branches on `rule.overridden`
  at `:127,144` (v1 override switches BOTH tiers to constant-step — a
  deliberate dialog/export consistency guarantee the v2 shape must
  re-decide explicitly); explicit sizeL2 vs derived L2 at `:134-138`; held
  POMs anchor depth cells on 'L' at `:165`.
- v1 override surface to port/supersede: `src/ui/dialogs/size-run-dialog.js`
  - `:8-9,16-33` GRADE_SIZES / GRADE_BASE_SIZE='L' / HOUSE_GRADE_INCHES
  - `:44-62` `getGradeRule`/`setGradeRule` (v1 `{step, hold}`, unit-converted
    via inchesToUnit :35) — also consumed by export-xlsx.js:14
  - `:64-78` `gradeBaseValue` (pomSpecs sizeL → calibrated length → null);
    shared by dialog and export, works for custom keys once getPomSpec does
  - `:90-249` `openSizeRunDialog` — the construction template to clone
    (buildDialog + scroller table + sticky headers + setGradeRule +
    pushHistoryIfChanged + Reset/Copy/Done footer). It is a grading preview,
    alpha-only, read-only values — the v2 grading dialog supersedes its
    step-editing role (evolve or retire; see adjustments below).
- Fraction handling: `src/ui/spec-panel.js:305-315` `fractionToNumber()`
  parses '1/4', '5 1/2', '0.25' — **no negative-fraction support** (grade
  deltas are often negative); no number→fraction renderer exists in the UI
  layer (only Excel numFmt 164 `:354-362`). Dialog needs an extended parser
  + a new formatter. `parseSpecNumber` at `:568-572`.
- Part order (`scripts/source-parts.mjs`): dialogs/core.js 18,
  size-run-dialog.js 25, spec-panel.js 27, export-xlsx.js 59 — a new dialog
  part needing fractionToNumber loads after 27; call-time references across
  parts are fine, top-level execution order is what matters.

### S4 — Custom POMs (17+, full parity)

- Panel rendering: `src/ui/spec-panel.js`
  - `:229-238` templateOrder loop over numeric-sorted
    `Object.keys(POM_TEMPLATE)` → buildSingleSpecRow / buildTemplateSpecRow
  - `:240-250` "extras" loop for out-of-range labels — annotation-driven
    only, so an un-drawn custom POM has NO row today; customPoms-backed
    template-style rows go here, "+ Add POM" control after `:250`
    (buildVisibilityControlRow `:472` is the full-width-row pattern)
  - `:686-753` buildTemplateSpecRow / buildSingleSpecRow; buildPomCell
    `:755-786` already accepts any label text (how a TD types '17' today)
  - `:178-186` focus-preservation requires `tr[data-pom-key]` /
    `tr[data-ann-id]` — custom rows and the Add-POM row MUST set the dataset
    or rebuilds steal focus mid-edit
  - `:332-348` `getPomSpec` works for arbitrary keys ('' fallbacks);
    `:350-384` `setPomSpec` clears blank/equal-to-fallback overrides — so
    custom names must live in the `customPoms` registry, NOT pomSpecs en/zh
    (a blanked name override would evaporate the row)
  - `:276-330` suggestion fallback returns '' for unknown keys (safe);
    `:419-443` badges only when a suggestion exists
  - `:525-543` getPomTooltip falls back to getPomInfo — extend for customs
- Name lookups outside the panel: `src/manual-tools.js:501-521`
  `getPomInfo()` returns `{desc:'', refL:null, zh:''}` for 17+ — needs a
  customPoms-aware parallel lookup for canvas tooltips/draft rows.
  `:490-493` `getLabelText()` falls back to `ann.seq` — seq-fallback keys
  can collide with TD-created custom numbers.
- POM_TEMPLATE-only iterations to extend (missing either breaks parity):
  - `src/render/export-xlsx.js:453-473` `allPomKeys` (+ hidden filtering
    with pairing expansion; customs have no pairing; POM number cell uses
    `Number(key)` — fine for 17+)
  - `src/ui/dialogs/size-run-dialog.js:86-94` (or its v2 successor)
- Grading defaults for customs: SPEC_ALPHA_DELTA_L_IN['17'] etc. are
  undefined → today falls to the constant-step branch with HOUSE fallback
  `{step: 0, hold: false}` — i.e. flat, matching "default flat 0", but only
  by accident of the fallback chain; make it explicit in v2.
- Guardrails confirming customs stay OUT of the rule JSON:
  `src/auto/rules/load-rules.js:156` (exactly 16 rows invariant),
  `src/auto/drafts/validate-fixture.js:24,32` (auto pipeline rejects keys
  outside 1–16 — auto-only, matches the story non-goal).
  Learning layer is already 17+-tolerant:
  `src/auto/learning/calibration-store.js:492-503` POM_LABEL_MAX = 40.

### Cross-cutting

- Never edit `app.js`; edit `src/*`, `npm run build && npm run check`, then
  `export-xlsx`, `export-hidden`, `autosave-check`, `golden`.
- Google Drive checkout: builds/tests can flake under write churn — retry
  after FS settles before suspecting the change.
- Harness friction: `scripts/bin/harness-cli` binary is ABSENT in this
  checkout — use `docs/TEST_MATRIX.md` as the fallback matrix and record the
  friction in story evidence.

## Design adjustments from discovery

1. **Size picker is a NEW dialog; it does not extend size-run-dialog.**
   Confirmed: `openSizeRunDialog` is a read-only alpha-only (S–5XL, no depth
   tier) grading preview with constant-step editing — a grading tool, not an
   export picker. The picker intercepts at `exportSpecXlsx`
   (export-xlsx.js:631). The grading dialog (S3) is the natural successor of
   size-run-dialog's step-editing role: either evolve it into the per-size
   delta table or retire it after the v2 migration — decide in S3, but do
   not leave both editing surfaces live (two sources of truth).
2. **Column letters are NOT hardcoded** — 'G'/'N' are `findIndex`-derived
   (export-xlsx.js:504-506) and all widths/merges loop over
   SPEC_SIZE_RUN.length. S2 therefore parameterizes one layout array rather
   than rewriting letter strings. The real hazards are (a) findIndex → −1
   when L/L2 is deselected silently yielding column 'D' — the cached-value
   fallback must gate on base-column presence explicitly; (b) positional
   delta and header-fill lookups (`:126-128,140-147,498`) that assume the
   full run — always compute the full 15-cell run via `buildFullSizeRun`,
   then filter columns at emission time.
3. **depthRules is absorbed by gradeRules v2, with migration.** design.md's
   v2 shape carries the depth tier, but `state.depthRules` is persisted in
   project files (project-io.js:38) and consumed at export-xlsx.js:88-95 —
   S1 must migrate it on load (fold offsets into derived depth deltas or a
   v2 field), not delete it, or old projects lose their L2 offsets. Also
   re-decide the v1 "constant-step override switches BOTH tiers"
   consistency coupling (export-xlsx.js:127,136-137,144) explicitly in v2.
4. **v1 gradeRules shape correction**: v1 entries are `{step, hold}` objects
   (size-run-dialog.js:59-60), not bare `{ [pom]: step }` numbers as the
   data-model comment above sketches — the migration must read
   `.step`/`.hold`, and convert the v1 writers in the same slice so a
   migrated project isn't re-polluted.
5. **Custom POM names need a registry, not pomSpecs.** `setPomSpec` deletes
   overrides that are blank or equal to the ('' for 17+) fallback
   (spec-panel.js:350-384), so en/zh stored only in pomSpecs can evaporate.
   `customPoms` (as decided) is the name/tol source of truth; pomSpecs keeps
   sizeL/sizeL2/tol overrides as for template POMs.
6. **Dialog inputs need a negative-fraction parser + fraction formatter.**
   `fractionToNumber` (spec-panel.js:305) rejects negatives and no inverse
   formatter exists in the UI layer; grade deltas are frequently negative
   and the decided UI renders fractions — small S3 pre-requisite.
7. **hiddenAnnIds is session-only and row-scoped** — orthogonal to the
   persisted, column-scoped `sizeSelection`; keep them independent (rows vs
   columns), don't build size selection on the hidden mechanism.
8. **Scope check on sizes**: Grading rules.md documents a run including
   6XL/6XL2; SPEC_SIZE_RUN (the export) is 15 sizes without 6XL and with an
   interpolated POM 7 4XL2. sizeSelection freezes the 15-size membership
   deeper into state — confirm with the TD that 6XL columns are never
   needed before shipping (flag at S2 review, not a blocker).

## Review resolutions (2026-07-10, post-implementation)

- **M1 (two grade-editing surfaces)** — resolved by making the Size Run
  dialog a read-only PREVIEW (step/hold shown, not editable; reset removed).
  The Grading dialog is the single editing surface; legacy step overrides
  remain honored (precedence: per-size → step → built-in) and its row Reset
  clears them.
- **M2 (silent fraction misparse)** — `gradeDeltaToNumber` now accepts ONLY
  decimal / `a/b` / `w a/b` shapes; anything else (e.g. `"3 /4"`, `"1/0"`)
  toasts and reverts instead of storing a wrong delta.
- **m2** — clearing a grading cell now deletes the override (back to
  standard); pinning a size flat requires an explicit `0`.
- **m1** — the panel's mid-edit rebuild guard also covers the Add-POM row.
- **m3 (mixed units in one container: alpha/depth in inches, steps/offsets
  in project unit)** — ACCEPTED risk, documented in the container comment
  (state.js); pre-existing v1 convention, unit switches mid-project are not
  a supported workflow. Follow-up if cm projects become common.

## ADR

0018 — custom POMs extend, never mutate, the 16-POM contract.
