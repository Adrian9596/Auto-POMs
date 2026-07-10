# US-005 Library Phase L0 Contracts

## Status

implemented

## Lane

normal

_Intake (2026-07-10): spec slice implementing only Phase L0 from
`Library Architecture.md`. Risk flags: Data model, Public contracts, and Weak
proof. The work adds versioned offline library contracts but does not change the
browser runtime, fixed POM geometry, exporter, or approval behavior.
`scripts/bin/harness-cli` is absent and this checkout is not a Git worktree, so
the durable intake/story rows cannot be recorded through the CLI; this story is
the checked-in task record._

## Product Contract

The project contains a governed `library/` foundation with explicit domain and
approval boundaries, parseable schemas, a versioned manifest tied to the live
POM/anchor contracts, and an immutable global POM registry. POMs 1-16 mirror
the current Auto-Mode contract; POM 17 is reserved for Neckline length but is
not usable until its exact definition is approved.

## Relevant Product Docs

- `docs/product/measurement-library.md`
- `Library Architecture.md`
- `POMS_CONTRACT.md`
- `auto_mode_rules/pom-template.json`
- `auto_mode_rules/anchor-schema.json`

## Acceptance Criteria

- The physical `library/` layout represents every L0 domain and its
  pending/approved or generated boundary.
- Every declared library domain has a JSON Schema and all checked-in L0 JSON
  artifacts parse and validate against their intended structural contracts.
- `library/manifest.json` and the POM contract reference contain the actual
  SHA-256 fingerprints of the current POM template and anchor schema.
- The global registry has one immutable canonical concept for each POM 1-16,
  using current contract names, labels, views, and anchor requirements.
- POM 17 is `neckline_length`, has immutable number 17, and remains
  `reserved_pending_definition` with no invented method, view, or landmarks.
- Approved aliases cannot contain an ambiguous or unreviewed mapping.
- A deterministic focused suite detects contract drift, duplicate/reused POM
  numbers, malformed schemas/JSON, and broken pending/approved boundaries.
- Existing build/wiring and fixed-POM contract checks continue to pass.

## Design Notes

- Commands: focused `npm` library-contract suite plus `npm run check` and
  `npm run contract`.
- API: none.
- Tables: none; Phase L0 is file-backed, versioned JSON.
- Domain rules: POM numbers are global and immutable; contract JSON is the
  source of truth for POMs 1-16; 17 is reserved but inactive.
- UI surfaces: none.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Focused L0 suite validates JSON structure, schemas, enums, numbering, and fingerprints |
| Integration | `npm run check`; `npm run contract` |
| E2E | Not required because Phase L0 is not loaded by the browser |
| Platform | n/a; offline file contracts |
| Release | n/a |

## Harness Delta

- Added the Phase L0 product contract and story packet.
- Harness friction: the CLI binary is absent, so intake, story status, proof,
  and trace rows cannot be written to `harness.db`.
- Repository friction: this folder has no usable Git worktree metadata, so
  changed-file evidence is gathered from the task's explicit file inventory.

## Evidence

- `npm run library-l0-tests` — pass; 11 schemas and all 19 library JSON files
  parse, the manifest and registry validate, both live fingerprints match, POM
  numbers 1-17 are unique/immutable, POMs 1-16 mirror the fixed contract, POM
  17 remains inactive, and alias/enum/size/similarity guards pass.
- Python `jsonschema` Draft 2020-12 metaschema check — pass for all 11 schemas.
- `npm run check` — pass; existing generated app build and wiring are intact.
- `npm run contract` — pass; 782/782 semantic POM assertions passed across the
  demo corpus (100 fixture-specific assertions skipped by their existing
  applicability gates).
- No `src/*`, `app.js`, fixed rule JSON, browser behavior, importer, approval,
  snapshot-generation, or ranking logic was changed.
