# Exec Plan — US-095 Board shapes support Edit Path and Cut Path

## Goal

Add the complete first Board Graphic vertical slice defined by ADR 0054 while
proving graphics never contaminate measurements.

## Scope

In scope:

- Rectangle, Circle, and regular Hexagon creation.
- Whole-graphic select, move, resize, style, and delete.
- Live Shape to Shape Path conversion and node/handle/segment editing.
- Lossless Cut Path on nodes, straight segments, and cubic segments.
- Multiple subpaths inside one graphic.
- Image ownership, Undo/Redo, autosave, Save/Open, Copy Image, PDF rendering.
- Command Palette, contextual toolbar, Help, and deterministic test coverage.

Out of scope:

- Fill, Break Apart, subpath-level move, or graphic-to-POM conversion.
- Auto detection, 18-POM rules, grading, learning, or Excel rows.

## Risk Classification

Risk flags:

- Data model — additive persisted `graphics` collection and path topology.
- Existing behavior — Board pointer routing, keyboard, toolbar, image transforms.
- Weak proof — no prior Board Graphic or Cut Path suite exists.
- Multi-domain — state, geometry, pointer UI, rendering, persistence, export.

Hard gates:

- Existing projects must open with `graphics: []` and lose no data.
- Measurement outputs must remain byte/row-equivalent when only graphics change.

## Implementation Checklist

- [x] Add normalized Board Graphic / Live Shape / Shape Path model.
- [x] Add exact straight and cubic segment split helpers.
- [x] Add Cut Path topology mutations and repeated/endpoint no-op guards.
- [x] Add `state.graphics` to history, save/open, autosave, dirty-state checks.
- [x] Move/scale/delete image-owned graphics with their sketch.
- [x] Render live shapes, path subpaths, edit nodes, handles, and active segment.
- [x] Hit-test and select/move/resize Board Graphics.
- [x] Add Rectangle/Circle/Hexagon drag creation with Shift/Alt semantics.
- [x] Add Enter/double-click Edit Path and two-stage Escape.
- [x] Add node/handle drag and straight/curved segment conversion.
- [x] Add one-shot Cut Path action and contextual disabled reasons.
- [x] Wire Tools menu, contextual toolbar, Command Palette, and Help.
- [x] Include graphics in Copy Image and PDF visual exports.
- [x] Prove no POM/spec/Excel path reads `state.graphics`.
- [x] Add old-project migration, round-trip, undo, and autosave tests.
- [x] Add real pointer/keyboard gesture tests and direct browser verification.

## Validation Checklist

- [x] `npm run build`
- [x] `npm run check`
- [x] `npm run board-shape-check`
- [x] `npm run board-interaction-check`
- [x] `npm run board-toolbar-check`
- [x] `npm run keyboard-shortcuts-check`
- [x] `npm run autosave-check`
- [x] `npm run export-hidden`
- [x] `npm run preview-check`
- [x] `npm run smoke`
- [x] `npm run golden`
- [x] `npm run invariants`
- [x] `npm run contract`
- [x] Direct localhost browser pass with a real sketch fixture and clean console.

## Work Phases

1. Complete the model and persistence seams.
2. Implement rendering and whole-object gestures.
3. Implement Edit Path and Cut Path.
4. Integrate commands and visual exports.
5. Add focused and regression proof.
6. Update docs and Harness evidence.

## Stop Conditions

Pause for human confirmation if implementation requires fill behavior, Break
Apart, converting graphics to measurements, weakening an existing validation
gate, or destructive project migration.
