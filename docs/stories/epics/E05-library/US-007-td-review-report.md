# US-007 TD Review Report for Pending Measurements

## Status

implemented

## Lane

normal

_Intake (2026-07-11): bounded continuation of Phase L1A. Risk flags: Existing
behavior and Weak proof. The report reads the pending intake candidate and
creates deterministic review artifacts. It cannot approve, promote, or mutate
library evidence._

## Product Contract

The TD receives one compact review queue instead of reviewing every unresolved
observation separately. Conflicting values appear first. Unresolved raw terms
are grouped conservatively by normalized spelling, ordered by corpus impact,
and accompanied by source counts, example styles, warnings, and advisory
canonical candidates.

Candidate concepts are review hints only. The report contains blank TD decision
columns and never changes aliases, mappings, pending records, approved records,
snapshots, or runtime suggestions.

## Acceptance Criteria

- All conflicts appear before unresolved-term rows.
- Equivalent case, punctuation, and whitespace variants share one review row
  while their original wording remains visible.
- Each unresolved group shows observation count, style count, source count,
  raw POM numbers, variants, example styles, and warnings.
- Candidate concepts use deterministic similarity plus component and
  measurement-dimension safety guards.
- Candidate concepts are visibly advisory and never applied automatically.
- CSV provides blank `td_action`, `approved_concept_id`, and `td_notes` fields.
- HTML is a readable, offline review view with conflicts first.
- Identical pending input produces byte-identical JSON, CSV, and HTML.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Grouping, priority, determinism, blank decision fields, and review-only wording |
| Integration | Library L0 validation and app wiring remain intact |
| E2E | Not required; generated offline report only |
| Platform | Local filesystem, no network |

## Evidence

- `npm run library-intake-tests` — pass, 22 focused assertions.
- The real report reduces 1,690 unresolved observations to 73 grouped term
  decisions plus 4 conflict decisions.
- The top 20 groups cover 1,589 of 1,690 unresolved observations.
- 62 of 73 groups have guarded advisory candidates; unsafe examples such as
  `Strap width → Cup width` and `Hook and eye width → Cup width` are suppressed.
- Generated JSON, CSV, and HTML are byte-deterministic.
- No approved folder, alias registry, snapshot, source rule, or browser runtime
  is changed.
- Harness CLI remains absent, so this checked-in story is the task record.
