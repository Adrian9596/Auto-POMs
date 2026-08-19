# 0035 Single-photo three-view board support

Date: 2026-07-22

## Status

Accepted

## Context

Technical designers paste boards that contain three panels in ONE photo —
front-outer + back + front-inner — not just the two-panel front+back layout the
detector was built and tested for. On these 3-view boards the TD reported "lines
and anchors in incorrect position." Root causes, confirmed on
`demo/EvelynBliss vA 2.0.jpg` (the TD-supplied reference):

1. **Panel merge.** `detectSketchViewBoxes` groups connected components by
   horizontal gap. With unevenly-spaced panels, two panels closer than the gap
   threshold merged into one double-wide box (EvelynBliss: back+inner grouped
   into one 0.565w box), and `reviewRequired` was `false` — so the tool
   *silently* placed the back anchors smeared across the empty gap between the
   two merged panels. The existing valley-splitter only ran when grouping
   returned exactly ONE box, so it never fired here.
2. **Role scramble.** `classifySketchViewRoles` assigned roles greedily
   (back → inner → outer). With three fuzzily-scored panels this mislabels which
   panel is which; `backScore` in particular over-weights "rightness," a valid
   prior for a 2-panel front|back board but wrong when the back is the middle
   panel and an inner cutaway is on the right.
3. **Inner POMs on the wrong panel.** The relocation of POM 9/10/17/18 onto a
   front-inner view (ADR-0034) only handled a SEPARATE inner photo (aux view);
   for an in-image inner panel the cup/neckline/armhole anchors kept the
   front-outer panel's coordinates, landing over empty space.
4. **Uncorrectable roles.** The view-role dialog was fired without `await` and
   before anchors were seeded, and never re-seeded — so even correcting the
   roles did not move the lines.

## Decision

Support a single photo that already contains all three views, with no second
photo required — and get the multi-PHOTO (2 photos = 3 views) primary right:

- **Pick the primary photo by aspect (multi-photo boards).** When the board
  holds more than one photo, `pickAutoSourceImage` (src/auto/mode.js) picks the
  widest-by-aspect image as the primary front+back view — a 2-panel front+back
  board is ~2× as wide as tall, a 1-panel front-inner cutaway is ~1× — instead
  of the selected/last-added photo. Fixes the 2-photo case where loading the
  inner cutaway second auto-selected it and made IT primary, swapping the roles
  (the cutaway was force-detected as front+back and the real front+back photo
  became the aux front_inner). The single-photo path (≤1 ready image) is
  unchanged, so every headless test (one image each) is unaffected. Aspect is a
  proxy for the TD rule "the 2-view photo is front+back, the other is front
  inner"; a per-image view-count would be exact but needs detecting every image
  before the pick (a heavier restructure) — deferred.
- **Split over-wide boxes.** `splitWideViewBoxes` splits ANY view box wider than
  half the canvas (>0.50w) at its internal vertical alley, recursively. A single
  garment panel on a multi-panel board is never that wide, so the gate targets
  genuine merges; the per-box sanity gates (empty-alley run + ≥20% ink each side)
  still protect a lone wide panel. Subsumes the former lone-box-only special
  case.
- **Assign 3 roles by left-to-right POSITION.** For ≥3 panels,
  `classifySketchViewRoles` sorts the three highest-ink views by centroidX and
  labels them `front_outer, back, front_inner` in order. This is a fixed
  technical-board convention confirmed by the TD, and far more reliable than any
  visual score (a symmetric racerback back and a molded-cup inner cutaway score
  too alike to separate). Position gets a confident role score, so a cleanly-split
  3-panel board is NOT forced into the review dialog (per the TD: "trust
  position"). The ≤2-panel path is unchanged (golden byte-identical).
  (An earlier revision scored all 6 role permutations by visual fit; it was
  replaced by the positional rule once the TD confirmed the fixed panel order.
  The now-unused `frontInnerScore` / `innerRatio` were removed from
  `scoreViewLayout`.)
- **Transfer inner POMs in-image.** When a front-inner VIEW exists in the same
  photo, `seedAnchorsFromDetection` maps the front-outer's cup/neckline/armhole
  anchors (9/10/17/18) to the corresponding relative position on the inner box.
  POM 8 stays on front-outer (center-front, anchors shared with 5/6).
- **Make role correction real.** `maybePromptForViewRoles` is awaited and passed
  `sourceImage`; anchors seed AFTER roles are confirmed via the extracted
  `seedAndRelocateAnchors`. When the back role moves to a different panel,
  `redetectBackLandmarks` re-runs back-view landmark detection (extracted as
  `detectBackLandmarks`) on the confirmed box so POM 11/12/13/15 re-place.

Because roles now come from position, the back-vs-front_inner assignment is
correct automatically on a standard board (front_outer | back | front_inner) —
no dialog needed. The role-confirm dialog (awaited + re-seed + back-landmark
re-detect) remains as the correction path for the cases that still raise
`viewRoleReviewRequired`: >3 panels, or a sketch that cannot be cleanly split
into distinct panels.

## Alternatives Considered

1. **Tighten the component-grouping gap threshold** instead of splitting
   afterward. Rejected: fragile — it also over-splits single panels and
   under-merges legitimately-close 2-panel boards. The split-at-alley approach
   uses actual empty-column evidence.
2. **Detect back/inner from cups (apex/cup-bottom presence)** instead of by
   position. Rejected: cheap proxies (lower-central ink, cup-underline run,
   bottom-edge bumps) did not separate a racerback back from a molded-cup inner
   on the real board, and a reliable per-view cup detector would need landmark
   detection before classification (a larger restructure). The TD-confirmed
   left-to-right panel order made this unnecessary.
3. **Re-run FULL detection on role change.** Rejected: heavier and unnecessary —
   only back landmarks are baked to a box; front is reliably auto-detected and
   inner is box-relative.

## Consequences

Positive:

- 3-view single-photo boards no longer merge panels or silently mis-place
  anchors; front / back / inner POMs land on their own panels.
- On a standard board the roles are assigned automatically by panel position —
  correct on load, with no confirmation dialog.
- Inner cup/neckline/armhole POMs measure on the in-image inner panel — no
  second photo needed.
- Correcting view roles in the dialog now re-places every anchor, including a
  back-landmark re-detection.
- No regression: golden 0.0000 on all 11 established demos; invariants 135/135;
  smoke green; contract green on all established demos + EvelynBliss vA 2.0.

Tradeoffs:

- Positional role assignment assumes the fixed front_outer | back | front_inner
  order. A board that violates it would be mislabeled AND not raise the review
  dialog (roles get a confident score), so the TD would have to correct via
  anchors — and there is currently no in-app way to re-open the role dialog
  (see Follow-Up).
- Changing the FRONT/primary panel in the dialog does not re-run front-geometry
  detection (cup model, axis) — only back re-detects. Front is reliably
  auto-detected, so this is rarely needed.
- Three narrow panels ALL packed under the merge threshold recover only two
  boxes (the residual pair falls under the 0.50 split gate). The common pattern
  (one separated panel + two merged, as in EvelynBliss) is handled.
- Invariants B1–B4 (front-axis cup-side checks) are skipped when POM 9/10 are on
  the inner view — they do not apply there; inner-view shape is still guarded by
  the view-agnostic A-series.

## Follow-Up

- Add an in-app way to RE-OPEN the view-role dialog (or a per-view role toggle),
  so a board that breaks the front|back|inner convention can be corrected without
  dragging every anchor — position now assigns confidently and never re-prompts.
- Detect inner-panel neckline/armhole (17/18) on the inner box directly instead
  of transferring front coordinates; refine the
  `scripts/groundtruth/EvelynBliss vA 2.0.jpg.json` 171/172/181/182 estimates.
- Consider re-detecting front geometry when the TD changes the primary panel.
- POM 7 marginal miss on `demo/EvelynBliss vA 1.0.jpg` (`C7.start-off-cf`,
  0.0244 vs 0.048) — a front cradle-POM placement issue, out of scope here.
