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

## Phase L1 Pending Intake and Linking

Phase L1A adds deterministic source inventory and source-scoped pending intake:

- candidate `.xlsx` files are fingerprinted and classified from their actual
  sheet/header evidence rather than their filenames;
- only the exact current `Measurement Spec` contract is eligible for the
  current-workbook adapter;
- legacy measurement workbooks remain quarantined when their sheet, header,
  size, formula, or unit contract differs;
- the existing Measurements 2 Size-L CSV has a separate legacy adapter and
  enters only as source-scoped pending evidence;
- raw style ids, versions, terms, values, tolerances, and source paths are
  preserved without treating them as approved identity; and
- exact canonical terms may map, while unknown terms and POM 17+ remain
  unresolved for TD review.

The pending candidate schema exists because the governed style and value-set
schemas require a resolved style identity. Import must not fabricate that
identity. One style version is identified only by an explicit `style_id +
style_version`. Historical sources missing either field can be resolved only by
a TD-authored identity decision bound to the exact source SHA-256.

Saved-project intake supports the tested `bra-sketch-project` version 1
contract and quarantines unknown formats or versions. It preserves the complete
snapshot while extracting pending POM specifications, grading, applied geometry,
view/landmark references, source-image fingerprints, and available contract
versions. Missing versions remain explicit issues, not inferred values.

Resolved sources link into a pending evidence bundle by style-version identity.
Source and image artifacts retain independent SHA-256 fingerprints. Conflicting
POM/size values remain source-attributed blocking conflicts; no latest-file or
averaging rule is allowed. Phase L1 stops before promotion, approved-domain
writes, snapshots, recommendation changes, or learning evidence.

### TD review report

Pending observations are converted into a read-only review queue before any
approval workflow is built. Conflicts are shown first. Unresolved terms are
grouped by normalized spelling and ordered by observation count so one TD
decision can resolve repeated wording across many styles. Candidate concepts
are guarded suggestions only; the TD must still choose map, reject, or keep
pending.

## Safety Rules

- The fixed rule JSON remains the geometry source of truth for POMs 1-16.
- Contract fingerprints must fail validation when the referenced rule files
  drift.
- Pending and approved locations remain explicit and separate.
- Unknown and ambiguous terms are not promoted to approved aliases.
- POM numbers are never reassigned, recycled, shifted, or inferred from source
  row order.
- All JSON output and validation are deterministic and offline.
- A successful parse never implies approval.

## Source

The detailed architecture and later implementation phases are defined in
`Library Architecture.md`.
