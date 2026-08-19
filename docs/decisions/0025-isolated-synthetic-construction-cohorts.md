# 0025 Isolated Synthetic Construction Cohorts

Date: 2026-07-12

## Status

Accepted

## Context

The construction evidence roster identifies real styles and closure families, while the governed measurement intake does not yet join those construction records to approved measurement records by explicit style-version identity. A construction-aware measurement harness still needs multiple peers per cohort to exercise filtering, calibration, agreement, abstention, and review behavior.

## Decision

The independent measurement test harness may use a small synthetic construction-to-measurement fixture when all of the following remain true:

- real style names and closure labels retain their evidence provenance;
- synthetic measurement values are visibly and structurally labelled `synthetic_test_data`;
- fixture records live only under `test/` and never enter the governed `library/`;
- catalog style count, synthetic measurement peer count, and approved production peer count remain separate;
- insufficient real or synthetic peers produces abstention rather than a fabricated construction-aware value.

## Alternatives Considered

1. Treat construction-only catalog styles as approved measurement peers. Rejected because no governed measurement join exists.
2. Test only the global population prior. Rejected because it cannot exercise construction filtering.
3. Wait until every construction style has TD-approved measurements. Rejected because it blocks an isolated test of the estimator contract.

## Consequences

Positive:

- Construction filtering and evidence fusion can be tested offline now.
- Synthetic and governed evidence cannot be confused in the UI or data layout.
- Sparse cohorts such as `front_hook_and_eye` exercise safe abstention.

Tradeoffs:

- Accuracy conclusions cannot be drawn from synthetic fixture values.
- Cohort medians are test expectations, not production recommendations.

## Follow-Up

- Replace synthetic joins cohort by cohort when TD-approved construction and measurement records share explicit style-version identity.
- Keep the fixture as a regression suite after real cohorts become available.
