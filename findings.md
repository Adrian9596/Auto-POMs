# Findings — "anchors đúng, lines/POM sai vị trí"

Working log of the bugs investigated and fixed while chasing one reported
symptom: **an anchor sits in the right place, but the POM line built from it
doesn't.** The symptom had three unrelated root causes, found one at a time.
Full detail (root cause, evidence, validation) lives in each linked
story/ADR — this file is the short index.

## Finding 1 — POM 1/2/3/4 lines miss their band/chest anchors

- **Symptom:** immediately after Detect → Generate, `band-left`/`band-right`
  (POM 1/2) and `chest-left`/`chest-right` (POM 3/4) render at the correct
  spot, but the drawn line sits level at one anchor's height and misses the
  other by up to 12% of image height.
- **Root cause:** [`src/auto/anchors/seed-anchors.js`](src/auto/anchors/seed-anchors.js)
  — the *fallback* seeding branch (used when ink wasn't found on one or both
  sides) let each side of a row-pair pick its own `y` independently, instead
  of both taking `y` from the one shared detected row. `generate-pom-fixture.js`
  then force-levels the line at the left anchor's `y` (correct TD semantics,
  a band width is horizontal) — harmless while both anchors agreed, visible
  the moment they didn't.
- **Why no suite caught it:** all 21 golden fixtures detect ink on both
  sides, so the corpus never reached the fallback branch; the contract test
  mirrored the drafter's own (buggy) formula instead of asserting against the
  anchors.
- **Fix:** `band-*`/`chest-*`/`back-strap-*` now take `y` from the shared row
  variable in every branch. Same fix applied to POM 15 (back-strap pair,
  identical defect).
- **Status:** Fixed, deployed. Commit `07d4bb0`.
- **Story / ADR:** [US-083](docs/stories/epics/E07-measurement-detection/US-083-band-chest-shared-row-seeding.md),
  [ADR 0049](docs/decisions/0049-horizontal-span-poms-share-one-row.md).

## Finding 2 — POM 16 (apex) forced-level onto the wrong pin

- **Symptom:** same class as Finding 1, but for `apex-left`/`apex-right`.
- **Twist:** unlike band/chest, the apex pair is **not** always one row —
  ground truth shows real bras with a legitimate small height difference
  between the two apex points. Flattening them onto a shared row (the
  Finding-1 fix) would have moved anchors *away* from TD truth.
- **Fix:** anchors left exactly where detected; the **line** draws level at
  the **midpoint** of the two apex heights instead of the left pin, so a real
  height difference costs each pin half the gap instead of all of it. Past a
  data-calibrated **slant** (`dy/dx`) of **0.06**, the pair is no longer
  credible (one side is very likely mis-detected) and POM 16 demotes to
  `REVIEW_ONLY` rather than draw a confident-looking wrong line.
- **Status:** Fixed, deployed. Commit `07d4bb0` (same commit as Finding 1).
- **Story / ADR:** same as Finding 1.

## Finding 3 — `apexRight` detector: the two apex joins picked independently

- **Symptom:** on `demo7.png`, `apex-left` landed exactly on the TD-labelled
  row while `apex-right` was off by **0.134** (13% of image height) — the
  worst case behind Finding 2's `REVIEW_ONLY` demotions.
- **Root cause:** [`src/auto-detection.js`](src/auto-detection.js) —
  `findCupStrapJoinFromInk` runs once per side with no knowledge of the
  other side, and deliberately prefers the **topmost** qualifying run (to
  land on the strap join, not a lower cup-body seam). A stray high feature
  on one side alone (trim line, ribbon tick) baited that preference. Nothing
  downstream caught it: `validateCupApexPair`'s tolerance (`bboxH * 0.22`)
  was wide enough to wave through a 13% error, and dropped *both* joins on
  failure instead of repairing one.
- **Fix:** `repairApexPairRow` — after the independent per-side pass, if the
  pair's slant exceeds the same 0.06 gate, re-search the lower-confidence
  side with the trusted side's row as a hint (a hinted retry that scores by
  proximity to that row instead of the topmost-run preference, so it can't
  just re-pick the same stray in a smaller window).
- **Result:** `demo7.png` `apex-right` error **0.134 → 0.0115**. Ripples into
  POM 9/10/14/17/18 (all fed by the apex join) measured as net improvements
  via `npm run accuracy` (mean error 0.0200 → 0.0190), no anchor-kind
  regressed.
- **Status:** Fixed, deployed. Commit `198263c`.
- **Story / ADR:** [US-084](docs/stories/epics/E07-measurement-detection/US-084-apex-pair-row-repair.md).
- **Known gaps left open:** `demo amorafit.png`'s apex-left move is
  plausible but has no ground truth to confirm it; `demo1.jpg`'s apex pair
  is still ~0.0245 *uniformly* too high (both anchors together, not an
  asymmetry this fix targets).

## Finding 4 — dragging an anchor by hand doesn't move its POM line

- **Symptom:** reported as "anchors đúng nhưng lines không đúng vị trí" on a
  sketch the user said was itself mis-detected — i.e. the real workflow was
  Detect → Generate → **drag an anchor to correct it** → the line didn't
  follow. Not reproducible on any fixture through auto-detection alone
  (Findings 1-3 cover the auto-detection paths); only reproduced by
  simulating a real mouse drag against the live app.
- **Root cause:** `moveAnchorBy` calls `syncBandChestDraftsFromAnchors` on
  every drag tick to keep the draft line tied to the anchor while dragging —
  but that function only ever recognized `band-left/right` and
  `chest-left/right` (POM 1-4). Every other POM's draft line is baked once
  at Generate time and never revisited: anchors resolve live from normalized
  position every frame, draft lines don't. Dragging *any* anchor outside
  band/chest (apex, cradle-cup, inner-cup, side, back-*, strap-top, 171/172,
  181/182 — everything except POM 1-4) moves the pin but leaves the line
  stale.
- **Fix:** extended the sync function to also cover `apex-left`/`apex-right`
  → POM 16, including re-deriving the midpoint line and the live
  `DRAWABLE`⇄`REVIEW_ONLY` slant-gate flip (with proper null-geometry on
  `REVIEW_ONLY`, per `validate-fixture.js`'s "REVIEW_ONLY row must have null
  geometry" rule — missed on the first pass, caught by re-verifying).
- **Verification:** real Chrome mouse drag (`left_click_drag`), both
  directions — drag past the slant limit → line vanishes, `REVIEW_ONLY`,
  null geometry; drag back within limit → line reappears at the new
  midpoint, live, no re-Generate needed. `golden`/`contract`/`invariants`/
  `smoke` all pass unchanged (none of them exercise a drag — see gap below).
- **Status:** **Fixed locally, NOT yet committed/pushed** — scoped to POM 16
  only, by explicit choice.
- **Story:** [US-085](docs/stories/epics/E07-measurement-detection/US-085-apex-drag-sync.md).
- **Known gaps left open (biggest one in this file):**
  - **The other 13 POMs (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18) still
    have this exact bug.** Dragging any of their anchors after Generate
    leaves the line stale. Fixing all of them was deferred — it means either
    re-running full per-POM generation logic on every drag tick (risk:
    could reset unrelated `tdApproved`/`tdEdited` draft state) or writing 13
    more hand-written incremental formulas.
  - **No automated suite simulates a mouse drag at all**, for POM 16 or for
    the pre-existing POM 1-4 sync this was copied from. `golden`/`contract`/
    `invariants` only ever exercise Generate-time output. This is *why*
    Finding 4 could exist silently since band/chest sync was first written —
    recommended follow-up is extending the CDP harness with a real
    mousedown/mousemove/mouseup simulation and asserting post-drag draft
    geometry.

## Cross-cutting notes

- Findings 1+2 (seeding) and 4 (drag-sync) are the **same symptom class**
  ("anchor right, line wrong") from **three different triggers**: a seeding
  fallback, a legitimately-non-level pair, and a manual TD correction. If
  this symptom is reported again, check which trigger before assuming it's
  a new bug.
- `golden` cannot judge whether a detector change is a net improvement when
  it ripples into other POMs (Finding 3) — only `npm run accuracy` scores
  against TD ground truth. `golden` also cannot see anything in the
  drag-sync class (Finding 4) at all, by construction.
