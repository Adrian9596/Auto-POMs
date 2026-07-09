# US-002 Export Excel Measurement Spec

## Status

implemented

## Lane

normal

_Intake (2026-07-08): change request implementing `EXPORT_IMPLEMENT_PLAN.md`.
Risk flags: 0–1 (no auth/authorization/data-migration/external systems; purely
additive client-side export; project format gains optional `depthRules` +
`pomSpecs[pom].sizeL2`, back-compatible without a `PROJECT_VERSION` bump).
`scripts/bin/harness-cli` is absent from the repo, so the durable story row
could not be recorded via the CLI — this file is the durable record._

## Product Contract

After the TD applies POM lines, an **Export Excel** toolbar button writes a
single offline `.xlsx` Measurement Spec: title band, `styleId - DD.Mon.YY`
header, the 16 POM rows (EN + 中文 + TOL as text), a full 14-column graded
size run (alpha S–5XL anchored on Size L; depth M2–5XL2 anchored on Size L2,
derived `L2 = L + offset` when not supplied), and the annotated board embedded
as a PNG below the table. No library, no template, no network.

## Relevant Product Docs

- `EXPORT_IMPLEMENT_PLAN.md` (plan of record)
- `Grading rules.md` (SC-derived grade tables — source of the deltas)
- `POMS_CONTRACT.md` (the fixed 16 POMs — unchanged)

## Acceptance Criteria

- Export Excel appears with the other exporters (post-Apply, `manual-only`)
  and produces a workbook Excel/Sheets/Numbers open without repair.
- Alpha run: `graded[size] = protoL + Δ-from-L[pom][size]`; a TD step override
  in `state.gradeRules` switches that POM to the constant-step model (dialog
  parity); held POMs flat.
- Depth run: `protoL2 = pomSpecs[pom].sizeL2 ?? protoL + offset[pom]`, cells
  `protoL2 + Δ-from-L2[pom][size2]`; band offsets 0; held flat.
- TOL / 中文 written as text (never coerced to dates); no-base rows blank.
- Sketch embedded via the Copy Image renderer; deterministic bytes for a
  frozen date; rule JSON untouched.

## Design Notes

- New source part `src/render/export-xlsx.js` (registered after
  `render/copy-image.js` in `scripts/source-parts.mjs`).
- Spec panel gains an optional **Size L2** column
  (`state.pomSpecs[pom].sizeL2`); `state.depthRules` holds per-POM L2-offset
  overrides, persisted + in history like `gradeRules`.
- Hand-rolled CRC32 + STORE-method ZIP writer (write-side mirror of the
  `import/pptx.js` reader); inline strings, one `oneCellAnchor` drawing.
- Test hooks: `__braAutoModeDebug.exportSpecXlsxBase64(isoDate)` and
  `.buildFullSizeRun(pomKey)`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run export-xlsx` — grade math (alpha/depth/held/explicit-L2/blank), part inventory, header order, text-vs-number cells, PNG header, byte-determinism |
| Integration | `npm run check` (part parses + wiring), `npm run autosave-check` (project-io/history changes) |
| E2E | `npm run smoke` (Auto pipeline unaffected); manual QA opening the file in Excel / Google Sheets / Numbers |
| Platform | n/a (single-page browser tool) |
| Release | n/a |

## Harness Delta

- Added `export-xlsx` npm suite (`scripts/export-xlsx-tests.mjs`) and its
  TESTING.md row; ARCHITECTURE.md module map updated.
- Friction: `scripts/bin/harness-cli` referenced by CLAUDE.md/AGENTS.md does
  not exist in the repo — intake rows and story updates cannot be recorded via
  the CLI.
