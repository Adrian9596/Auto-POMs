# 0034 POM 9/10/17/18 measure on the front-inner view when one is present

Date: 2026-07-20

## Status

Accepted (amends [0011](0011-cup-poms-measured-on-front-outer-view.md))

## Context

[ADR 0011](0011-cup-poms-measured-on-front-outer-view.md) established that the
cup POMs are measured on the **front-outer** view and that a `front_inner`
cutaway is a *bonus a sketch may include, never a precondition* — because most
tech packs are front + back only, and a front cup with a real apex + cup-bottom
is a trustworthy read on its own.

[US-045](../stories/epics/E07-measurement-detection/US-045-auxiliary-inner-view-recognition.md)
then added recognition of a **separate** front-inner photo as an auxiliary
view (labeled, but carrying no measurement).

The TD now wants: *when a front-inner view is present, the cup / neckline /
armhole POMs should be measured on that view* — it shows the cup construction,
neckline, and armhole seams more clearly than the front-outer sketch. This does
not contradict ADR 0011's core (front-outer remains the default and the
front-only path is unchanged); it adds an *opt-in upgrade* that triggers only
when a front-inner view actually exists.

## Decision

When a `front_inner` auxiliary view is recognized (with its own seeded anchors),
**POM 9 (cup height), 10 (cup width), 17 (neckline), and 18 (armhole)** are
measured on that view — their anchors and drawn lines are placed on the inner
photo.

**POM 8 (cup height at CF) stays on the front-outer view.** Its anchors
(`cf-top`, `cradle-cf-top`) are shared with POM 5 and POM 6; moving them would
drag those POMs onto the inner view too. (TD decision, this story: "Decision 1
A".) Only the *dedicated* anchor kinds move: `inner-cup-top/bottom/left/right`,
`171`, `172`, `181`, `182`.

**No front-inner view present ⇒ behaviour is exactly ADR 0011** (front-outer for
all cup POMs). This is a strict superset: the change is inert unless the TD adds
a front-inner photo.

## Consequences

- The inner photo gets its OWN detection + full anchor set (seeded in
  `buildAuxViews`, `src/auto-detection.js`), and `generatePOMDraftsFromAnchors`
  runs a **second fixture/draft pass** against it, replacing the front-outer
  drafts for POM 9/10/17/18 (`src/auto/drafts/generate-pom-fixture.js`).
- Anchors already carry a per-anchor `sourceImageId`; the moved anchors point at
  the inner photo, so they display + follow that image.
- The front-outer pass filters anchors to the source image, so with no inner
  view it is a no-op — golden / contract / invariants / smoke are unchanged
  (verified: only the pre-existing `EvelynBliss vA 1.0.jpg` demo stays red).
- Known follow-up: dragging a *moved* anchor pin in Auto Mode (pre-Generate)
  still reposes against the single detection image; the applied line (Manual
  Mode, world-space) drags correctly. The seed → Generate → Apply flow works.
- Quality of the inner POMs depends on the inner photo detecting well; the inner
  detection has no Potrace contours (curves fall back to bowed guesses →
  APPROXIMATE, which the TD verifies in the Manual handoff).
