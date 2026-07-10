# Governed Measurement Library

This directory is the versioned, offline knowledge layer for Bra Auto Measure.
It separates source intake, pending evidence, TD-approved evidence, corrections,
and rebuildable outputs so that unreviewed data cannot influence production
retrieval or suggestions.

## Source-of-truth order

1. `../auto_mode_rules/pom-template.json` and
   `../auto_mode_rules/anchor-schema.json` define the fixed Auto-Mode geometry
   contract for POMs 1–16.
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

POM numbers 1–16 are permanently bound to the current contract. POM 17 is
reserved for `neckline_length`, but it is not active: its method, view,
landmarks, labels, and aliases still require TD approval. New concepts begin at
18 only after approval or explicit reservation. Numbers are never recycled.

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

Validate the complete L0 foundation with:

```sh
npm run library-l0-tests
```
