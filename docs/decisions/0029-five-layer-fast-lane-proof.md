# 0029 Five-Layer Fast Lane Proof

Date: 2026-07-14

## Status

Accepted

## Context

The evidence workbench exposed construction, scale, library, and row status,
but it still presented a confidence percentage when no measurement value
existed and made the TD operate controls that reflected internal pipeline
details. The next iteration needs stronger proof without turning five inference
layers into five user workflow stages.

## Decision

- Run five proof layers behind one analysis action: Visual Understanding,
  Landmark Geometry, Physical Scale, Library Corroboration, and Trust Decision.
- Show one compact five-layer proof receipt per POM. A layer reports `Pass`,
  `Weak`, `Missing`, or `Not applicable` with its direct evidence.
- A confidence percentage describes a numeric measurement proposal only. When
  no value is available, measurement confidence is blank even when some
  upstream evidence layers are strong.
- Synthetic cohort peers may demonstrate retrieval and disagreement behavior,
  but cannot satisfy the Library Corroboration gate for `Auto`. Auto requires
  the minimum count of approved production peers.
- Keep the five layers automatic. The fast lane asks the TD only for missing
  high-leverage evidence: confirm view roles, confirm construction, and confirm
  a view-local reference measurement.
- A TD-confirmed 3-inch or 3.75-inch back hook-and-eye height (mapped to POM 12
  Back Center Length) calibrates the back view only. It never calibrates front
  or inner views.
- TD confirmations are evidence for the active sketch and reset when a new
  sketch is loaded.
- Capture local pilot metrics for analysis time, TD actions, overrides, review
  rows, and time to lock. Metrics remain offline and are not an accuracy claim.

## Alternatives Considered

1. Present five separate workflow screens. Rejected because it increases TD
   time and makes internal architecture the user's responsibility.
2. Keep a confidence score on Insufficient rows. Rejected because upstream
   evidence coverage is not confidence in a missing numeric value.
3. Let eligible synthetic peers qualify Auto in the test lab. Rejected because
   it demonstrates the wrong production trust boundary.
4. Use confirmed hook-and-eye height as a page-wide scale. Rejected because
   separately drawn views may have different scales.

## Consequences

Positive:

- The TD sees why a number exists without traversing multiple screens.
- Missing evidence is explicit and cannot be disguised by a high aggregate
  score.
- Quick confirmation adds strong evidence with very few interactions.
- Pilot metrics can test whether the workflow actually saves time.

Tradeoffs:

- The current synthetic fixture will produce Review rather than Auto until
  approved joined peers exist.
- Landmark accuracy is still bounded by candidate geometry until ink-snapping
  improves.

## Follow-Up

- Run a back hook-and-eye pilot on real sketches for POM 11, 12, 13, and 15.
- Promote approved peers only through the governed library workflow.
