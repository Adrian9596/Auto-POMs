# US-084 Apex Pair Row Repair

## Status

implemented

## Lane

normal

Change request against accepted detection behaviour. Risk flags: existing
behavior (apex detection, and via it POM 9/10/14/16/17/18), weak proof (no
assertion tied the two apex joins to each other). Two flags, no hard gate —
normal lane with stronger validation.

## Relevant Product Docs

- [ADR 0049](../../../decisions/0049-horizontal-span-poms-share-one-row.md) —
  named this as the real root cause of `demo7`'s POM 16 failure and explicitly
  deferred it.
- [ADR 0022](../../../decisions/0022-pom7-arc-tier-structure-draft.md) — the
  scale-free-fraction precedent.
- `POMS_CONTRACT.md`, `TESTING.md`

## Product Contract

The two cup/strap joins are found as a pair, not independently. When the two
sides disagree on row beyond what a real garment can slant, the weaker side is
re-searched around the trusted side's row. A pair that cannot be reconciled is
left alone and POM 16 stays REVIEW_ONLY, so the failure is still visible rather
than fabricated.

## Root Cause

`findCupStrapJoinFromInk` runs once per side with no knowledge of the other, and
deliberately prefers the **topmost** qualifying run so the pick lands on the
strap join rather than a lower cup-body seam. When one side carries an extra high
feature that clears the support gates — a strap ribbon tick, a trim line, a
neckline binding crossing the window — that preference takes the bait on that
side only.

Nothing downstream could see it. `validateCupApexPair` compared the two rows, but
its tolerance was `bboxH * 0.22` — wide enough to wave through a 13% error — and
on failure it dropped **both** joins rather than repairing one. So on `demo7.png`
`apex-left` sat exactly on the TD-labelled row while `apex-right` sat 0.134 above
it, and the pair was accepted.

## Change

`src/auto-detection.js`:

- New `repairApexPairRow` + `apexPairSlant`. After the independent per-side pass,
  if the pair slants (`dy/dx`) past `APEX_SLANT_LIMIT`, re-search the
  lower-confidence side with the trusted side's row as a hint, and keep the
  result **only if it actually reconciles the pair**. Otherwise both candidates
  are returned untouched, so an irreparable sketch degrades exactly as before.
- `findCupStrapJoinFromInk` takes an optional `rowHintNorm`. A hinted retry scans
  only a band around that row **and scores by proximity to it instead of by the
  topmost-run preference** — reusing the top preference would just re-pick the
  same stray inside a smaller window. The tie-break flips to nearest-the-hint too.
- Slant, not absolute distance, for the same reason as ADR 0022: scale-free, so
  the same feature scores the same on a 3-view board as on a lone sketch.

`scripts/invariant-tests.mjs`: new **E4** — POM 16 is DRAWABLE exactly when the
apex pair's slant is within limit. The detector repair and the drafter's demotion
gate share that 0.06 number in two files; E4 fails if they drift apart.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Build membership, syntax |
| Integration | Per-anchor accuracy vs TD ground truth for `apex-right` |
| E2E | Auto smoke; golden re-baseline scoped to the 3 changed fixtures |
| Release | golden, contract, invariants, accuracy all pass |

## Evidence

Measured against TD ground truth (`scripts/groundtruth/`), `apex-right` error:

| fixture | before | after |
| --- | --- | --- |
| `demo7.png` | **0.1336** | **0.0115** |
| `demo1.jpg` | 0.0409 | **0.0245** |
| `EvelynBliss vA 2.0.jpg` | 0.0061 | 0.0061 |
| `demo3.jpg`, `demo5.jpg` | 0.0000 | 0.0000 |

No fixture regressed. `apex-right` mean error across the labelled corpus fell
roughly 4× (~0.036 → 0.0093); `apex-left` is unchanged at 0.0083.

- `npm run check`: pass (cache-buster `38e2a6563370`).
- `npm run accuracy`: **overall mean 0.020000 → 0.019027**, p90 0.0443 → 0.0427,
  within-loose 87% → 88%. Regression gate reports no image, anchor-kind or
  overall regression, and flagged `demo1.jpg` (0.018693 → 0.015609) and
  `demo7.png` (0.007355 → 0.004352) as improvements. Baseline re-locked at the
  tighter numbers so a future regression is caught against them.
- `npm run contract`: PASS **883/883** (874 before — POM 16 became drawable on
  three more fixtures, so more APX/CLA assertions now run).
- `npm run invariants`: PASS **187/187** (174 + 13 E4).
- `npm run smoke`: PASS, 18 lines applied, zero failures.
- `npm run pom7-limitations`, `npm run evidence-tests`: pass.

### Re-baselined fixtures

3 golden baselines re-seeded, each with `--update --only=<fixture>`:

| Fixture | Change |
| --- | --- |
| `demo7.png` | `apex-right` +0.1221 onto the real row; POM 16 REVIEW_ONLY → drawable; ripples into `172`/`182`/POM 14/17/18 |
| `demo1.jpg` | `apex-right` corrected; POM 16 REVIEW_ONLY → drawable |
| `demo amorafit.png` | `apex-left` moved onto the right's row; POM 16 REVIEW_ONLY → drawable |

The three fixtures US-083 had demoted to REVIEW_ONLY now draw POM 16 again — on
the correct row. That is the intended outcome: US-083 made the failure visible,
US-084 removes the failure.

## Blast Radius — Wider Than Apex

Apex feeds more than POM 16, and the re-baseline showed it: `strap-top` and POM
14 (`findFrontStrapStartFromInk` anchors on the apex join), and `172`/`182` →
POM 17/18. On `demo7.png` POM 18's control points moved by up to 0.34.

Those ripples are net **improvements**, not regressions — that is exactly what
the accuracy gate establishes, since it scores every labelled anchor including
`strap-top`, `171`/`172`, `181`/`182`, and reports no anchor-kind regression.
Anyone touching apex detection should expect this ripple and re-check `accuracy`,
not just `golden`.

## Known Gaps

- **`demo amorafit.png` is unverified.** It has no ground-truth labels, so the
  0.024 `apex-left` move (and its 0.023 ripple into `inner-cup-top`/POM 9/POM 10)
  rests on the repair's own logic rather than measurement. It is plausible — the
  repair keeps the more confident side and moves the outlier DOWN onto the cup,
  which is the direction of the failure it targets, and a symmetric pair matches
  what ground truth shows on `demo1`/`demo3` — but it is not proven. Labelling
  that fixture would close this.
- **`demo1.jpg` is improved, not fixed.** Both apex anchors still sit ~0.0245
  above the TD row. That is a different failure from the asymmetry this story
  addresses: the whole pair is too high, not one side. Worth its own pass.

## Harness Delta

None. `npm run accuracy`'s per-anchor-kind table was the right tool for this and
needed no changes.
