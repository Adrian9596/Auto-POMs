# 0013 POM 14 is the curved front-to-back shoulder strap length

Date: 2026-07-09

## Status

Superseded by [0015 POM 14 starts at the front strap upper join](0015-pom14-front-strap-upper-join.md).

## Context

ADR 0012 moved POM 14 to a back-only strap segment so the line stayed on one
view. TD review corrected that model: POM 14 is the shoulder strap length, so it
must follow the strap from the cup/shoulder-strap joining seam to the end of the
shoulder strap at the back.

The back-only segment is therefore a landmark shortcut, not the measurement.

## Decision

POM 14 is a **curved** low-confidence measurement from:

- start: `apex-left`, the front cup/shoulder-strap joining seam
- end: `strap-bottom`, the back strap end / back-panel join

It remains always-verify (`confidence: low`). A front-only sketch can seed the
front join but lacks the back end, so POM 14 demotes to `REVIEW_ONLY`.

The `strap-top` anchor remains a back-view helper landmark, renamed in the UI as
`Back strap top`, but it is not the POM 14 start point.

In rule JSON, POM 14 uses `view: "front_to_back"` to describe the measurement
path and `placementViewRole: "back"` so the row still has one concrete
review/apply bucket.

## Consequences

- POM 14 intentionally crosses the front/back sketch gap as a curved review
  line. This is the TD-correct exception to the earlier back-only simplification.
- Contract and synthetic tests now assert the front-to-back curved strap model.
- Golden baselines may need refresh if they start comparing POM 14 draft
  geometry instead of only anchors.
