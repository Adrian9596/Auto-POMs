# US-020 Independent Construction-Aware Measurement Lab

## Status

implemented

## Lane

normal

## Product Contract

Provide an isolated, fully offline browser lab under `test/` that detects construction signals from a technical sketch, selects only compatible construction peers, and exposes how calibration, pixel geometry, library priors, disagreement, and abstention produce each measurement outcome.

## Relevant Product Docs

- `CONSTRUCTION_AWARE_MEASUREMENT_PREPARATION.md`
- `MEASUREMENT_EVIDENCE_AND_ACCURACY_PLAN.md`
- `LIBRARY_CONSTRUCTION_TAXONOMY.md`
- `docs/decisions/0024-hybrid-calibrated-similar-style-suggestions.md`
- `docs/decisions/0025-isolated-synthetic-construction-cohorts.md`
- `test/TEST.md`

## Acceptance Criteria

- The lab runs without network access and carries its own OpenCV.js, sketches, cohort fixture, and prior snapshot.
- Real construction-roster counts are distinct from synthetic measurement-peer counts and production-approved peer counts.
- Construction evidence may resolve to `unknown`; no classifier is forced to choose a closure.
- Explicit calibration outranks inferred scale; inferred scale outranks library prior.
- POM 14 uses library evidence for numeric value and detected geometry only for placement evidence.
- POM 15 and POM 16 may produce a numeric proposal only from their required
  view, complete anchor pair, and view-local scale.
- Every numeric row visibly exposes its Measurement Evidence Trace.
- Front and back calibration are independent and never shared automatically.
- The TD can resolve all 16 POMs into a locked Final Size L Set.
- Bulk acceptance is limited to high-confidence Sketch Measurements; all other
  generated values require an explicit TD decision.
- Locked output preserves both the final decision and its source evidence.
- Fewer than three compatible peers produces `INSUFFICIENT_PEERS`.
- Results expose source, confidence, evidence, agreement, and review reason.

## Design Notes

- Commands: `npm run construction-measurement-test`
- API: none; browser-only and offline
- Domain rules: construction hard-gates peers before numeric aggregation
- UI surfaces: sketch input, detected view regions, construction evidence,
  cohort counts, view-local calibration controls, measurement evidence trace
  table

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Pure estimator scenarios and cohort counts pass. |
| Integration | Local static browser loads vendored OpenCV and runs a demo sketch. |
| E2E | Not required for the isolated preparation lab. |
| Platform | Offline/no-network resource audit. |
| Release | Test-only; no production runtime integration. |

## Harness Delta

No new external capability is required.

## Evidence

- `node test/run-tests.mjs`
- browser smoke against `test/index.html`
- static resource audit in `test/run-tests.mjs`
- 2026-07-13 hang fix: `waitForCv` awaited `window.cv`, whose Emscripten
  `Module.then` resolves with itself — infinite microtask loop, tab hard-froze
  ("Page Unresponsive") and browser smoke timed out. Replaced with a
  `cv.Mat`/`cv.imread` poll (mirrors `opencv_real_api.js`); first analysis now
  runs immediately on the pixel fallback and re-runs when OpenCV is ready.
  Verified: page interactive at once, OpenCV ready ~13 s, 16 rows, browser
  smoke passes in ~3 s (13/13 engine checks green). Trap documented in
  `test/TEST.md`.
