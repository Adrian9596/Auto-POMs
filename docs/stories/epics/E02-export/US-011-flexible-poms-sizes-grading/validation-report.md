# Validation Report — US-011 Flexible POMs, size-selective export, editable grading

Date: 2026-07-10. Implemented in four slices (S1 data model, S2 size picker,
S3 grading dialog, S4 custom POMs) + a post-review fix pass.

## Automated suites (final state, after review fixes)

| Suite | Result | Notes |
|---|---|---|
| `check` | PASS | 57 source parts (2 new dialogs registered) |
| `export-xlsx` | PASS | + new assertions: L-only / alpha-only / depth-only subset layouts, relocated base columns, base-absent cached fallback, per-size override drives formulas, custom POM 17 row/name/base/flat-formulas, customPoms round-trip |
| `export-hidden` | PASS | hidden exclusion holds, custom keys null-safe in pairing expansion |
| `autosave-check` | PASS | new fields ride buildProjectSnapshot |
| `contract` | PASS 1032/1032 | auto pipeline untouched |
| `invariants` | PASS 209/209 | |
| `golden` | PASS, zero drift | REQUIRED: US-011 must not move the auto pipeline — it didn't |
| `smoke` | PASS, failures: [] | re-run after review fixes |

## Targeted headless probes

- **S1 migration**: synthetic pre-US-011 project (v1 `{step,hold}` gradeRules
  + separate depthRules) → loads as v2 container, steps + offsets preserved,
  legacy field gone, re-save emits v2. PASS.
- **S3 dialog DOM**: 16 rows × 15 sizes render; edit stores inches; override
  highlight; row reset clears; `-1 1/4` round-trips. PASS.
- **Fix probe**: `"3 /4"` rejected (was silently 3.0), `"1/0"` rejected,
  empty cell clears the override, Size Run dialog is read-only (no inputs,
  no reset). PASS.

## Adversarial reviews (2 independent read-only agents)

- **Contract/invariants lens**: CLEAN on all 7 claims (rule JSON untouched
  & 16 rows verified; no customPoms reference under src/auto/; hidden-POM
  exclusion incl. custom keys; part ordering; app.js byte-matches src;
  docs match code; template rows undeletable).
- **Correctness/migration lens**: migration, undo/redo, column algebra,
  hook save/restore, hidden/paired interactions, nextCustomPomNumber all
  CLEAN. Findings fixed: M1 (dual editing surfaces → Size Run now
  read-only preview), M2 (strict fraction parsing), m2 (empty = reset),
  m1 (Add-POM focus guard). Accepted: m3 (mixed unit conventions,
  pre-existing; documented in state.js).

## Manual TD verification (open items for the TD)

- Open an old project: loads unchanged, export defaults to all sizes,
  Grading dialog shows the standard rule.
- Export "Size L only" and open in Excel: no repair warnings; fractions
  render; re-export All: formulas live again.
- Add POM 17, label a line "17", grade it, export, verify row 20.

## Harness friction

- `scripts/bin/harness-cli` binary absent in this checkout — intake row and
  durable decision rows could not be registered via the CLI;
  `docs/TEST_MATRIX.md` used as the fallback matrix, decisions recorded as
  ADR 0018 + this story folder.
- The initial multi-agent implementation attempt stalled: background
  code-writing agents cannot answer permission prompts for build/suite
  commands in this environment. Discovery/synthesis/review agents (read-only)
  worked well; implementation ran in the main loop instead.
