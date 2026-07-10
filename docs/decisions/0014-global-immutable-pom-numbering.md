# 0014 Global immutable POM concept numbering

Date: 2026-07-10

## Status

Accepted

## Context

Historical and future styles may contain fewer or more measurements than the
current fixed 16-POM Auto-Mode contract. Legacy workbooks also use inconsistent
terms, abbreviations, and row orders. If POM numbers were assigned separately
per style or by workbook row position, the same concept could become POM 17 in
one style and POM 18 or 19 in another. Matching, learning, retrieval, and export
history would then mix different measurement meanings under the same number.

The TD requires every measurement concept to keep one number across all styles.
Neckline length is the first planned additional concept and should remain POM 17
wherever it appears.

## Decision

Use a global POM concept registry with immutable TD-facing numbers.

- POMs 1–16 remain permanently reserved for the current Auto-Mode contract.
- POM 17 is reserved for `neckline_length` pending approval of its exact
  measurement method, view, landmarks, labels, and aliases.
- Additional approved concepts receive monotonically increasing numbers 18+.
- Numbers are never style-local, shifted, recycled, or assigned from row order.
- Internal joins use a stable canonical concept id; the number is its immutable
  TD-facing identity.
- Styles may contain a subset or superset of the registry. Their membership
  status is stored without padding, collapsing, or renumbering.
- Omitted legacy rows mean `unknown_not_provided` until applicability is
  resolved; omission does not mean `not_applicable`.
- Exact approved aliases may auto-map to an existing concept. Ambiguous or
  unknown terms remain pending; fuzzy matching may suggest candidates but may
  not approve them.
- Retired numbers remain reserved forever.
- The library may represent POM 17+, but the current detector/exporter remains
  fixed at 1–16 until its geometry and output contracts are deliberately
  extended.

## Alternatives Considered

1. Number POMs sequentially inside each style. Rejected because the same number
   would represent different measurements across styles.
2. Renumber every style against a preferred template during import. Rejected
   because it destroys source traceability and still fails on unknown terms.
3. Match legacy terms fuzzily and allocate numbers automatically. Rejected
   because similar wording can describe different measurement methods.
4. Use only opaque concept ids and no stable numbers. Rejected because TDs and
   exports need durable human-readable POM numbers.

## Consequences

Positive:

- Neckline length remains POM 17 in every style.
- Old and new styles can have different POM counts without identity drift.
- Retrieval and learning compare canonical meanings rather than row positions.
- Historical records remain interpretable after concepts are added or retired.

Tradeoffs:

- New concepts require controlled review before receiving a production number.
- Importers need alias, ambiguity, never-merge, and membership-status handling.
- The browser UI and exporter need a future contract change before they can
  produce POM 17+ automatically.

## Follow-Up

- Create the library POM registry schema and immutable-number validation.
- Confirm the exact definition of Neckline length before moving POM 17 from
  reserved to approved.
- Add approved aliases and never-merge rules from legacy workbooks.
- Add variable-count, ambiguity, retirement, and cross-style numbering tests.
- Register this decision with Harness when `scripts/bin/harness-cli` is restored.
