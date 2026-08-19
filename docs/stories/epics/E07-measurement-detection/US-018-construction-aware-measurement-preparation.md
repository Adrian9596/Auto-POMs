# US-018 Construction-aware measurement preparation

## Status

implemented

## Lane

normal

## Product Contract

The `measurement-construction-evidence` work tag has an English preparation and
handoff plan that replaces large-sketch-library-first work with OpenCV
construction detection, TD calibration, construction-filtered approved
measurement evidence, governed QA, and explicit abstention.

## Relevant Product Docs

- `CONSTRUCTION_AWARE_MEASUREMENT_PREPARATION.md`
- `MEASUREMENT_EVIDENCE_AND_ACCURACY_PLAN.md`
- `measurement detection wflow.md`
- `docs/decisions/0024-hybrid-calibrated-similar-style-suggestions.md`

## Acceptance Criteria

- The current work tag and revised first-path objective are explicit.
- Exactly three evidence sources are defined for the tag.
- Front zipper and hook-and-eye signals, confidence, and hard negatives are
  specified.
- The small labelled fixture set replaces a large production sketch library as
  the first image-data dependency.
- Measurement-library metadata and eligibility preparation are defined.
- Phases, gates, technical limitations, and TD decisions are explicit.
- Coordinator and specialist subagents have non-overlapping deliverables and
  do-not-touch boundaries.
- Parallel-safe waves and validation metrics are documented.

## Design Notes

- Commands: Harness intake/story/trace and documentation verification.
- API: no runtime API is introduced in this documentation story.
- Domain rules: construction evidence gates library eligibility and confidence;
  it does not directly assign a measurement.
- UI surfaces: future construction review, calibration, and per-POM evidence.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Required sections, taxonomy, evidence, and subagent vocabulary exist. |
| Integration | Preparation order connects OpenCV observations through construction rules to measurement QA. |
| E2E | Not applicable; docs-only preparation story. |
| Platform | Offline browser and no-large-sketch-library constraints are explicit. |
| Release | Runtime remains gated on fixture and measurement accuracy evidence. |

## Harness Delta

Recorded initiative intake #3 and US-018. No runtime proof is claimed.

## Evidence

- Documentation structure and vocabulary checks.
- Harness story verification command.
