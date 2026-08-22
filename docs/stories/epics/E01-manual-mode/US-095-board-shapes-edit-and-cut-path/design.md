# Design — US-095 Board shapes support Edit Path and Cut Path

## Domain Model

- **Board Graphic**: one non-measurement top-level vector object.
- **Live Shape**: a rectangle, circle, or regular hexagon retaining its simple
  defining dimensions.
- **Shape Path**: one Board Graphic containing one or more open/closed subpaths.
- **Edit Path**: session state for node, handle, and segment editing.
- **Cut Path**: a one-shot topology command against the active node or segment.

## Application Flow

1. Choose Rectangle, Circle, or Hexagon from Tools and drag a bounding box.
2. Select the graphic to move or resize it as one object.
3. Press Enter, double-click the outline, or invoke Edit Path.
4. Select/drag a node, handle, or segment; optionally change a segment between
   straight and curved.
5. Invoke Cut Path. The mutation commits once, remains in Edit Path, and keeps
   all resulting subpaths inside the graphic.
6. Escape exits Edit Path; a second Escape clears graphic selection.

## Interface Contract

- Shape creation uses the active Board colour and line width and never fill.
- Tools menu owns Rectangle, Circle, and Hexagon.
- Context actions own Edit Path, Cut Path, Make Straight, and Make Curved.
- Command Palette mirrors stable actions; only Enter/Escape have direct keys.
- Invalid/repeated cuts are no-ops with a short reason and no Undo entry.

## Data Model

`state.graphics` is additive and defaults to `[]` for old projects. A Live
Shape stores its kind, centre, width, height, stroke style, and optional
`sourceImageId`. Entering Edit Path converts it to a Shape Path containing
subpaths. Each subpath stores `closed` and ordered nodes; a node stores its
point, incoming/outgoing handles, and the outgoing segment kind. Stable ids
address graphics, subpaths, and nodes across topology edits.

History and project snapshots deep-clone `graphics`. Image move/resize/delete
transforms or removes owned graphics in the same transaction as annotations,
notes, and erase strokes.

## UI / Platform Impact

Offline single-page browser only. Pointer, touch-through-mouse routing,
keyboard command discovery, canvas rendering, Copy Image, and PDF export must
recognize graphics. Measurement/Excel exporters must remain graphics-blind.

## Observability

No network or runtime telemetry. Deterministic tests inspect graphic topology,
rendering, persistence, ownership transforms, and measurement isolation.

## Alternatives Considered

1. Store shapes as annotations — rejected because annotations are the POM set.
2. Explode each edge into top-level lines — rejected because whole-object
   manipulation and Undo become fragmented.
3. Make Cut Path create separate graphics — rejected; that is Break Apart.
4. Add fill in v1 — rejected because open/multi-subpath fill behavior is
   undefined and unnecessary for the requested workflow.
