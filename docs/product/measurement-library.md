# Measurement Library

## Purpose

The in-project measurement library is the governed knowledge layer for reusable
style, POM, feature, landmark, correction, and QA evidence. The browser remains
fully offline, and runtime behavior continues to use the fixed Auto-Mode
contracts unless a later phase deliberately extends them.

## Phase L0 Contract

Phase L0 establishes structure and contracts only. It provides:

- the `library/` domain folders and pending/approved boundaries;
- JSON Schemas for the manifest and each library domain;
- a manifest that fingerprints the current POM and anchor contracts;
- shared source, status, unit, size-system, and identity vocabularies;
- a global POM concept registry in which POM numbers are immutable;
- permanent reservations for the current Auto-Mode POMs 1-16; and
- POM 17 reserved for Neckline length with
  `reserved_pending_definition` status until its TD-approved definition exists.

Phase L0 does not import projects or workbooks, approve evidence, generate a
browser snapshot, or change detection/export behavior.

## Safety Rules

- The fixed rule JSON remains the geometry source of truth for POMs 1-16.
- Contract fingerprints must fail validation when the referenced rule files
  drift.
- Pending and approved locations remain explicit and separate.
- Unknown and ambiguous terms are not promoted to approved aliases.
- POM numbers are never reassigned, recycled, shifted, or inferred from source
  row order.
- All JSON output and validation are deterministic and offline.

## Source

The detailed architecture and later implementation phases are defined in
`Library Architecture.md`.
