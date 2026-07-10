# US-008 Engineering Workflow Phase 8 — Learn geometry bias from TD corrections

## Status

done (2026-07-10)

## Lane

normal

Intake: change request against the accepted `Engineering Workflow.md` plan
(Phase 8, the final phase). Risk flags: existing behavior (1 flag → normal).
Gap analysis against the plan's five items found most of Phase 8 already
implemented in `src/auto/learning/calibration-store.js`:

- Item 2 (offset residuals, never absolute coordinates) — done: `dx/dy`
  normalized residuals with `LEARNING_MIN_DELTA` / `LEARNING_OUTLIER_LIMIT`
  gates and the `predictedX/Y` unbiased-shadow so biased seeds never train
  against themselves.
- Item 4 (median bias applied to the next seed) — done: `getAnchorBias` with
  MAD-based conflict down-weighting, applied in `applyLearningBiasToAnchors`.
- Item 5 (resettable, local) — done: `localStorage` store + `resetLearning`.
- Item 3 (scoping) — partial: buckets scope by landmark kind + view role.

Net-new work: item 1 (stage attribution) and the rest of item 3 (semantic
part + style context recorded on samples). Harness friction: `harness-cli`
binary still absent; story file is the durable record.

## Product Contract

- Every recorded TD correction is attributed to the pipeline stage that
  likely caused it: `segmentation-weak`, `contour-missing`, `geometry-wrong`,
  `landmark-wrong`, or `anchor-nudge` (`unknown` when no detection context
  exists). Attribution uses the Phase 3 segmentation verdict, the Phase 6
  landmark QA layer, the Phase 5 geometry verdict, and the residual
  magnitude.
- Residual samples additionally carry the semantic part (bra construction
  vocabulary), the current style code, and the anchor's pre-correction
  confidence tier — context for future scoped bias, without changing the
  bucket key (existing learned data stays valid).
- The learning-data dialog shows the per-stage breakdown so the TD can see
  WHERE the engine loses accuracy, not just how often it is corrected.
- Bias math is unchanged: same buckets, same median/MAD/clamp, same
  application path. Learning stays optional, measurable, resettable, local,
  and never mutates rule JSON.

## Relevant Product Docs

- `Engineering Workflow.md` (Phase 8, stage 12 learn-bias contract)
- `docs/decisions/` learning-related ADRs

## Acceptance Criteria

- Residual samples persist `{dx, dy, ts, stage, part, style, conf}`;
  existing consumers (median bias, summaries) are unaffected.
- A small drag (< nudge limit) classifies as `anchor-nudge` regardless of
  detection state; a large drag with no detection classifies `unknown`; a
  large drag on a healthy detected landmark classifies `landmark-wrong`;
  projected landmarks classify `contour-missing`.
- `summarizeLearningStore` exposes `stageCounts`; the learning-data dialog
  renders the breakdown.
- Learning suite covers the classification; golden zero-drift.

## Design Notes

- `src/auto/detect/landmark-qa.js` — `semanticPartForAnchorKind(kind)`
  (Phase 5 vocabulary: bottomBand, cradle, centerFront, frontCup, sideSeam,
  backPanel, strap).
- `src/auto/learning/calibration-store.js` — `classifyResidualStage`,
  richer sample record, `stageCounts` in the summary.
- `src/auto/debug-api.js` — `learning.classifyResidual` test hook.
- `src/ui/dialogs/learning-data-dialog.js` — stage-breakdown line.
- `scripts/learning-tests.mjs` — new stage-attribution test.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | — |
| Integration | `npm run learning-tests` (new attribution test), `npm run evidence-tests`, `npm run meaning-tests` |
| E2E | `npm run smoke`, `npm run golden` (no drift) |
| Platform | — |
| Release | `npm run check` |

## Harness Delta

- `scripts/bin/harness-cli` absent (friction recorded; fallback matrix used).

## Evidence

All run 2026-07-10 on this change:

- `npm run build` — 55 parts; `npm run check` — pass.
- `npm run learning-tests` — 8/8 pass, including the new "Stage attribution +
  context recorded on corrections" test (nudge gate, classifier↔sample
  consistency, part/style/conf fields, stageCounts in the summary; the
  learning fixture's weak geometry frame correctly classifies large drags as
  geometry-wrong).
- `npm run evidence-tests` — pass.
- `npm run meaning-tests` — pass.
- `npm run smoke` — pass.
- `npm run golden` — PASS, no drift (bias math untouched).

Note: the learning-data dialog's stage-breakdown line is covered by
`npm run check` (syntax/wiring) and the exercised `summarizeLearningStore`
data path; the dialog renders it defensively (`stageCounts || {}`) so old
stores without stage fields show "recorded before stage tracking".
