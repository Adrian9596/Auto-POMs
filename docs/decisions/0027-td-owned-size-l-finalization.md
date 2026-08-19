# 0027 TD-Owned Size L Finalization

Date: 2026-07-13

## Status

Accepted

## Context

The independent measurement lab could produce construction-aware numeric
suggestions and visible evidence traces, but it stopped before the TD could
resolve every POM into a final Size L specification. Exporting the suggestion
table directly would confuse generated evidence with a TD-owned result.

## Decision

- Every POM must receive one Final Size L Decision: accept the current
  suggestion, TD override, No Data, or Not Applicable.
- Rejecting a suggestion alone remains unresolved; the TD must replace it or
  choose a non-numeric resolution.
- A bulk action may accept only high-confidence Sketch Measurements. Medium,
  review-required, estimated, and library-prior values require an explicit TD
  action.
- Overrides accept decimal, fraction, and mixed-fraction inch input while the
  stored numeric value remains stable.
- The Final Size L Set can lock only when all 16 POMs are resolved against the
  current analysis run.
- Re-analysis invalidates the unlocked finalization draft. A locked set keeps
  its evidence snapshot and must be explicitly unlocked before analysis can
  change it.
- The final payload preserves the original suggestion, source, confidence,
  evidence trace, TD action, and final value for every POM.

## Alternatives Considered

1. Export suggestions as final values automatically. Rejected because the TD
   owns final measurements and review-required values need an explicit choice.
2. Require 16 individual clicks even for high-confidence calibrated results.
   Rejected because it adds work without adding meaningful review evidence.
3. Treat Reject as complete. Rejected because an applicable POM would still
   have no final resolution.

## Consequences

Positive:

- The shortest safe path accepts strong values in bulk and focuses TD time on
  uncertain rows.
- Final values stay auditable back to the exact analysis evidence.
- Partial or stale measurement sets cannot be labelled final.

Tradeoffs:

- Medium-confidence and library-prior rows still require TD action.
- Re-analysis deliberately clears an unlocked draft.

## Follow-Up

- Validate finalization behavior in the isolated offline lab.
- Integrate into production only after the final payload contract and TD review
  workflow are accepted.
