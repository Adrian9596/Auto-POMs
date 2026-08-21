# Design

## Domain Model

A curved annotation's floor stays the current 2-handle cubic
(`start`/`control1`/`control2`/`end`). Extra anchors are an **additive**
array, proposed as `ann.points: []` — a list of interior anchors, each
`{ point, handleIn, handleOut }` (world px, same convention as every other
curve field). Empty by default, so every curve that never had a point added
serializes byte-identical to today.

`getCurveBeziers(ann)` (`src/curves.js:17`) generalizes from "return 1 or 2
segments" to "walk the chain": segment 0 is
`(start, control1, points[0].handleIn, points[0].point)` if `points.length`,
else the existing single-cubic fallback; segment i is
`(points[i-1].point, points[i-1].handleOut, points[i].handleIn,
points[i].point)`; the final segment closes on `(control2, end)` symmetrically.
This is the **one** place that needs to understand the chain shape — every
caller (`render-annotations.js`, `export-pdf.js`, `render-stitches.js`,
`getAnnotationPolyline` → `lineLength`) already iterates
`for (const s of getCurveBeziers(ann))` generically and needs no change.

Legacy data: the still-present, always-null `midPoint` / `midHandleIn` /
`midHandleOut` fields (dead since the 2026-07-18 model change) are unrelated
to `points[]` and stay dead. `ensureCurveControls()` (`src/curves.js:145`)
keeps collapsing that legacy shape and additionally treats a missing
`points` as `[]` — purely additive, no destructive migration.

## Application Flow

1. **Toolbar consolidation.** `#toolStraight` / `#toolCurved` / `#toolEraser`
   / `#toolText` move into one drop-down, structurally mirroring
   `#lineStyleControl` / `#stitchesBtn` / `#stitchesMenu`
   (`index.html:2847-2872`): a fixed-label trigger button, a `role="menu"`
   list of the four tools, `.active` marking whichever is the current
   `state.tool`. The freed slot holds the new `#toolAddPoint` button.
2. **Visibility gate.** `updateUI()` (`src/manual/ui-status.js`) hides
   `#toolAddPoint` unless `getSelectedAnnotation()?.type === 'curved'` —
   same conditional-visibility convention as `fontSizeChip` / `brushSizeChip`
   (`ui-status.js:21,37`).
3. **Entering the mode.** Clicking `#toolAddPoint` sets `state.tool =
   'add-point'`, same persistent-mode mechanism as every other tool
   (`state.tool` branches in `src/manual/pointer-events.js`,
   `src/manual/canvas-tools.js`). The curve selected at the moment of entry is
   the only one this mode acts on; a click that misses it does nothing.
4. **Insertion.** On click, project the click onto the selected curve's
   sampled polyline (`getAnnotationPolyline`) to find the nearest `t` across
   its segment chain, then De Casteljau-split that segment at `t`. The split
   is exact: the two resulting cubics trace the original curve's path with no
   deviation. Insert the new anchor into `points[]` at the correct chain
   position, select it (`state.selection.part` names the new anchor), push
   history.
5. **Dragging a handle.** `dragHandle()` (`src/manual/pointer-events.js:876`)
   gains cases for an interior anchor's `point` / `handleIn` / `handleOut`.
   A plain drag of `handleIn` or `handleOut` also repositions the other handle
   of the same anchor to stay collinear through `point` (mirrored) — computed
   fresh from the dragged handle's new position each time, never read from a
   stored flag. An Alt-held drag (the modifier must be threaded from the
   originating `mousedown`/`mousemove` event through to `dragHandle`, which it
   is not today) skips the mirror step for that one drag.
6. **Deleting an anchor.** `deleteSelected()`
   (`src/manual/annotation-lifecycle.js:37`) gains a branch: if
   `state.selection.part` names an interior anchor, splice it out of
   `points[]` and rejoin the two now-adjacent segments using their existing
   outer handles as-is (no shape fitting). Falls through to the existing
   whole-line delete when `part` is null or names `start`/`end`/`control1`/
   `control2`.

## Interface Contract

No network surface. The closest analog is the persisted **project file**
shape: a curved annotation gains an optional `points: []` (absent or empty on
every annotation from a project saved before this story, and on every curve
that never had a point added after it).

## Data Model

- `state.annotations[].points` — new optional array on `type: 'curved'`
  entries only, default `[]`.
- `src/project/project-save.js` / `project-load.js`, `src/project/history.js`
  (`makeSnapshot` / `restoreSnapshot`) serialize/deserialize `points[]`
  alongside the existing curve fields, defaulting missing data to `[]`.
- `src/manual/annotation-clipboard.js` (copy/paste `shift`, reflect `mirror`)
  currently names `control1`/`control2`/`midPoint`/`midHandleIn`/
  `midHandleOut` individually (lines 52-56, 112-116) — must loop over
  `points[]` applying the same per-field transform, not just gain new named
  fields.
- `src/manual/line-nudge.js` builds its Tab-cycle `parts` list by naming each
  field (lines 25-30) — must enumerate `points[]`'s `point`/`handleIn`/
  `handleOut` generically, with a readable per-anchor name (`"point 2"`,
  `"point 2 handle (in)"`, …) for its on-screen label (`describePart`-style,
  lines 39-44).
- `src/manual/label-layout.js:20` computes the default label position from
  `bezierTangent(a.start, a.control1, a.control2, a.end, 0.5)` — this must
  move to `getCurveBeziers` + global-path `t = 0.5` so it still degrades to
  today's exact result when `points` is empty, and produces a sane midpoint
  when it isn't.

## UI / Platform Impact

Board toolbar only (`index.html`, `src/dom-refs.js`, `src/manual/ui-status.js`,
`src/ui/bindings.js`). No change to Construction, BOM, MAIN PAGE, or
Preview & Export — those pages either don't touch Board curves or use the
separate `ccDrawCallout` engine (ADR 0041). No desktop/mobile split exists in
this app; no platform-shell impact.

## Observability

None — no logs, audit trail, or metrics are relevant to client-side board
editing state.

## Alternatives Considered

Full reasoning lives in
[ADR 0053](../../../decisions/0053-curved-lines-grow-extra-anchor-points-on-demand.md#alternatives-considered).
Summary: bringing back the fixed 7-handle midpoint model, hiding
inactive anchors' handles, a persisted per-anchor corner/smooth flag,
shape-preserving fit on delete, and gating the feature to non-POM curves were
all considered and rejected (the second is kept as an explicit follow-up
trigger, not a hard no).
