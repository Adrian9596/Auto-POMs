# 0020 Preserve Complete Project Snapshots as Pending Evidence

Date: 2026-07-11

## Status

Accepted

## Context

Saved Bra Auto Measure projects contain richer geometry and provenance than a
Measurement Spec workbook. Importing only measurement values would discard
future landmark evidence, while treating the snapshot as approved learning
evidence would bypass TD review and cross phase boundaries.

## Decision

Library Phase L1 fingerprints and preserves the complete saved project
snapshot. It extracts only governed pending evidence:

- explicit style identity and source metadata;
- POM specification values, tolerance, grading, and descriptions;
- applied POM geometry with view and anchor references;
- source-image fingerprints; and
- detector, POM-rule, anchor-schema, and project versions.

Extracted geometry remains pending raw evidence. Phase L1 does not convert it
into approved landmark, correction, or learning evidence; that promotion and
normalization belongs to Phase L4.

Every image artifact receives an exact SHA-256 fingerprint. The original
project sketch and a workbook's embedded annotated PNG remain distinct image
artifacts with distinct fingerprints. They join a pending evidence bundle only
through confirmed Style Version Identity or an explicit exact fingerprint
reference stored by the project. Filenames, folder paths, visual similarity,
and perceptual matching never establish image identity in Phase L1.

Governed project intake is fail-closed by project format and version. Phase L1
supports only explicitly tested `bra-sketch-project` version 1. Unknown formats
or versions are quarantined until a dedicated fixture and adapter are added;
the importer does not copy the browser loader's permissive behavior.

## Alternatives Considered

1. Import measurement values only and discard project geometry.
2. Convert imported geometry directly into approved landmark evidence.
3. Delay all project ingestion until Phase L4.

## Consequences

Positive:

- Rich source evidence is retained without influencing runtime behavior.
- Later geometry work can be reproduced from the original snapshot.
- Phase L1 and Phase L4 retain a clear approval boundary.
- Visually similar or re-rendered images cannot be silently conflated.
- Format drift cannot silently change governed evidence.

Tradeoffs:

- Pending intake records carry more provenance and require an additional
  project-intake schema.
- Geometry remains unavailable to production learning until later review.
- Annotated export images remain separate from their original sketches unless
  an explicit source relationship is present.
- Each future project format version requires an explicit adapter and proof.

## Follow-Up

- Add deterministic project-import fixtures and schema validation.
- Define the exact project fields extracted from every supported project
  version.
- Add rejection fixtures for unknown formats and versions.
