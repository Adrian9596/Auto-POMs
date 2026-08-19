# US-016 Measurement Detection input/output contract

## Status

implemented

## Lane

normal

## Product Contract

Measurement Detection has one explicit system boundary covering sketch/views,
detected POM geometry, TD calibration measurements, approved retrieval
evidence, Hybrid Evidence Suggestions, QA statuses and provenance. Invalid or
insufficient evidence degrades explicitly and never fabricates a measurement.

## Relevant Product Docs

- `measurement detection wflow.md`
- `docs/product/measurement-library.md`
- `docs/decisions/0024-hybrid-calibrated-similar-style-suggestions.md`

## Acceptance Criteria

- Required and optional top-level inputs are defined with units, size, view,
  identity, evidence and contract-version boundaries.
- Top-level and per-POM outputs define values, statuses, evidence, provenance
  and structured issues.
- Invalid calibration, sparse/duplicate peers, stale contracts and cross-view
  scaling have explicit blocking/degraded behavior.
- The POM 13 calibration to POM 12 suggestion is represented as a complete
  input/output example.
- Output invariants protect TD ownership, determinism and inspectable evidence.
- The contract recognizes exactly three evidence sources and prevents
  pixel-only, library-only or similarity-only evidence from receiving high
  confidence.
- Every workflow stage that changes the measurement data shape names its input
  and output.

## Design Notes

- Commands: documentation checks and Harness durable records only.
- API: future internal objects `MeasurementDetectionInput` and
  `MeasurementDetectionOutput`; no runtime endpoint is introduced by this
  story.
- Domain rules: Calibration Measurement, Hybrid Evidence Suggestion and
  Duplicate Style Measurement use the definitions in `docs/GLOSSARY.md`.
- UI surfaces: future Similar Styles and per-POM evidence panels.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Documentation contains required input/output/status/invariant sections. |
| Integration | Workflow example carries calibration, geometry, peer and decision evidence end to end. |
| E2E | Not applicable; docs-only contract. |
| Platform | Not applicable; offline/browser behavior unchanged. |
| Release | Runtime implementation remains gated on `npm run accuracy`. |

## Harness Delta

Recorded change-request intake, story and standard trace. Updated ADR 0024's
CLI-registration follow-up to current state.

## Evidence

- `rg` checks for stage input/output coverage and contract vocabulary.
- Harness story record `US-016`.
