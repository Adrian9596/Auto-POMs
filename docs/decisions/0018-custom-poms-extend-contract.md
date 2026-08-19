# 0018 Custom POMs extend, never mutate, the 16-POM contract

Date: 2026-07-10

## Status

Accepted.

## Context

Some styles need more than the 16 standard POMs; others use fewer. The 16-POM
set (`auto_mode_rules/pom-template.json`) is a versioned contract consumed by
the auto pipeline, its validator, and every suite — mutating it per style
would fork the contract. US-011 needs TD-defined POMs with full spec-panel,
grading, and export parity.

## Decision

- Custom POMs live in **project state** (`state.customPoms`, persisted in the
  project file), never in the rule JSON. Numbering continues from 17 per
  project (`nextCustomPomNumber`).
- The auto pipeline is untouched: detection, anchor seeding, and the fixture
  generator/validator still produce and accept exactly POMs 1–16
  (`load-rules.js` 16-row invariant, `validate-fixture.js` key checks).
  Custom POMs are Manual-mode lines the TD draws and labels.
- Parity surfaces resolve custom keys through the registry: `getPomInfo`
  (names), `getPomSpec` (spec fallbacks), the grading dialog
  (`gradingPomKeys`), and the Excel export (`allPomKeys`). Grading defaults
  to flat (no built-in deltas) until the TD edits it.
- "Fewer POMs" remains the hidden-POM mechanism (ADR 0010): hidden rows stay
  out of exports; the 16 template rows are never deleted.

## Alternatives Considered

1. Extending `pom-template.json` per project. Rejected: the rule JSON is a
   versioned, learning-immutable contract; per-style mutation breaks the
   determinism and contract suites.
2. Free-text POM IDs. Rejected by the TD (2026-07-10 interview): numeric
   continuation keeps the label-a-line-with-a-number workflow unchanged.

## Consequences

- Project files with custom POMs open in older builds minus the custom rows
  (unknown fields are dropped silently) — acceptable forward-compat loss.
- `getLabelText` falls back to `ann.seq`, which can collide with a custom
  number; the panel's extras section already renders such rows separately.
- The export's POM-number column is numeric (`Number(key)`), so custom keys
  must stay numeric — enforced by construction in the Add-POM UI.
