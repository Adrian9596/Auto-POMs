# US-019 Measurement preparation work packet

## Status

Implemented preparation; runtime remains gated.

## Lane

Normal.

## Product Contract

The repository has a deterministic, source-fingerprinted preparation packet
that separates current Tier-0 population statistics, per-POM evidence strategy,
and governed-library readiness. It records agreed behavior without inferring
construction labels, calibration compatibility, peer thresholds, or release
gates that still require TD decisions.

## Relevant Product Docs

- `CONSTRUCTION_AWARE_MEASUREMENT_PREPARATION.md`
- `MEASUREMENT_EVIDENCE_AND_ACCURACY_PLAN.md`
- `docs/decisions/0024-hybrid-calibrated-similar-style-suggestions.md`
- `docs/GLOSSARY.md`

## Acceptance Criteria

- POMs 1-14 are the Phase-1 numeric scope; POMs 15-16 are `no_data`.
- POMs 1-4 use a Library Prior capped at medium confidence.
- POM 14 placement evidence is not treated as numeric pixel evidence.
- Tier-0 population statistics are snapshotted without claiming accuracy.
- Pending and governed library readiness are reported separately.
- No construction label, calibration matrix, threshold, or release decision is
  silently inferred.
- Reports are reproducible and `--check` fails if they become stale.

## Deliverables

- `scripts/measurement-preparation-report.mjs`
- `library/reports/evaluation/tier0-population-baseline.v1.json`
- `library/reports/coverage/measurement-evidence-matrix.v1.json`
- `library/reports/coverage/construction-library-viability.v1.json`
- `docs/stories/epics/E07-measurement-detection/measurement-suggestion.schema.draft.json`

## Validation

```text
npm run measurement-prep-check
npm run suggestions-tests
npm run library-l0-tests
npm run contract
npm run invariants
```

## Explicit Runtime Boundary

This story does not enable a construction detector, Hybrid Evidence estimator,
measurement UI, learning behavior, or export behavior. Runtime work remains
blocked on the TD decisions listed in the evidence matrix.

