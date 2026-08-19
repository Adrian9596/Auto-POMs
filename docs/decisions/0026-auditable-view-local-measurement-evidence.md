# 0026 Auditable View-Local Measurement Evidence

Date: 2026-07-13

## Status

Accepted

## Context

The independent lab could render 16 candidate rows and produce deterministic
engine results, but the visible page did not prove how a numeric result was
derived. It also used one page-wide scale even when front and back technical
views could be drawn at different sizes. POM 15 and POM 16 therefore could not
safely move beyond `NO_DATA`.

## Decision

- Detect and label sketch views before deriving POM paths.
- Keep calibration and scale local to one view; never transfer a front scale to
  a back view automatically.
- Every numeric proposal must expose a Measurement Evidence Trace containing
  view region, anchors, pixel length, scale source, formula, and decision.
- POM 15 and POM 16 may produce a numeric proposal when their required view,
  anchor pair, and view-local scale exist.
- Low-confidence but complete evidence keeps the numeric proposal and returns
  `REVIEW_REQUIRED`; missing view, anchor, or scale returns no numeric value.
- POM 14 remains a library prior / review outcome because its front-to-back
  curved path cannot be established from separated 2D views in this phase.
- Without TD-confirmed calibration, a numeric result is an
  `ESTIMATED_SUGGESTION`, never a Sketch Measurement.

## Alternatives Considered

1. Keep one page-wide scale. Rejected because separate views may be drawn at
   different scales.
2. Fill POM 15 and POM 16 from library medians. Rejected because no approved
   governed peers exist for those POMs and it would not prove sketch analysis.
3. Hide evidence in the JSON payload only. Rejected because the TD cannot audit
   the result on the page.

## Consequences

Positive:

- The page visibly proves which observations produced each proposal.
- Front and back measurements cannot silently share an invalid scale.
- POM 15 and POM 16 can be exercised without fabricating library evidence.

Tradeoffs:

- Each view needs its own calibration before results qualify as Sketch
  Measurements.
- Heuristic view and anchor candidates remain test evidence, not production
  accuracy proof.

## Follow-Up

- Validate view segmentation and POM 15/16 anchors against the bundled demo
  sketches.
- Integrate only after the isolated lab exposes stable evidence and review
  behavior.
