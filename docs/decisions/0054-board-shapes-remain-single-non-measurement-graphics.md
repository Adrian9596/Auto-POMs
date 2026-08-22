# 0054 Board shapes remain single non-measurement graphics through path editing

Date: 2026-08-22

## Status

Accepted — 2026-08-22.

## Context

The Board needs quick Rectangle, Circle, and Hexagon creation, simple
whole-shape adjustment, and a way to turn individual edges into straight or
curved segments. The existing Board annotation collection is the measurement
set: its members receive POM identities, values, tolerance evaluation, and
Measurement Spec / Excel rows. Treating a visual shape as an annotation, or
immediately exploding it into annotations, would silently turn drafting
graphics into measurements and would make basic resize and selection noisy.

The product also needs a precise meaning for "cut." Cutting a vector path may
break its continuity without requiring every resulting piece to become a new
top-level object. Separating those two operations keeps the first release
focused and preserves easy whole-object manipulation.

## Decision

Rectangle, Circle, and Hexagon are **Board Graphics**, not annotations or POM
lines. They appear in visual Board exports but are excluded from measurement,
tolerance, grading, learning, and Measurement Spec / Excel flows.

Each new geometric graphic begins as a **Live Shape**, adjustable as one
object. Entering **Edit Path** allows its nodes and straight or curved segments
to be edited while it remains one Board Graphic. **Cut Path** may open the path
or create multiple subpaths, but all subpaths remain inside that same graphic.

The first release does not include **Break Apart** and does not convert a
graphic segment into a POM. Those are separate future decisions if TD workflow
evidence shows they are needed.

Whole-shape resizing preserves each Live Shape's defining geometry. A
Rectangle may change width and height independently; Shift locks its current
aspect ratio. A Circle remains circular rather than silently becoming an
ellipse. A Hexagon remains regular rather than becoming an arbitrary six-node
polygon. Alt/Option resizes any Live Shape from its centre. A TD who needs an
ellipse or irregular six-sided outline enters Edit Path and makes that graphic
a custom Shape Path instead of weakening the meaning of Circle or Hexagon.

A selected Board Graphic enters Edit Path when the TD presses Enter or
double-clicks its outline. Escape is intentionally two-stage: the first press
leaves Edit Path and restores whole-graphic selection; the second press clears
that selection. Double-click is an entry gesture only, not an exit gesture, so
it remains available for future node-level actions without creating an
enter/exit ambiguity.

Edit Path shows every node as a small structural marker but emphasizes only
the active node or segment. Bézier handles appear only for the active curved
geometry, normally two at a time, and the interface never shows more than six
handles even if future multi-node selection is added. The limit applies to
visible handles, not to path nodes or segments, so a regular Hexagon does not
consume the graphic's entire editing capacity before the TD adds a point.

Cut Path is available only inside Edit Path. Cutting at an existing node opens
the path at that exact node. Cutting in the middle of a segment first inserts a
node on the drawn path without changing the shape, then opens the path there.
The first cut on a closed path creates two endpoints; later cuts may create
additional open subpaths, all still owned by the same Board Graphic. Every cut
preserves stroke styling, creates one Undo step, removes no geometry, creates
no new top-level object, and never creates a POM.

Cut Path is a one-shot command against the active node or segment, not a
persistent drawing tool. After the command, the graphic remains in Edit Path.
For a closed path, the cut produces one open subpath whose two endpoints occupy
the cut position. For an open path, an interior cut produces two subpaths. A
cut at an already-open endpoint, or an exact repeat of an existing cut, is a
no-op and creates no Undo entry. A segment cut uses linear interpolation for a
straight segment and De Casteljau subdivision for a cubic segment, so the
drawn geometry is unchanged at the instant of the cut.

The first release is stroke-only. Board Graphics use the active Board colour
and line width but have no fill, avoiding ambiguous fill behavior after a path
is opened or split. Rectangle, Circle, and Hexagon are created by dragging a
bounding box. Rectangle follows the drag dimensions; Circle and regular
Hexagon use the shorter drag dimension; Shift locks the current ratio and
Alt/Option creates from the centre. A drag below the creation threshold creates
neither a graphic nor an Undo entry.

Rectangle, Circle, and Hexagon live in the existing Tools menu. A selected
graphic exposes Edit Path; inside Edit Path, a valid active node or segment
exposes Cut Path. These actions are also discoverable through the Command
Palette; v1 adds no dedicated shortcut beyond Enter to enter Edit Path and the
two-stage Escape behavior already defined above.

A graphic created over a sketch records that image as its owner and moves or
scales with the sketch. A graphic created outside every sketch is Board-local.
Edit Path and Cut Path never change ownership. Deleting an image deletes its
owned graphics in the same Undo transaction.

## Alternatives Considered

1. **Store shapes in the existing annotation collection.** Rejected because
   annotations are measurements and feed the POM/spec/export contracts.
2. **Explode every new shape into independent straight or curved lines.**
   Rejected because selection, resize, move, style changes, and Undo become
   needlessly fragmented for the common whole-shape workflow.
3. **Create every shape as a generic node path from the first drag.** Rejected
   because it gives up the simple dimension and proportion controls that make
   rectangles, circles, and regular hexagons fast to adjust.
4. **Keep live shapes forever and forbid path editing.** Rejected because it
   cannot satisfy the requested straight/curved edge editing and path cutting.

## Consequences

Positive:

- Shape graphics cannot contaminate POM numbering, measured values, tolerance,
  grading, learning evidence, or Measurement Spec exports.
- Basic creation, move, and resize stay simple while detailed vector editing
  remains available on demand.
- Cut Path does not immediately create a multi-object selection and grouping
  problem.
- Old projects can treat the absent graphic collection as empty.

Tradeoffs:

- Board rendering, selection, persistence, history, autosave, image-relative
  transforms, visual exports, and command discovery must all recognize a new
  Board object category.
- Once a Live Shape is changed into a custom Shape Path, its original
  shape-specific controls are no longer authoritative; Undo is the safe way
  back to the prior Live Shape.
- Users cannot move cut subpaths as independent objects in the first release.
- Filled shapes and fill rules across open or multiple subpaths are not part of
  the first release.

## Follow-Up

- Consider Break Apart or explicit graphic-to-POM conversion only as separate
  follow-up work with its own measurement-safety decision.
