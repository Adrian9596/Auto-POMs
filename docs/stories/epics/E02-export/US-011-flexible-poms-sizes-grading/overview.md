# Overview — US-011 Flexible POMs, size-selective export, editable grading

## Current Behavior

- The POM set is **fixed at 16** (`auto_mode_rules/pom-template.json`, versioned
  contract). The spec panel renders exactly 16 template slots; labels outside
  1–16 render as unnumbered extras with no spec row semantics.
- **Export Excel always emits the full 15-size run** (S–5XL alpha off Size L,
  M2–5XL2 depth off Size L2) — there is no way to export only Size L or a
  subset of sizes.
- **Grading deltas are invisible**: the alpha/depth per-POM deltas live as
  constants in `src/render/export-xlsx.js` (`SPEC_ALPHA_DELTA_L_IN`,
  `SPEC_DEPTH_DELTA_L2_IN`, `SPEC_DEPTH_OFFSET_IN`) plus optional
  `state.gradeRules`/`state.depthRules` constant-step overrides that have no
  UI. A TD cannot see or change the grade rule inside the tool.

## Target Behavior

1. **Size-selective export**: Export Excel opens a size-picker dialog — all 15
   sizes pre-checked, with one-click presets ("Size L only", "Alpha only",
   "Depth only", "All"). The selection is saved in the project file and
   pre-loaded next time. The exported sheet contains only the chosen size
   columns; live formulas still reference the base columns when the base
   (L or L2) is included, and fall back to cached values when it is not.
2. **Visible, editable grading**: a "Grading" dialog shows one row per POM with
   its per-size deltas (built-in values pre-filled), editable as fractions or
   decimals. Edits are stored per project (`state.gradeRules` v2, per-size
   deltas — superseding the constant-step-only shape) and drive the export
   formulas. A "Reset to standard" restores built-ins per POM or globally.
3. **Custom POMs (17+)**: an "Add POM" action in the spec panel creates the
   next free number (17, 18, …) with TD-entered EN/中文 names. A custom POM
   behaves with **full parity**: it appears as a panel row, is labelable on
   lines, carries Size L / L2 / TOL, has editable grade deltas (default: flat
   until the TD grades it), and exports identically to the built-in 16.
   Built-in POMs can be hidden per style today (`hiddenAnnIds`, ADR 0010) —
   that remains the "fewer POMs" mechanism and hidden POMs stay out of exports.

## Affected Users

- Technical designers (the only user role).

## Affected Product Docs

- `POMS_CONTRACT.md` (16-POM contract gains a custom-extension clause)
- `Grading rules.md` (rule becomes the *default*, not the only rule)
- `TESTING.md` (export suites)
- `ARCHITECTURE.md` (module map: new dialogs)

## Non-Goals

- Renaming or renumbering the standard 16 (immutable, ADR 0014).
- Auto-detection for custom POMs — they are Manual-mode lines the TD draws
  and labels; the auto pipeline still generates only the 16.
- Changing `pom-template.json` at runtime (learning never mutates rule JSON;
  custom POMs live in project/app state, not in the rule contract).
- PDF/Copy Image changes (they render the board, which already shows custom
  labeled lines).
