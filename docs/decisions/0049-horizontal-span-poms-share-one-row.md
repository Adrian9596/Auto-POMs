# 0049 Horizontal-span POMs draw through both of their anchors

Date: 2026-08-18

## Status

Accepted

## Context

POM 1, 3, 15 and 16 are horizontal spans. `buildPOMFixtureFromAnchors` drew each
of them level at the **left** anchor's `y` and discarded the right anchor's,
which is correct TD semantics (a band width is measured horizontally) but only
safe while the two anchors are at the same height. When they were not, the line
silently missed the right-hand pin while both pins still rendered correctly —
anchors right, line wrong, at up to 12% of image height.

Investigating that produced two findings that pull in opposite directions:

- **POM 1 / 3 / 15 pairs ARE one row.** `band-left`/`band-right` are the two
  ends of one detected band seam; `chest-*` and `back-strap-*` likewise. The
  seeder shared a row in its ink branch but let each side pick its own view-box
  ratio in the fallback branch, so one-sided ink split the pair. For chest the
  two fallback ratios also disagreed with each other (`0.615` vs `0.605`).
- **POM 16's pair is NOT one row.** `apex-left` and `apex-right` are detected
  independently on their own sides, and the TD ground truth in
  `scripts/groundtruth/` legitimately labels them at different heights (slants
  of 0.0135, 0.0418, 0.0548). On `demo5.jpg` detection reproduces the labelled
  pair exactly. Flattening the apex pair onto a shared row would move anchors
  **away** from TD truth.

So one symptom, two different correct responses.

## Decision

**Fix the seeding for the pairs that are genuinely one row.** `band-*`,
`chest-*` and `back-strap-*` take **x** per side and **y** from the shared row
variable in every branch, so force-levelling becomes a no-op and the line passes
through both pins.

**Fix the line, not the anchors, for POM 16.** The apex anchors stay exactly
where detection puts them. The line is levelled at the **midpoint** of the two
apex heights, so a legitimate height difference costs each pin half the gap
instead of loading all of it onto the right-hand one.

**Demote POM 16 to REVIEW_ONLY when the pair is not credible.** Past a point the
gap stops being a real height difference and becomes one side mis-detected: on
`demo7.png` `apex-left` is exactly right while `apex-right` is off by 0.134, and
averaging that would drag the correct anchor off truth. The test is the line's
**slant** (`dy/dx`), not an absolute distance — scale-free, so the same garment
feature scores the same on a 3-view board as on a lone sketch, the same
reasoning as the POM 7 arc-tier floor in [ADR 0022](0022-pom7-arc-tier-structure-draft.md).
The threshold is **0.06**, chosen from the data: every TD-labelled apex pair
slants at most 0.0548, and every detected slant that ground truth proves wrong
is at least 0.0767.

## Alternatives Considered

1. **Flatten the apex pair onto a shared row too, for consistency with POM
   1/3/15.** Rejected: it contradicts TD ground truth on `demo5.jpg` and
   `EvelynBliss vA 2.0.jpg`, and on `demo7.png` it would move the *correct*
   `apex-left` 0.061 away from truth while leaving `apex-right` 0.061 off —
   strictly worse than the bug.
2. **Draw POM 16 as a slightly slanted line through both anchors.** Rejected:
   POM 16 is a horizontal measurement and `HLN.16` encodes that; a slanted line
   would report a hypotenuse, not a width.
3. **Fix the `apexRight` detector instead.** Not rejected, deferred — and
   **since done**, in US-084: the two joins are now found as a pair, so an
   outlier side is re-searched around the trusted side's row. `demo7`'s 0.134
   error fell to 0.0115 and POM 16 draws there again. The REVIEW_ONLY demotion
   decided here is what made that failure visible in the first place, and it
   still guards the pairs the repair cannot reconcile.
4. **Leave POM 16 alone.** Rejected: it was the worst instance of the reported
   symptom (11 of 21 fixtures, up to 0.122).

## Consequences

Positive:

- A drawn horizontal span now terminates on its anchors, so "the anchors are
  right but the line is wrong" cannot recur for POM 1/3/15.
- Anchor accuracy is untouched: `npm run accuracy` is numerically identical
  before and after (mean 0.0200, p90 0.0443), because no anchor moved.
- `golden` stayed byte-identical for the POM 1/3/15 fix — every fixture detects
  band/chest ink on both sides, so the corpus never reaches the repaired branch.
  That byte-identity is now the safety property for changes in this area: drift
  means the change leaked into the ink path.
- Three new assertion families close the verification gap that let this ship:
  **TRA** (line passes within `EPS_LINE_ANCHOR` of both required anchors),
  **RPF** (re-seeds the one-sided branch no fixture can reach), **E1–E3**
  (each genuine row-pair shares a `y` exactly), plus **APX** for POM 16's
  midpoint property. `contract` 753 → 874, `invariants` 135 → 174.

Tradeoffs:

- POM 16 becomes REVIEW_ONLY on 3 of the 13 golden fixtures
  (`demo1.jpg`, `demo amorafit.png`, `demo7.png`), dropping
  `acceptedWithoutEditCandidates` 18 → 17 on each. That coverage drop is honest:
  ground truth shows the line those fixtures used to draw was wrong, and a
  confident-looking wrong line is worse for a TD than no line.
- The 0.06 slant threshold is calibrated against five TD-labelled fixtures. If
  a future sketch legitimately slants harder, POM 16 will demote and need the
  TD to place the apex anchors by hand.
- `CLA_EXPECT` remains formula-mirroring by design; TRA/APX exist precisely
  because a formula-mirroring assertion cannot catch a wrong formula.

## References

- Story: `docs/stories/epics/E07-measurement-detection/US-083-band-chest-shared-row-seeding.md`
- Follow-up: `docs/stories/epics/E07-measurement-detection/US-084-apex-pair-row-repair.md`
  — fixed the `apexRight` detector (alternative 3 above), which is what removed
  the POM 16 failures this ADR could only make visible.
- [ADR 0022](0022-pom7-arc-tier-structure-draft.md) — the scale-free-fraction precedent and the
  "review-only beats a confident wrong line" precedent.
