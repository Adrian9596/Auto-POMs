# US-006 Library Phase L1 — Inventory and Pending Ingestion

## Status

implemented

## Lane

normal

_Intake (2026-07-11): normal-lane spec slice implementing Phase L1 from
`Library Architecture.md`. Risk flags: Data model, Public contracts, and Weak
proof. The slice inventories candidate measurement sources, parses supported
saved-project JSON / Measurement Spec workbooks into deterministic pending
records, resolves missing identity only through fingerprint-bound TD decisions,
and links confirmed sources into pending evidence bundles. It does not approve
evidence, generate a runtime snapshot, or change detection/export behavior._

## Product Contract

An offline command inventories candidate measurement files and imports only
sources that satisfy an explicit supported-source contract. Every imported
record remains pending, preserves its source fingerprint and source values, and
maps POM terms only through the immutable registry or approved aliases. Unknown
or ambiguous terms remain unresolved for TD review.

## Relevant Product Docs

- `docs/product/measurement-library.md`
- `Library Architecture.md`
- `MEASUREMENT_REAL_WORKFLOW_AND_IMPLEMENT.md`
- `library/README.md`

## Acceptance Criteria

- Inventory output is deterministic and distinguishes supported measurement
  sources from references, generic tech packs, and unsupported workbooks.
- Re-importing the same source fingerprint does not create a second pending
  observation.
- Supported Measurement Spec rows preserve raw terms, row/cell provenance,
  values, formulas, TOL text, source units, and the workbook fingerprint.
- Canonical storage uses inches; unresolved or unsafe units are quarantined
  rather than guessed.
- Canonical concepts and approved aliases may map automatically; fuzzy,
  ambiguous, and unknown terms remain `pending_term_mapping`.
- Missing POM rows remain unresolved and never imply `not_applicable`.
- Output ordering and bytes are deterministic for identical source bytes and
  importer version.
- Saved-project intake supports only tested `bra-sketch-project` version 1 and
  quarantines unknown formats or versions.
- Complete project snapshots are retained while POM values, grading, applied
  geometry, image artifacts, and available contract versions are extracted as
  pending evidence.
- Canonical linking requires explicit `style_id + style_version`; missing
  identity can be supplied only by a TD decision bound to the exact source
  SHA-256.
- Original project sketches and workbook annotated images retain separate exact
  fingerprints and are never matched by filename or visual similarity.
- Matching identities link into one pending bundle; disagreeing POM/size values
  remain source-attributed blocking conflicts and are never averaged or
  resolved by newest-file precedence.
- Nothing is written to approved folders or runtime snapshots.

## Decision Boundary

This story resolves source identity but stops before evidence promotion. An
identity decision confirms only which style version a source belongs to; it
does not approve measurements, geometry, aliases, or images. Phase L2 owns
promotion authority and approval records.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Importer fixtures cover supported/unsupported sources, mapping, units, TOL, formulas, duplicate inputs, and deterministic output |
| Integration | Existing L0 contracts still pass and pending output validates against the governed schemas |
| E2E | Not required; Phase L1 is an offline build-time command and does not change the browser |
| Platform | Local filesystem only; no runtime network |

## Harness Delta

- Added the Phase L1 story packet and focused proof expectation.
- Harness friction: `scripts/bin/harness-cli` is absent, so durable intake,
  story, proof, and trace rows cannot be recorded in `harness.db`.

## Evidence

- Inventory scanned 40 workbooks: 0 exact current exports, 2 quarantined legacy
  measurement candidates, 2 references, 35 unrelated BOM workbooks, and 1
  byte-identical duplicate.
- The separate legacy adapter produced 2,950 pending Size-L observations across
  225 raw style ids. Exact canonical matching resolved 1,260 observations;
  1,690 remain `pending_term_mapping`.
- Four conflicting raw style/version/POM/size groups are preserved in
  `library/reports/conflicts/measurements-size-l.conflicts.json`; no values are
  averaged.
- `npm run library-intake-tests` — pass; the shared intake/review suite now
  contains 43 focused assertions.
- Draft 2020-12 schema validation — pass for the generated pending corpus,
  saved-project candidate, identity-decision registry, and linked bundle report.
- Regenerating inventory, pending corpus, and conflict report produced
  byte-identical SHA-256 results.
- `npm run library-l0-tests` — pass.
- `npm run check` — pass.
- `npm run contract` — pass, 1034/1034 assertions.
- Approved style/value/feature/landmark folders contain no generated records.
- Decisions 0019 and 0020 record explicit style-version identity, exact image
  fingerprints, conflict blocking, project snapshot preservation, and the
  fail-closed version boundary.
- Harness CLI remains absent, so no durable intake, story, decision, or trace
  row was recorded.
