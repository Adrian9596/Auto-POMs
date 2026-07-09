# 0009 Library-value measurement suggestions (Tier 0, suggest-not-assign)

Date: 2026-07-09

## Status

Accepted

## Context

`MEASUREMENTS_FROM_SKETCH_AND_LIBRARY.md` proposed an "Automatic Measurement
Engine" that turns each drafted POM line into a real-world measurement value —
Mode A (library median + default TOL) and Mode B (self-calibrated sketch
scaling) — and states the tool "assigns a measurement to every POM line by
itself … the tool never *waits* for [the TD]."

`MEASUREMENTS_PLAN_EVALUATION.md` (reviewer pass, 2026-07-09) flagged that
wording as a **blocker**: it conflicts with the charter's vision (a review-ready
set of POM *lines*), the non-goals (grading/fit are adjacent tools), and the
guiding principle "the TD corrects, the tool never overrides." Its
recommendation: record a decision resolving scope before building, ship **Tier 0
(Mode A) only** as a *suggestion* layer, and treat Mode B as research-gated
because it cannot be validated yet — the `accuracy` ground-truth corpus is empty.

Two facts settled during intake:

- The referenced corpus **exists**, in the sibling repo `../Measurements 2/`
  (`library/_raw_intake/measurements_size_l.csv` + `library/pom_concepts.csv`,
  `pom_tol_defaults.csv`, `sketch_ratios.csv`). It yields median/range/TOL/
  sketch-reliability for **POMs 1–14** from 225 style-versions. **POMs 15 & 16
  have no corpus rows.**
- The panel already renders a per-POM `refL` and `getPomSpec()` already falls
  back to built-in defaults for the English/中文 name columns; the wiring to
  pre-fill Size L / TOL is a small extension of an existing pattern.

## Decision

Ship a **Tier-0 library-value suggestion layer** that is explicitly
**suggest, not assign**:

- **Suggestions, TD-owned.** Each POM's Size L (and default TOL) cell is
  **pre-filled** with a corpus-derived value, shown muted with a
  "library · <confidence>" badge and a provenance tooltip. The TD may accept or
  type over any value; an override always wins and is never clobbered by
  regeneration. Suggestions are a display/compute fallback in `getPomSpec()` and
  are **never persisted** into `state.pomSpecs` — so a regenerated corpus
  refreshes every POM the TD has not touched, and saved projects only carry TD
  overrides.
- **Tier 0 (Mode A) only.** Library median + default TOL for POMs 1–14; POMs
  15/16 stay **blank with a "no data" badge** (no fabricated number). **Mode B
  (sketch self-calibration) is deferred** until a ground-truth corpus exists to
  validate it per-POM against `accuracy`; this also sidesteps the evaluation's
  calibration-precedence and per-view-scale findings, since Tier 0 does **not**
  touch `state.calibration`.
- **Derived, never hand-edited.** The values live in a generated artifact,
  `auto_mode_rules/sizeL-suggestions.json`, produced by
  `scripts/generate-sizeL-suggestions.mjs` from the approved corpus (join on
  canonical *concept*, not POM number) — honoring the provenance rule in
  `Measurements 2/KNOWLEDGE_BASE_PLAN.md` and this repo's "learning never
  mutates rule JSON" invariant (this is a new derived file, not a mutation of
  the versioned `pom-template.json` / `anchor-schema.json` contract).
- **Units: inches, following scale.** Values are stored in inches (the corpus
  unit); the default working unit is already `in`. Display converts only when
  the TD has switched the scale to cm.
- **The export reflects the panel.** Because suggestions flow through
  `getPomSpec()`, the size-run dialog and the Excel export grade from a POM's
  suggestion when the TD has entered no explicit Size L. This is intentional and
  consistent (what the panel shows is what exports); the TD overrides before
  finalizing. Only POMs 15/16 (no data) export blank.

## Alternatives Considered

1. Implement the plan literally — auto-*assign* final values, tool never waits.
   Rejected: direct conflict with the charter (evaluation Finding 1).
2. Ship Mode B (sketch-scaled) now. Rejected: unvalidatable (empty `accuracy`
   corpus) and statistically weak per view (front_inner has only 2
   sketch-reliable POMs); deferred as research-gated.
3. Hand-type the §6 table into the rule JSON. Rejected: violates the corpus
   provenance rule; a generator + checked-in JSON keeps it reproducible.
4. Keep suggestions out of the Excel export (panel-only). Rejected as
   inconsistent — the panel would show a value the export ignores.

## Consequences

Positive:

- The TD opens a sketch and sees 14/16 POMs pre-filled with real library values
  to accept or correct, instead of blank cells — the tool no longer waits on the
  TD, without overriding them.
- Tolerance chips and the Excel/size-run export become useful with no manual
  Size-L entry, while every value stays a one-keystroke override.
- Fully offline and deterministic: values are checked in and inlined into
  `app.js`; the corpus is a build-time-only input.

Tradeoffs:

- The Excel export now grades un-entered POMs from library medians (previously
  blank). Intended; `export-xlsx` expectations were updated accordingly.
- Suggestion numbers are a population prior, not style-specific — capped at
  `medium` confidence, and widest-range POMs (9, 12, 14) are weak priors.
- POMs 15/16 remain unserved until the corpus gains those concepts.

## Follow-Up

- Generator + data: `scripts/generate-sizeL-suggestions.mjs` →
  `auto_mode_rules/sizeL-suggestions.json` (regenerate with
  `npm run generate-suggestions`). Verified by `npm run suggestions-tests`.
- `scripts/bin/harness-cli decision add` is **skipped**: the CLI binary is
  absent on this machine (`scripts/bin/` is empty). Backfill the durable
  decision row when the binary is available (same as 0008).
- Mode B remains a future tier, gated on growing the `accuracy` ground-truth
  corpus (charter milestones M3/M4) so it can be validated per-POM before any
  sketch-scaled value is shown.
