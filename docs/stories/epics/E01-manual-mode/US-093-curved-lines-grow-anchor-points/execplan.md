# Exec Plan — US-093 Curved lines grow anchor points

## Goal

Let a TD optionally grow any selected curved Board annotation with extra
interior anchor points via a new persistent "Add point" tool — per
[ADR 0053](../../../decisions/0053-curved-lines-grow-extra-anchor-points-on-demand.md)
— without changing the default 2-handle model a fresh curve is born with, and
without reintroducing the handle-crowding problem the TD had removed on
2026-07-18.

## Scope

In scope:

- `points: []` field on curved annotations (or the shape Discovery confirms)
  plus `ensureCurveControls`-style normalization so older projects load with
  `points: []`.
- Toolbar consolidation: Straight / Curved / Eraser / Text into one
  drop-down (reusing the `#stitchesBtn` / `#stitchesMenu` pattern); new
  "Add point" button in the freed slot, gated to a selected curved annotation.
- Insertion via De Casteljau subdivision at the nearest point on the curve —
  exact shape at the moment of insertion.
- Default-mirrored handles per new anchor; Alt+drag breaks the pairing for
  one drag only (computed live, never persisted).
- No handle-visibility gating — every anchor's handles shown at once when the
  curve is selected.
- Select-an-interior-anchor + Delete/Backspace removes just that anchor;
  whole-line Delete behavior is unchanged when no interior anchor is active.
- Generalizing `annotation-clipboard.js` (copy/paste, reflect),
  `line-nudge.js` (Tab-cycle), and `label-layout.js` (tangent-at-midpoint) to
  loop over the anchor list instead of naming fixed fields.
- Extending `board-interaction-check.mjs` (or a new suite) with real gesture
  coverage for every behavior above.

Out of scope:

- POM 1–16 detection/drafting, the POM contract, or the anchor schema.
- Auto Mode drafting/detection — Manual Mode editing only.
- A persisted per-anchor corner/smooth flag (ADR 0053 rejects this).
- Shape-preserving fit on delete (ADR 0053 rejects this).
- Hiding inactive anchors' handles (ADR 0053 Follow-Up — only if clutter
  actually reappears in practice).
- The Construction/BOM leader-line engine (`ccDrawCallout`, ADR 0041) —
  a separate engine, untouched.

## Risk Classification

Risk flags (from `docs/FEATURE_INTAKE.md`, run 2026-08-20):

- **Data model** — curved-annotation schema gains `points[]`; legacy
  `midPoint`/`midHandleIn`/`midHandleOut` fields must not collide with it.
- **Public contracts** — the persisted project-file shape is client-visible;
  a project saved before this story must still load correctly after.
- **Existing behavior** — the 2-handle drag, the 5-button toolbar, and
  whole-line Delete are already implemented and gesture-tested
  (`board-interaction-check.mjs`).
- **Multi-domain** — data model (`curves.js`), toolbar/UI (`index.html`,
  `dom-refs.js`, `ui-status.js`, `bindings.js`), gesture layer
  (`pointer-events.js`, `hit-testing.js`, `canvas-tools.js`), keyboard
  shortcuts (`keyboard-shortcuts.js`, `line-nudge.js`), clipboard/reflect
  (`annotation-clipboard.js`), label layout (`label-layout.js`) all change
  together.

Hard gates:

- **Data loss or migration** — a project saved by an older build must
  round-trip through the new `ensureCurveControls`-style normalization
  without losing or corrupting any curve data. This is the gate that puts the
  story in the high-risk lane regardless of the flag count above.

## Work Phases

1. **Discovery** — Done. Confirmed `getCurveBeziers`, `lineLength` /
   `getAnnotationPolyline`, `export-pdf.js`, and `render-stitches.js` already
   iterate an arbitrary segment count — no changes needed there. Confirmed
   `state.annotations` is serialized wholesale via `clone()` (deep
   `JSON.parse(JSON.stringify(...))`) in `project-save.js` / `project-load.js`
   / `history.js`, so `points[]` needed zero code there beyond
   `ensureCurveControls` defaulting it on load. Found every hardcoded
   `control1`/`control2`/`midPoint`/`midHandleIn`/`midHandleOut` reference:
   `annotation-clipboard.js` (copy/paste, reflect), `line-nudge.js`
   (Tab-cycle), `annotation-factory.js`'s `computeDefaultLabelPosition` (not
   `label-layout.js` — that file only does label collision-avoidance
   *direction*, a secondary concern left untouched), plus three direct
   `ann[part]` reads (`startHandleDrag`, `nudgeSelectedAnnotation`,
   `drawAdjustmentReadout`) that needed a generic `getAnnPartPoint` getter
   instead.
2. **Design** — Done, per `design.md`. The Alt-modifier threads cleanly:
   `onMouseMove(e)` already has `e` in scope at the `'drag-handle'` branch, so
   `dragHandle(..., e.altKey)` needed only a new trailing parameter — no wider
   event-plumbing change.
3. **Validation planning** — Done, per `validation.md`.
4. **Implementation** — Done. `points: []` on curved annotations (empty by
   default — the 2-handle case is byte-identical); `getCurveBeziers` walks the
   chain; `insertCurveAnchorAt`/`subdivideCubicBezier` (exact De Casteljau
   split); `mirrorOppositeCurveHandle` (angle-only mirror, recomputed every
   plain drag); `deleteCurveAnchorAt`; toolbar consolidated into
   `#toolsMenuWrap` (joins the existing `BOARD_TOOLBAR_MENUS` registry from
   `src/ui/board-toolbar.js`, NOT the older bespoke `stitchesBtn` pattern
   originally discussed in the grilling session — the registry gives
   open/close, outside-click, and keyboard nav for free and is the more
   current pattern in this codebase); new `#toolAddPoint` button, gated on a
   selected curved annotation.
5. **Verification** — Done. Full 24-suite battery green, including a new
   `board-interaction-check` section 4c (9 assertions, real gestures) and one
   negative control (see `validation.md`). `board-toolbar-check`'s "empty
   Manual controls" exact-set assertion was updated for the consolidated
   toolbar (four ids removed, one `toolsMenuBtn` added) — a reviewed,
   intentional change, not a loosened check.
6. **Harness update** — Done. `CLAUDE.md`, `TESTING.md`, `docs/TEST_MATRIX.md`
   updated; `scripts/bin/harness-cli story update` run; ADR 0053 Follow-Up
   items resolved.

## Stop Conditions

Pause for human confirmation if:

- The `points[]` shape conflicts with an existing serialization or
  history-snapshot assumption discovered in Discovery.
- A legacy-project fixture fails to round-trip (load → save → load) with
  byte-identical curve data.
- Threading the Alt modifier into `dragHandle()` turns out to require a
  broader pointer-event refactor than a local signature change.
- Any ADR 0053 decision conflicts with a currently-passing golden/contract
  assertion in a way that would require reopening a TD decision already made
  in this story's grilling session.
- Product behavior is ambiguous anywhere this plan doesn't already cover.
