# US-083 Horizontal-Span POMs Draw Through Both Anchors

## Status

implemented

## Lane

normal

Change request against accepted detection behaviour. Risk flags: existing
behavior (anchor seeding), weak proof (the affected branch had no coverage).
Two flags, no hard gate — normal lane with stronger validation.

## Reported Symptom

Immediately after Detect → Generate, with no anchor drag and no photo resize,
every anchor renders in the right place but POM lines 1, 2, 3 and 4 sit
**vertically** off: the line is horizontal at one anchor's height and misses the
other anchor, which sits higher or lower.

## Relevant Product Docs

- [ADR 0049](../../../decisions/0049-horizontal-span-poms-share-one-row.md) —
  the decision record for both halves of this change.
- [ADR 0022](../../../decisions/0022-pom7-arc-tier-structure-draft.md) — the
  scale-free-fraction and review-only-beats-a-wrong-line precedents.
- `POMS_CONTRACT.md`, `TESTING.md`

## Product Contract

`band-left`/`band-right` are the two ends of ONE horizontal band row, and
`chest-left`/`chest-right` of ONE chest row. The seeder gives both ends of a row
the same `y` in every branch, so a POM that is drawn level passes through both
of its pins. Detection strength, POM geometry, persistence and export behaviour
are unchanged.

## Root Cause

Two individually-correct rules that are wrong together.

1. **Seeding** (`src/auto/anchors/seed-anchors.js`) resolved each side of a pair
   independently. The ink branch shared a row (`bandYf` / `chestSeedY`), but the
   fallback branch let each side take its own view-box ratio:
   - one side's ink found, the other not → ink row `y` vs view-box ratio `y`;
   - chest with neither side found → `0.615` (left) vs `0.605` (right), which
     also disagreed with `chestSeedY`'s own `0.615` fallback.
2. **Drafting** (`src/auto/drafts/generate-pom-fixture.js`) force-levels the
   horizontal spans: POM 1 draws at `band-left.y` and POM 3 at `chest-left.y`,
   discarding the right end's `y`, while POM 2/4 hang off the RIGHT end's `y`.
   That is correct TD semantics (a band width is measured horizontally) and is
   harmless while the pair shares a row — and visible the moment it does not.

Anchors stayed correct throughout because they are stored normalized and
resolved live every frame (`anchorWorldPos`), while a line's world coordinates
are baked once from the fixture.

POM 15 (`back-strap-left`/`-right`) had the same defect and is fixed here too;
its ink branch was worse, taking an independent `y` per side.

## Why No Suite Caught It

- `contract`'s CLA series recomputes the drafter's own formula, so for POM 1 it
  asserted `end = (R.x, L.y)` — it reproduced the `y`-discard and could never
  fail on it.
- All 21 golden fixtures detect band and chest ink on **both** sides, so the
  fallback branch was unreachable from the corpus and POM 1/3 landed exactly on
  their anchors in every baseline.
- `scripts/groundtruth/*.json` labels anchors only, so `accuracy` never checked
  line-through-anchor.

## Change

- `src/auto/drafts/generate-pom-fixture.js` — POM 16 levels at the apex midpoint
  and demotes to REVIEW_ONLY past a 0.06 slant (`APEX_MAX_SLANT`).
- `src/auto/anchors/seed-anchors.js` — new `inViewX` helper; band, chest and
  back-strap pairs now take **x** per side and **y** from the shared row
  variable in every branch. The ink-on-both-sides path is untouched.
- `scripts/pom-contract-tests.mjs` — new **TRA** series (the line must pass
  within `EPS_LINE_ANCHOR` of both required anchors, formula-independent) and
  new **RPF** series (re-seed from the captured detection with one side's ink
  nulled, covering the branch no fixture can reach).
- `scripts/invariant-tests.mjs` — new **E1–E3**: each genuine row-pair shares a
  row exactly (apex deliberately excluded).
- `scripts/pom-contract-tests.mjs` — new **APX.16** for the midpoint property;
  `CLA_EXPECT['16']` updated to the midpoint formula.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Build membership, syntax |
| Integration | RPF re-seeds the one-sided branch on every demo |
| E2E | Auto smoke; golden byte-stability |
| Release | golden, contract, invariants, accuracy all pass |

## Evidence

- `npm run build` + `npm run check`: pass (cache-buster `6c5373854522`).
- `npm run golden`: PASS on all 13. The band/chest/back-strap fix left every
  baseline byte-identical (the corpus is all both-ink, so it cannot reach the
  repaired branch); the 7 POM 16 baselines were re-seeded deliberately, listed
  below.
- `npm run contract`: PASS **874/874** (was 753/753; +39 TRA, +78 RPF, +13 APX).
- `npm run invariants`: PASS **174/174** (was 135/135; +39 E-series).
- `npm run smoke`: PASS, 18 lines applied, zero failures.
- `npm run accuracy`: regression gate OK — no image, anchor-kind or overall
  regression.
- **A/B against the pre-fix seeding** (restored the old four lines, rebuilt, ran
  `contract`): RPF fails across fixtures with exactly the reported symptom —
  `EvelynBliss vA 1.0.jpg` splits the band pair by `dy=0.0677` (POM 1 missing
  `band-right` by ~6.8% of image height), `demo1.jpg` by `dy=0.0027`, chest
  splits of `0.0021`–`0.0088`, plus "row is X but detection resolved Y" where an
  anchor took the view-box ratio instead of the detected band row. Restoring the
  fix returned `app.js` to the identical cache-buster.

## POM 16 — Fixed Differently, On Purpose

POM 16 showed the same symptom and was the worst instance (11 of 21 fixtures, up
to 0.122), but ground truth showed a **different cause**, so it got a different
fix. See [ADR 0049](../../../decisions/0049-horizontal-span-poms-share-one-row.md).

`apex-left` and `apex-right` are detected independently per side, and the TD
labels them at genuinely different heights (`scripts/groundtruth/` slants
0.0135 / 0.0418 / 0.0548; on `demo5.jpg` detection reproduces the labelled pair
exactly). Flattening them onto a shared row would move anchors AWAY from TD
truth — on `demo7.png` `apex-left` is exactly right and `apex-right` is off by
0.134, so averaging would drag the correct anchor 0.061 off truth.

So the anchors were left alone and the **line** was fixed:

- It is levelled at the **midpoint** of the two apex heights, so a legitimate
  height difference costs each pin half the gap instead of loading all of it
  onto the right-hand pin.
- Past a credibility limit the gap means one side is mis-detected, so POM 16
  demotes to **REVIEW_ONLY** instead of drawing a confident-looking wrong line
  (the [ADR 0022](../../../decisions/0022-pom7-arc-tier-structure-draft.md)
  precedent). The test is the line's **slant** (`dy/dx`) — scale-free, so the
  same feature scores the same on a 3-view board as on a lone sketch. Threshold
  **0.06**, sitting in the empirical gap between the hardest TD-labelled slant
  (0.0548) and the softest detected slant ground truth proves wrong (0.0767).

New **APX.16** contract assertion: the line must favour neither pin (equidistant
within `EPS_LINE_ANCHOR`) and that distance must equal half the pair's height
spread. The E-series deliberately does NOT cover the apex pair — it is not one
row — and that exclusion is commented at both sites.

### Re-baselined fixtures

7 golden baselines re-seeded, each with `--update --only=<fixture>` (never a bare
`--update`):

| Fixture | Change |
| --- | --- |
| `demo1.jpg` | POM 16 → REVIEW_ONLY (slant 0.077; GT says the pair is level) |
| `demo amorafit.png` | POM 16 → REVIEW_ONLY (slant 0.110) |
| `demo7.png` | POM 16 → REVIEW_ONLY (slant 0.568; GT: `apex-right` off by 0.134) |
| `demo5.jpg` | POM 16 line → midpoint (drift 0.0014) |
| `demo 8.png` | POM 16 line → midpoint (drift 0.0011) |
| `EvelynBliss vA 1.0.jpg` | POM 16 line → midpoint (drift 0.0016) |
| `EvelynBliss vA 2.0.jpg` | POM 16 line → midpoint (drift 0.0015) |

The three demotions drop `acceptedWithoutEditCandidates` 18 → 17. That drop is
honest — ground truth shows the line they used to draw was wrong.

**No anchor moved.** `npm run accuracy` is numerically identical before and
after (mean 0.0200, median 0.0000, p90 0.0443, regression gate OK), which is the
proof for this half of the change.

## Follow-up

US-084 fixed the `apexRight` detector that caused `demo7`'s 0.134 error, so the
three POM 16 demotions recorded above now draw again — on the correct row. The
demotion gate stays as the guard for pairs the repair cannot reconcile.

## Harness Delta

The Harness CLI binary is present but no durable rows were added; this checked-in
story is the work record.
