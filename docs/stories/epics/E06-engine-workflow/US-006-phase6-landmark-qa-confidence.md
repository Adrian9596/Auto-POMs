# US-006 Engineering Workflow Phase 6 — Landmark QA and confidence

## Status

done (2026-07-10)

## Lane

normal

Intake: change request against the accepted `Engineering Workflow.md` plan
(Phase 6). Risk flags: existing behavior (1 flag → normal). No auth, data,
contract, or external-system surface. Harness friction: `scripts/bin/harness-cli`
binary is absent in this checkout, so this story file is the durable record and
`docs/TEST_MATRIX.md` is the fallback matrix (no `harness-cli story add` row
until the CLI is restored).

## Product Contract

Detection exposes a first-class landmark QA layer so weak landmarks cannot
become confident anchors:

- Every landmark kind (the 25 anchor-schema kinds) carries a **source class**:
  `detected`, `derived`, `projected`, or `missing` (anchors nudged by the
  learning loop are additionally marked `learned` at seed time).
- Per-landmark confidence tier and evidence carry into anchor placement — the
  seeded anchors read the landmark layer instead of recomputing their own
  verdicts, and each anchor record carries the landmark QA fields.
- QA notes explain weakness in the Engineering Workflow vocabulary: missing
  seam, weak contour, inferred geometry, projected landmark, poor view
  classification.
- Weak landmarks are marked `reviewRequired`; POM 14 (strap-top / strap-bottom)
  stays contractually always-verify (ADR 0012).
- Pure formalization: anchor positions, confidence tiers, review flags, and POM
  output are unchanged (`npm run golden` must not drift).

## Relevant Product Docs

- `Engineering Workflow.md` (Phase 6, stage 7 QA + confidence)
- `POMS_CONTRACT.md`
- `docs/decisions/0012-*` (POM 14 always-verify)

## Acceptance Criteria

- `detection.landmarkQa` exists after a detection run, with one entry per
  anchor-schema kind: source (fine provenance), sourceClass, confidence tier,
  numeric score where available, reviewRequired, notes, evidence.
- Seeded anchors and the landmark layer agree: same tier, same provenance, same
  reviewRequired, and a kind classified `missing` is never seeded (and vice
  versa).
- `strap-top` / `strap-bottom` landmark entries are always reviewRequired.
- The per-stage debug summary (`window.__braAutoModeDebug`) exposes the
  landmark QA layer instead of the "is Phase 6" placeholder note.
- Golden baselines unchanged; contract / invariants / limitations suites green.

## Design Notes

- Commands: none (internal engine layer).
- New source part `src/auto/detect/landmark-qa.js` —
  `buildLandmarkQaFromDetection(detection)`, a pure classifier over the
  finished detection object. Registered in `scripts/source-parts.mjs` before
  `src/auto-detection.js`.
- `src/auto-detection.js` attaches `detectionResult.landmarkQa` at assembly;
  `src/auto/anchors/seed-anchors.js` recomputes it at seed time (detection can
  be mutated between runs) and consumes it for confidence / source /
  reviewRequired instead of its local tables.
- `src/auto/debug-api.js` surfaces the layer in the stage debug summary.
- Domain rules: landmarks and anchors stay separate concepts; learning still
  never mutates rule JSON.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | — (no isolated unit runner; logic proven via contract assertions) |
| Integration | `npm run contract` (new P6.* assertions), `npm run invariants`, `npm run detection-limitations` |
| E2E | `npm run smoke`, `npm run golden` (no drift) |
| Platform | — |
| Release | `npm run check` |

## Harness Delta

- `scripts/bin/harness-cli` absent again (recorded as friction; matrix fallback
  used). No other harness change.

## Evidence

All run 2026-07-10 on this change:

- `npm run build` — 55 source parts (landmark-qa.js added).
- `npm run check` — pass.
- `npm run smoke` — status pass, validation pass, no failures.
- `npm run golden` — PASS, maxDrift 0.0000 on all 9 fixtures (no drift).
- `npm run contract` — PASS 937/937 assertions (includes the six new
  `P6.*` assertions on all 12 fixtures: layer-present, anchor-consistency,
  presence-consistency, source-class-enum, weak-never-confident,
  pom14-always-verify).
- `npm run invariants` — PASS 209/209.
- `npm run detection-limitations` — POM 6 / POM 7 / POM 14 / view-role hard
  guards all pass.
