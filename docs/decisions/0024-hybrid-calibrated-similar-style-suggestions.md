# 0024 Hybrid calibrated similar-style measurement suggestions

Date: 2026-07-11

## Status

Accepted

## Context

Tier-0 measurement suggestions use a global Size-L population median and do
not vary with the current style. Sketch pixels provide proportions but not an
absolute unit scale. Similar styles provide historical values but may be wrong
for the current construction or proportion. None of these evidence sources is
safe enough to assign a final measurement alone.

## Decision

The target measurement workflow uses Hybrid Evidence Suggestions:

- the TD enters or confirms one or more Calibration Measurements;
- calibration is tied to its sketch view and converts detected pixel lengths
  into absolute geometry estimates;
- the tool retrieves multiple eligible TD-approved similar styles and computes
  a robust peer prior per POM;
- the estimator compares and combines geometry and peer evidence under
  per-POM QA gates;
- every suggestion exposes its calibration, pixel calculation, peers,
  provenance, disagreement and confidence; and
- the TD owns the final value and may accept, override or reject it.

The workflow recognizes exactly three evidence sources:

1. TD-confirmed measurement evidence for the new style.
2. Hybrid pixel-library evidence: calibrated pixel geometry must be
   corroborated by measurements from eligible approved library styles.
3. Similar-sketch retrieval evidence explaining why those historical styles
   are relevant peers.

Pixel geometry without library corroboration cannot produce a high-confidence
measurement suggestion. Library values without valid pixel geometry are a
library prior, not a high-confidence Hybrid Evidence Suggestion. Similar-sketch
evidence selects and explains peers but does not independently determine the
measurement value.

Peer style-versions with fewer than 10 distinct valid canonical POMs in POM
1-14 are excluded from suggestions without deleting source evidence. An
unresolved duplicate canonical POM excludes the entire peer style-version and
must be resolved by a TD; duplicates are never selected, merged or averaged
automatically.

## Alternatives Considered

1. Keep global medians as the main suggestion. Rejected because the result is
   not style-specific.
2. Use sketch pixels alone. Rejected because a sketch has no absolute ruler and
   different views may use different scales.
3. Use nearest styles alone. Rejected because similarity does not prove that a
   target measurement or construction detail is equivalent.
4. Automatically average duplicate rows. Rejected because duplicates are
   conflicting source evidence requiring TD judgment.

## Consequences

Positive:

- Suggestions vary with the current sketch while remaining grounded in
  approved historical measurements.
- TDs can inspect and challenge every contributing piece of evidence.
- Geometry and library evidence cross-check each other instead of presenting a
  single unexplained number.
- High confidence has an explicit dual-evidence gate: valid pixel calculation
  and corroborating approved library measurements.

Tradeoffs:

- At least one reliable TD calibration is required for absolute geometry on a
  view.
- Per-view calibration, duplicate review, peer eligibility and per-POM QA add
  workflow and implementation complexity.
- Mode B must remain research-gated until accuracy tests demonstrate an
  improvement over the Tier-0 median baseline.

## Follow-Up

- Define which POMs are eligible calibration anchors per view.
- Define per-POM geometry reliability and disagreement thresholds.
- Build a deterministic style-retrieval index from approved evidence.
- Establish a Tier-0 baseline and validate hybrid suggestions with
  `npm run accuracy` before enabling them in export.
- Registered with Harness as
  `0024-hybrid-calibrated-similar-style-suggestions` after CLI v0.1.11 was
  restored in this checkout.
