# Overview

## Status (2026-08-21)

Implemented and verified. All Work Phases in `execplan.md` are done; every
suite in the battery is green, including 9 new gesture-level assertions in
`board-interaction-check` (section 4c) that exercise the full ADR 0053 design
through real `mousedown`/`mousemove`/`mouseup`/`keydown` events — insertion,
default mirroring, Alt-break, re-mirror on the next plain drag, and both
delete paths. One negative control (removing the mirror call) was confirmed
to fail with the expected message before being reverted.

One real-world finding surfaced during verification, not anticipated at
design time: consolidating the toolbar freed enough width that the
pre-existing "selecting a line reflows the toolbar" scenario in
`board-interaction-check` (used since US-088/ADR 0051 to prove the board
doesn't visually move when the chrome reflows) **stopped triggering any
reflow at all** — checked directly against straight, curved, image
selection, and the Eraser tool, all measuring an identical single-row
toolbar height at the suite's 1440px window. That scenario's 3 assertions
were retired rather than kept alive against a manufactured trigger; the
"hiding the Measurements panel" scenario alongside it still reflows for real,
so the invariant remains under live proof. See `TESTING.md`'s
`board-interaction-check` entry for the full account.

A `/code-review` pass the same day found a real gap the original
verification missed: `moveAnnotation`/`scaleAnnotationAbout` predated
`ann.points`, so moving or resizing a curve with an interior anchor tore it.
Fixed, with two new regression checks (4d/4e) and a passing negative
control — see `validation.md`'s "Post-verification fix" section and
[ADR 0053](../../../decisions/0053-curved-lines-grow-extra-anchor-points-on-demand.md)'s
Follow-Up for the full account.

## Current Behavior

A curved Board annotation is exactly one cubic Bézier: `start`, `end`,
`control1`, `control2` (`src/curves.js`). Editing is pen-tool style — two
handles, always visible, always grabbable, no visibility gating
(`hitTestSelectedHandles` in `src/render/hit-testing.js`,
`drawSelectionHelpers` in `src/render/render-annotations.js`). There is no way
to add a point to an existing curve; the shape is permanently bounded to what
one cubic can express.

The drawing toolbar (`#boardToolbarGroups` → `.toolset` in `index.html`) has
five icon-only buttons: Select, Straight, Curved, Eraser, Text — already at
capacity (ADR 0052 found a sixth button would push the toolbar to two rows).

Double-click on a curve's body opens its label/POM-number editor
(`openLabelEditor`, `src/render/viewport.js:114`). Delete/Backspace with an
annotation selected always deletes the **whole line**
(`deleteSelected()`, `src/manual/annotation-lifecycle.js:37`) — it does not
look at `state.selection.part`, the field that already tracks which
handle/endpoint is "active" for Tab-cycle / arrow-key nudging (US-027).

## Target Behavior

A TD can optionally grow any selected curved annotation with extra interior
anchor points, on demand, via a new persistent "Add point" tool:

- Straight / Curved / Eraser / Text collapse into one drop-down button
  (reusing the existing `#stitchesBtn` / `#stitchesMenu` pattern), freeing a
  toolbar slot for the new "Add point" button.
- "Add point" is a persistent mode like every other tool, visible only while a
  curved annotation is selected, and only inserts into that one curve.
- Clicking the curve's body inserts a new anchor at the nearest point **on**
  the curve (De Casteljau subdivision) — the shape does not change at the
  instant of insertion.
- Each new anchor's two handles default to mirrored (smooth, no kink);
  Alt+drag moves just one handle for that drag; a later plain drag re-mirrors
  — no per-anchor state is persisted.
- Every anchor's handles stay visible and grabbable at once when the curve is
  selected (no crowding gate, matching the existing 2-handle model).
- Selecting an interior anchor (`state.selection.part`) and pressing
  Delete/Backspace removes just that anchor and rejoins its neighbors, without
  attempting to preserve the exact prior shape. Delete with no interior anchor
  active still deletes the whole line, unchanged.
- Applies uniformly to every curved annotation, including an applied POM
  14/17/18 line — no POM-vs-decorative distinction.

Full rationale and the alternatives rejected along the way are in
[ADR 0053](../../../decisions/0053-curved-lines-grow-extra-anchor-points-on-demand.md).

## Affected Users

- **Technical designer (TD)** — gains a way to shape an illustrative/stitch
  curve (e.g. tracing a cup seam) with several bends, without any change to
  how a POM measurement curve is drawn or edited today.

## Affected Product Docs

- `CLAUDE.md` (suite list, if a new/extended suite is added)
- `TESTING.md`, `docs/TEST_MATRIX.md`
- `ARCHITECTURE.md` (module map for `curves.js`, `hit-testing.js`,
  `pointer-events.js`, `canvas-tools.js`, `line-nudge.js`,
  `annotation-clipboard.js`, `label-layout.js`)
- `docs/decisions/0053-curved-lines-grow-extra-anchor-points-on-demand.md`

## Non-Goals

- Changing the default shape of a freshly-drawn curve — still exactly the
  2-handle single cubic unless the TD explicitly adds a point.
- Any change to the POM contract or anchor schema
  (`auto_mode_rules/pom-template.json`, `anchor-schema.json`,
  `POMS_CONTRACT.md`).
- Auto Mode drafting/detection behavior — this is a Manual Mode editing
  feature only.
- A persistent per-anchor "corner vs. smooth" state — rejected in ADR 0053
  (Alt+drag is a momentary override, not a stored mode).
- Shape-preserving fit when a point is deleted — rejected in ADR 0053
  (insertion is lossless, deletion is not, by design).
- Hiding inactive anchors' handles — deferred as a follow-up only if handle
  clutter reappears in practice (ADR 0053 Follow-Up).
- Any change to the Construction/BOM leader-line engine (`ccDrawCallout`) —
  a separate engine per ADR 0041, untouched by this story.
