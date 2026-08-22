# Validation

## Proof Strategy

Two things must both hold:

1. **Every existing curved-annotation behavior is provably unchanged** when
   no extra anchor is added — `points: []` must be the true default, so
   nothing already shipped (POM 14/17/18 measurement, the 2-handle drag,
   golden determinism, whole-line Delete) moves at all.
2. **The new anchor add/edit/delete gestures work exactly per ADR 0053's
   decisions**, proven with real synthetic `mousedown`/`mousemove`/`keydown`
   sequences against `#boardCanvas` — matching `board-interaction-check.mjs`'s
   own house rule of being the suite that drives real gestures, not internal
   handler calls, because the press-priority chain itself is part of what's
   under test.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | De Casteljau split at a given `t` reproduces the original sampled path within tolerance; mirrored-handle recomputation is correct for both handles of a fresh anchor; `getCurveBeziers` returns the 2-handle fallback unchanged when `points` is empty or absent. |
| Integration | `npm run check`; `npm run contract` unchanged (0 regressions) on every existing fixture; `npm run golden` byte-identical on every fixture (zero-anchor case). |
| E2E | Extend `board-interaction-check.mjs`: toolbar drop-down opens/closes and marks the active tool; "Add point" button hidden unless a curved annotation is selected; click inserts an anchor with the curve's sampled shape unchanged before/after; dragging one of a fresh anchor's handles moves the paired handle to stay collinear; Alt-held drag moves only the one handle; a following plain (non-Alt) drag re-mirrors; selecting an interior anchor then Delete/Backspace removes just it and leaves the line intact; Delete with no interior anchor active still deletes the whole line. |
| Platform | N/A — single browser target, no platform split. |
| Performance | N/A — no measurable regression expected; skip unless Implementation surfaces a concrete concern. |
| Logs/Audit | N/A — no audit surface in this app. |

## Fixtures

- Existing `demo/*.jpg` sketches for the gesture suite.
- A project-file fixture representing a **legacy** curved annotation
  (2-handle only, no `points` field) to prove load → save → load round-trips
  byte-identical.
- A project-file fixture with a curve that already carries extra anchors, to
  verify reload, history undo/redo, and copy/paste/reflect all carry
  `points[]` correctly.

## Commands

```text
npm run build && npm run check
npm run board-interaction-check
npm run golden
npm run contract
npm run invariants
npm run autosave-check
```

## Acceptance Evidence

2026-08-21 — full battery green (24/24 suites):

```
check                       PASS
notes-check                 PASS (188 checks, unchanged)
autosave-check               PASS
export-hidden                PASS
export-xlsx                  PASS
smoke                        PASS
golden                       PASS
accuracy                     PASS (p90 error 0.0427, unchanged)
invariants                   PASS (187/187)
contract                     PASS (883/883)
pipeline-tests / junction-tests / learning-tests / evidence-tests
suggestions-tests / library-l0-tests / library-intake-tests
detection-limitations                                        all PASS
board-toolbar-check          PASS (30/30 — "empty Manual" set updated for the
                              consolidated toolbar, a reviewed change)
board-interaction-check      PASS (94/94 — was 88; -3 retired vacuous-pass
                              reflow scenario, +9 new section 4c)
mainpage-check / construction-check / bom-check / preview-check   all PASS
```

Manual browser verification (before writing the automated section, per this
project's standing convention) via `window.__braAutoModeDebug`, confirmed
independently of the automated suite:

- Insertion lands exactly on the pre-existing curve (`anchor.point` matched
  the original cubic's `t=0.5` sample to full float precision).
- Delete with the anchor active removes just it (points 1 → 0, line count
  unchanged); Delete again with nothing anchor-specific active removes the
  whole line.
- Plain drag of a fresh anchor's handle mirrors the other (verified via the
  actual math: new handle's angle from the anchor is exactly opposite,
  original handle's own length unchanged).
- Alt-held drag leaves the opposite handle byte-identical; the next plain
  drag re-mirrors it.
- Project export → mutate → `loadProject` round-trips `points[]` exactly
  (`JSON.stringify` equality).
- A legacy annotation with no `points` field at all loads with `points: []`
  after `ensureCurveControls` — no migration error, no data loss.
- Toolbar: `#toolsMenuBtn` opens/closes via the shared `BOARD_TOOLBAR_MENUS`
  registry, shows "Tools: Straight" once a grouped tool is chosen, and
  clicking "Straight line" inside it sets `state.tool` and closes the menu.

One negative control: temporarily replaced `if (!altHeld)
mirrorOppositeCurveHandle(...)` with `if (false) ...` in
`src/manual/pointer-events.js`, rebuilt, and confirmed
`board-interaction-check` failed with exactly: *"POM 9: a plain drag of one
handle must keep the opposite handle collinear through the anchor (no
kink)"* — then reverted and confirmed the rebuilt `app.js` hash
(`0b52acf205da...`) matched the pre-control build exactly.

## Post-verification fix (2026-08-21)

A `/code-review` pass on this story's own diff — ten independent finder
agents, five of them converging on the same defect from different angles —
found that `moveAnnotation` (`src/manual/pointer-events.js`) and
`scaleAnnotationAbout` (`src/manual/viewport.js`) predate `ann.points` and
never included it in their fixed-field loops. This means the "24/24 suites
green" and "94/94" evidence above, while true, did not cover "move or resize
a curve that has an interior anchor" — no suite in the repo exercised that
combination. Live effect before the fix: dragging a curved line's body (or
its photo) left an interior anchor behind, tearing the curve; resizing a
photo left the anchor unscaled, silently changing that POM's measured
length.

Fixed by adding an `ann.points` loop to both functions (same pattern as the
existing fixed-field loop). Added two new `board-interaction-check`
assertions to close the coverage gap:

- **4d** — adds an interior anchor, deselects, drags the curve's body from a
  point clear of the anchor (using the pre-insertion `bez(before, t)`
  formula, valid because insertion is shape-preserving), and asserts the
  anchor moves by the same delta as `start`.
- **4e** — same setup, then resizes the photo via the existing "widest clear
  spot" corner-drag technique, and asserts the anchor's position relative to
  `start` scales by the same factor as the photo.

Negative control: reverted both fixes to `if (false) { ... }`, rebuilt, and
confirmed `board-interaction-check` failed with exactly *"POM 9: dragging
the line's body must move an interior anchor by the same delta as its
endpoints — the curve must not tear at the anchor"* — then restored the fix
and confirmed the rebuilt `app.js` hash (`aa06448b012f...`) matched the
pre-control build exactly.

Full battery re-run after the fix, all green: `check`, `board-interaction-check`
(98/98, was 94), `golden` (0.0000 drift), `contract` (883/883), `invariants`
(187/187), `autosave-check`, `board-toolbar-check` (30/30).

Two related, lower-severity gaps the same review surfaced were fixed
immediately after, on request:

- `specPanelFingerprint` (`src/ui/spec-panel.js`) now hashes `ann.points`.
  Verified live in-browser: applied Auto Mode's POM 9, added an interior
  anchor, read the Measurements panel's Value cell (82px), dragged the
  anchor's handle (Value cell live-patches to 100px via the existing
  US-028 mechanism), then hit Ctrl+Z. Before the fix, the panel stayed at
  100px after the undo even though the geometry had reverted (confirmed via
  a negative control — temporarily excluding `points` from the fingerprint
  reproduced this exact stale value); after the fix, the panel correctly
  shows 82px again post-undo.
- The learning-evidence normalizers (`normalizeLineForEvidence` in
  `src/auto/learning/style-evidence-capture.js`, `normalizeEvidenceLine` in
  `src/auto/learning/style-evidence-record.js`) now capture and round-trip
  `ann.points`, the same way they already handle `control1`/`control2`/
  `midPoint`. Verified live: ran Auto Mode on `demo1.jpg`, applied drafts,
  added an interior anchor to POM 9, called `styleEvidence.collectCandidates`
  / `commitCandidates`, and confirmed the resulting record's `line.points`
  carries the anchor's normalized point/handleIn/handleOut. `learning-tests`
  and `evidence-tests` both still pass (exit 0, no failures).

This data is captured but not yet *consumed* — `style-evidence-reuse.js`'s
draft-biasing only ever reads `start`/`end` medians, matching how
`control1`/`control2`/`midPoint` have always been captured-but-unused. Full
battery re-run green after both fixes: `check`, `board-interaction-check`
(98/98), `learning-tests`, `evidence-tests`, `golden`, `contract` (883/883),
`invariants` (187/187), `autosave-check`, `board-toolbar-check` (30/30).

## Multi-segment sampling fix (2026-08-22)

Code review found that `getAnnotationPolyline(ann, samples)` still treated
`samples` as one fixed budget for the entire curve. Once `points[]` grew the
chain beyond about 20 segments, the 50-sample measurement path reached its
two-chord-per-segment floor. A cubic S-bend can cross its midpoint chord, so
those two samples can alias a long bend into a nearly straight segment. The
same helper feeds measured length, line hit-testing, marquee selection,
stitches, and the default half-arc label position.

The zero-anchor and retired legacy-midpoint paths keep the old equal budget
exactly. Curves carrying `points[]` now use `curveChordSampleCount(seg)` per
segment (24 minimum, 512 maximum, curvature-driven and zoom-independent),
never less than the caller's old per-segment budget. The focused
`curve-polyline-tests` suite loads the production source parts into a Node VM
and includes the replaced algorithm as a negative control: on its 30-segment
S-curve the old two-chord sampler must under-count dense arc-length truth by
more than 75%, while production must stay within 0.1%. It also covers the
zero-anchor compatibility path, one-to-four-anchor length stability, bulge
hit-testing, marquee, stitch sampling, half-arc label placement,
measure-scale, zoom independence, and a bounded 100-segment smoke case.

Final verification after the shared hard cap was added:

```text
build / check                  PASS
curve-polyline-tests           PASS (22 checks; 30 segments 3355.41px vs
                                dense 3356.57px; old sampler 300.00px;
                                100 segments 0.5ms)
board-interaction-check        PASS (250 checks)
board-toolbar-check            PASS (54/54)
export-xlsx / export-hidden    PASS
autosave-check                 PASS
golden                         PASS (13 fixtures, maxDrift 0.0000)
accuracy                       PASS (regression gate; mean 0.0190, p90 0.0427)
contract                       PASS (883/883)
invariants                     PASS (187/187)
harness story verify           PASS
git diff --check               PASS
```
