# Governed Measurement Library

This directory is the versioned, offline knowledge layer for Bra Auto Measure.
It separates source intake, pending evidence, TD-approved evidence, corrections,
and rebuildable outputs so that unreviewed data cannot influence production
retrieval or suggestions.

## Source-of-truth order

1. `../auto_mode_rules/pom-template.json` and
   `../auto_mode_rules/anchor-schema.json` define the fixed Auto-Mode geometry
   contract for the core POM range (1–18 since ADR 0032). The range itself is
   declared once, in `pom-definitions/contract-reference.json`
   (`numbering_policy.core_range`) — read it from there rather than restating
   the bound.
2. Records in an `approved/` or `approved-evidence/` directory are governed
   library truth.
3. Saved project JSON and archived project snapshots are rich pending sources.
4. Measurement Spec workbooks are auditable pending measurement sources.
5. Corrections remain pending until reviewed and promoted.
6. `similarity-index/generated/` and `snapshots/` are derived and rebuildable.

The detailed architecture and workflow are defined in
[`../Library Architecture.md`](../Library%20Architecture.md).

## Phase L0 contents

- `manifest.json` identifies every contract and library version.
- `schemas/` contains JSON Schema 2020-12 contracts for each domain.
- `references/` contains controlled enums and the current size-system
  membership.
- `pom-definitions/contract-reference.json` fingerprints the current rule files
  and owns the immutable global POM concept registry.
- `pom-definitions/aliases-approved.json` contains only TD-approved aliases and
  never-merge rules.
- `pom-definitions/aliases-pending.json` holds candidate mappings that cannot be
  used automatically.
- Empty domain directories contain `.gitkeep` placeholders until their phase is
  implemented.

POM numbers 1–18 are permanently bound to the current contract. ADR 0032
promoted POM 17 (`neckline_length`) from its reservation and added POM 18
(`armhole_curve_length`); both are `active_contract` and carry a TD-approved
method, view, landmarks, and labels. New concepts begin at
`numbering_policy.next_assignable_number` (19) after approval or explicit
reservation. Numbers are never recycled.

### How a source POM number maps to a concept

Source POM numbers are not globally stable, so `scripts/library-intake.mjs`
treats the number as sufficient evidence only where it always has been:

- **1–16** — bound to the same concept since inception, so the row's number
  alone resolves the concept.
- **17 and above** — these were custom-POM slots before ADR 0032 (the custom
  floor was 16), and the legacy corpus really does reuse them for other
  measurements (17 appears as "Strap width", "Back panel height", "Shoulder
  strap length", "Hook and eye width"; 18 as "Strap width", "Shoulder strap
  length"). The number is therefore only a hint, and the row must also carry
  confirming evidence:
  - a **Measurement Spec workbook** row must match the canonical English name
    or a TD-approved alias in `aliases-approved.json`;
  - a **saved project** is authoritative instead — a POM absent from
    `state.customPoms` is the core concept, even with no usable description.

  Without that evidence the row stays `pending_term_mapping` and raises
  `unresolved_or_custom_pom_number` for TD review, rather than silently
  entering the library under the wrong concept. A TD who labels a row
  differently should add an approved alias.

Widening the core range again needs no importer edit: the bound is read from
`numbering_policy.core_range.last`, and any newly added number requires term
confirmation by default.

## Safety boundaries

- Imported data always enters `pending`.
- Missing workbook rows mean `unknown_not_provided`, not absence.
- Pending aliases and fuzzy matches never resolve a concept automatically.
- Canonical measurements are stored in inches while source text and units are
  retained for audit.
- Runtime remains offline; no sketch or measurement data is sent over a network.
- Generated files must be reproducible and must not be edited by hand.

Phase L0 establishes contracts and folders only. Import, promotion, snapshot
generation, and similarity ranking belong to later phases.

## Phase L1 commands

Inventory candidate workbooks without importing them:

```sh
npm run library-intake -- inventory --root htm-tool=. --root measurements-2="../Measurements 2"
```

Import an exact current Measurement Spec workbook into a source-scoped pending
candidate:

```sh
npm run library-intake -- import-xlsx --input /path/to/current-export.xlsx
```

The legacy Size-L corpus uses a separate adapter so it cannot weaken the
current-export contract:

```sh
npm run library-intake -- import-legacy-size-l --input "../Measurements 2/library/_raw_intake/measurements_size_l.csv"
npm run library-intake-tests
```

All generated candidates remain `pending`. The commands never write approved
records or runtime snapshots.

Import a saved `bra-sketch-project` version 1 snapshot. Unknown formats and
versions fail closed:

```sh
npm run library-intake -- import-project \
  --input /path/to/project.json \
  --identity-decisions library/intake/identity-decisions.json \
  --output library/intake/projects/project.pending.json
```

`library/intake/identity-decisions.json` is the TD-reviewed bridge for older
sources that do not contain an explicit style version. Each decision is bound
to the source's exact SHA-256; changing the source invalidates the decision.
Identity confirmation does not approve measurements or geometry.

Link any resolved project/workbook candidates into pending evidence bundles:

```sh
npm run library-intake -- link-evidence \
  --input library/intake/projects/project.pending.json \
  --input library/intake/exports/workbook.pending.json \
  --identity-decisions library/intake/identity-decisions.json \
  --output library/reports/intake/evidence-bundles.v1.json
```

The linker deduplicates exact source fingerprints, joins only on confirmed
`style_id + style_version`, keeps original and annotated images distinct, and
reports disagreeing POM/size values as approval-blocking conflicts. Linking
never writes approved evidence.

Generate the TD review queue from a pending candidate:

```sh
npm run library-intake -- report-td-review \
  --input library/intake/exports/measurements-size-l.pending.json \
  --csv library/reports/intake/td-review.v1.csv \
  --html library/reports/intake/td-review.v1.html \
  --output library/reports/intake/td-review.v1.json
```

The CSV is the editable TD handoff. Candidate mappings in all three report
formats are advisory and never update the library automatically.

Validate the complete L0 foundation with:

```sh
npm run library-l0-tests
```
