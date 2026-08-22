# Overview — US-095 Board shapes support Edit Path and Cut Path

## Current Behavior

The Board has three object categories: images, measurement annotations, and
text notes. It has no non-measurement vector-shape collection, no Rectangle /
Circle / Hexagon creation tools, no Edit Path state, and no Cut Path command.
The existing `ann.points` model and De Casteljau subdivision operate only on
measurement annotations and therefore cannot safely be reused as storage for
visual construction shapes.

## Target Behavior

A TD can create stroke-only Rectangle, Circle, and Hexagon Board Graphics,
select/move/resize them, enter Edit Path, edit nodes and straight/curved
segments, and run the one-shot Cut Path command on an active node or segment.
Cutting preserves geometry and stroke style, may create multiple subpaths, but
never creates another top-level object or any POM/spec row.

Graphics created over a sketch move and scale with that sketch. Board-local
graphics remain independent. All graphics round-trip through Undo/Redo,
autosave, Save/Open, and visual Board exports.

## Affected Users

- Technical designer (TD).

## Affected Product Docs

- `docs/decisions/0054-board-shapes-remain-single-non-measurement-graphics.md`
- `docs/GLOSSARY.md`
- `ARCHITECTURE.md`
- `TESTING.md`
- `docs/TEST_MATRIX.md`

## Non-Goals

- Fill colours or fill rules.
- Break Apart or independently moving cut subpaths.
- Converting a graphic or segment into a POM.
- Detection, Auto Mode rules, anchor schema, grading, or learning changes.
- Changing Construction/BOM callout graphics.
