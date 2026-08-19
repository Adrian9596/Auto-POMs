# US-017 Measurement evidence and accuracy plan

## Status

implemented

## Lane

normal

## Product Contract

The project has one English plan defining the three measurement evidence
sources, accurate-decision gates, Historical Sketch Library contract, OpenCV
scope, technical limitations, delivery priorities, validation ladder, and
agent/subagent preparation boundaries.

## Relevant Product Docs

- `MEASUREMENT_EVIDENCE_AND_ACCURACY_PLAN.md`
- `measurement detection wflow.md`
- `docs/decisions/0024-hybrid-calibrated-similar-style-suggestions.md`
- `docs/product/measurement-library.md`

## Acceptance Criteria

- Exactly three evidence sources are defined without double-counting pixel and
  library corroboration.
- High-confidence, review-required, and abstention behavior are explicit.
- Historical sketch identity, approval, provenance, sparsity, duplicate, and
  independent-family rules are explicit.
- OpenCV capabilities and limitations are separated from library and decision
  logic.
- SAM/ML is positioned as a benchmark-gated research fallback.
- Work is sequenced by dependency and validation value.
- Coordinator and specialist agent/subagent roles have explicit deliverables
  and do-not-touch boundaries.

## Design Notes

- Commands: Harness intake/story/trace and documentation checks.
- Domain rules: no runtime change in this story.
- UI surfaces: future calibration, Similar Styles, and per-POM evidence review.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Required plan sections and three-source/high-confidence vocabulary exist. |
| Integration | Priority order connects library, OpenCV, retrieval, estimator, QA, and UI. |
| E2E | Not applicable; docs-only plan. |
| Platform | Offline/browser constraints remain explicit. |
| Release | Runtime work remains gated on retrieval and accuracy benchmarks. |

## Harness Delta

Recorded initiative intake and US-017 story. Runtime proof rows remain false
because this story delivers a reviewed plan, not product behavior.

## Evidence

- Documentation structure and vocabulary checks.
- Harness story verification command.
