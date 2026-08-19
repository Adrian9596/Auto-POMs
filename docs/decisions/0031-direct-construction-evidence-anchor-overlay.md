# 0031 Direct Construction Evidence and Anchor-Only Overlay

Date: 2026-07-14

## Status

Accepted

## Context

The isolated measurement lab displayed generic front detail as “Lace overlay
53%” and generic back-center structure as “Back hook & eye 44%.” Those values
were raw heuristic support, not calibrated confidence, and the named features
were absent from the sketch. The canvas also connected ratio-seeded endpoints,
making proposed geometry look like detected measurement lines.

## Decision

- Back hook-and-eye may be selected automatically only when OpenCV observes a
  regular sequence of three to six closure rows. Generic single rails, seams,
  and repeat scores remain diagnostic but cannot select or tag the construction.
- A strong paired center-back closure panel may produce a capped `candidate`
  percentage when fastening rows are hidden. This asks for TD confirmation and
  does not select H&E or trigger the three-row POM 12 rule automatically.
- Lace overlay uses distributed light-pattern evidence across the front-view
  interior. Generic anti-aliasing, seams, and overall image detail do not count
  as lace evidence.
- Construction chips display `detected`, `candidate`, or `not detected` beside
  a visible detector-support percentage. The percentage is diagnostic rule
  strength for the active sketch and is never presented as proven accuracy.
- Ratio-seeded POM endpoints are Anchor Hypotheses. The canvas renders labelled
  A/B anchors without a connecting line. Pixel distance may still be evaluated
  by the evidence engine, but remains Weak until OpenCV or TD confirms the
  landmarks.

## Alternatives Considered

1. Raise the old percentage thresholds. Rejected because a stronger generic
   seam or texture score still does not prove lace or hook-and-eye.
2. Keep connecting lines but relabel them “candidate.” Rejected because the
   visual geometry still looks detected and overstates the evidence.
3. Hide all unresolved construction tags. Rejected because an explicit `not
   detected` state is useful for auditing detector behavior.

## Consequences

Positive:

- Construction claims have a visible, feature-specific evidence requirement.
- The workbench visibly separates diagnostic support from proven accuracy.
- The sketch overlay distinguishes proposed anchor locations from confirmed
  measurement geometry.

Tradeoffs:

- Conservative gates may miss faint lace or poorly drawn hook-and-eye rows.
- The lightweight lace-pattern gate still needs a larger labelled sketch set
  before it can be treated as an accuracy result.

## Follow-Up

- Add TD-labelled positive and negative lace examples to an accuracy fixture.
- Track false-positive and false-negative rates separately for construction
  tags and anchor confirmation.
