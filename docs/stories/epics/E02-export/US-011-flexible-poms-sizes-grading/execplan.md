# Exec Plan — US-011 Flexible POMs, size-selective export, editable grading

## Goal

A TD can (a) export only the sizes they need, (b) see and edit the grading
rule inside the tool, and (c) add style-specific POMs beyond the standard 16
with full grading/export parity — all offline, all persisted in the project
file.

## Scope

In scope:

- Size-picker export dialog + per-project persistence of the selection.
- Grading dialog (per-POM per-size delta table, fraction-aware, reset).
- `state.gradeRules` v2 data model (per-size deltas; migrate constant-step).
- Custom POM registry in state + project file (`customPoms`), Add/Remove UI
  in the spec panel, parity in grading dialog and Excel export.
- Suites: extend `export-xlsx` checks; new `custom-poms` assertions inside
  the existing export/contract harnesses; goldens untouched (auto pipeline
  unchanged).

Out of scope (see overview Non-Goals): standard-16 renumbering, custom-POM
auto-detection, rule-JSON mutation, PDF changes.

## Risk Classification

Risk flags (intake, 2026-07-10):

- Public contracts — the 16-POM set is versioned; we EXTEND alongside it.
- Existing behavior — Export Excel format changes (column subset).
- Data model — project file gains `customPoms`, `sizeSelection`,
  `gradeRules` v2; needs load-time migration for old projects.
- Multi-domain — spec panel + export + project IO + dialogs.

Lane: **high-risk** (4 flags). Hard gates: none (no auth/data-loss/provider),
but project-file migration must be lossless and reversible (old projects load
unchanged; new fields default sensibly when absent).

## Work Phases

1. **Discovery** — map exact touch points in `export-xlsx.js`, `spec-panel.js`,
   `project-io.js`, dialogs, state; write findings into design.md.
2. **Design freeze** — data shapes (`customPoms`, `sizeSelection`,
   `gradeRules` v2), dialog wireframes-in-words, export column algebra
   (formula base present/absent), ADR.
3. **Implement in 4 slices**, each independently green:
   S1 data model + project IO round-trip;
   S2 size-picker dialog + export column subset;
   S3 grading dialog (view + edit + reset);
   S4 custom POM add/remove + panel/export parity.
4. **Validation** — suite battery + hand-verified xlsx (openpyxl + Excel
   fraction/formula spot checks) + docs updates + decision record.

## Decision Records

- New ADR: "0018 Custom POMs extend, never mutate, the 16-POM contract"
  (numbering continues 17+; custom POMs live in project state; rule JSON
  untouched; hidden-POM mechanism remains the way to drop POMs per style).

## Rollback

All state additions are additive with absent-field defaults; reverting the
build restores prior behavior and old projects were never rewritten.
