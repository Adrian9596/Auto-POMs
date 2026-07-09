# 0011 Cup POMs (9/10) are measured on the front (outer) view, not an inner cutaway

Date: 2026-07-09

## Status

Accepted

## Context

`DETECTION_AND_MEASUREMENT_CONTRACT.md` (2026-07-09, TD-authored) corrected the
cup-group logic: POM 9 (cup height) and POM 10 (cup width) are the cup **as drawn
on the front (outer) view**. A `front_inner` cutaway is a *bonus* a sketch may
include, never a precondition — most tech packs are front + back only.

The detector conflated two meanings of "direct". `buildCupModel`
(`src/auto-detection.js`) set `visibility = 'direct'` **only** when a `front_inner`
view was classified (which requires ≥3 eligible views). A normal front+back sketch
therefore always landed at `'inferred'`, which (a) capped inner-cup anchor
confidence at `medium` (`cupTier`, `seed-anchors.js`) and (b) routed POM 9/10 to
`APPROXIMATE`. So a clearly-drawn front cup was permanently down-graded for lacking
a cutaway that isn't part of a normal sketch — the "cup anchors stand without
logic" behaviour a TD reported. All 13 demo cups were mislabeled `inferred`.

This also directly reverses the narrower 2026-07-08 reasoning that added the
`cupTier` medium-cap ("never show a confident dot for a merely-inferred cup"). The
newer TD contract supersedes it: a front cup with a real apex + real cup-bottom is
a *direct* reading and must be trusted.

## Decision

Redefine `cupModel.visibility` by what structure the cup rests on, not by the
presence of a cutaway view:

- **`direct`** — a validated apex (`topFromApex`) **AND** a real cup-bottom
  (`bottomFromSeam || bottomFromInk`), **or** a `front_inner` cutaway view exists
  (the existing bonus path, preserved).
- **`inferred`** — endpoints are placeable but one is only extrapolated (a bare
  flat-cradle-row bottom, or no real apex).
- **`hidden`** — neither apex nor cup-bottom reference is reliable. Unchanged.

Consequences of the reclassification, by design:

- A directly-read front cup keeps its full score-based confidence (`cupTier`
  already lifts the `medium`-cap for `direct`; no tier-logic edit needed) and is
  not `reviewRequired` — the blunt `cupModelWeak` (`contour+seam < 0.5`) review
  term was removed so `direct ⇒ reviewRequired === false` is deterministic.
- POM 9/10 template `view` changed `front_inner → front_outer`; the four
  `inner-cup-*` anchor hints were reworded to front-cup language. Anchor **kinds**
  are unchanged (renaming would break saved projects and every test).
- The dormant contract test `C9.review-when-no-front-inner` (its guard used
  `== null` against a field that is `-1`, so it always skipped) was inverted and
  fixed to `C9.no-false-review-without-front-inner`.

This is **geometry-preserving**: the only visibility-keyed geometry is the
single-endpoint extrapolation, a no-op when both `apexY` and `seamY` are non-null —
guaranteed by the new `direct` condition. No anchor pixel moves.

## Alternatives Considered

1. **Keep `inferred` but decouple confidence from the penalty.** Rejected:
   invariant D3 (`inferred ⇒ APPROXIMATE`) and the drawability map are keyed on
   `visibility`; a DRAWABLE/high-confidence `inferred` cup breaks D3. Redefining
   the classification boundary keeps D1–D3 true by construction with no test edit.
2. **Rename the `inner-cup-*` anchor kinds** to drop the misnomer. Rejected:
   large blast radius on saved projects and tests for a cosmetic gain; the kinds
   stay, only hint text changed.

## Consequences

Positive:

- A front+back sketch measures the cup at full confidence — no false "review".
- Invariant D2 (`direct ⇒ DRAWABLE, medium/high`) is now exercised for the first
  time (previously no demo was ever `direct`).
- Anchor positions and measured values are unchanged: `golden` stays green with
  **maxDrift = 0.0000** and no re-baseline required for this change.

Tradeoffs:

- D3 (`inferred ⇒ APPROXIMATE`) is likely vacuous over the current demos (all 13
  now classify `direct`); it still passes and re-arms on any partial-evidence cup.
- Removing `cupModelWeak` trusts a `direct` cup even when its apex/seam scores are
  modest; bounded by `validateCupApexPair` (conf ≥ 0.32) and the POM 7 seam gates.
- `rule_version`/`template_version` bumps reset the opt-in learning buckets
  (shadow/resettable — acceptable).

## Follow-Up

- On a genuine `front_inner` cutaway sketch the POM-row `viewRole` is now
  `front_outer` while the anchor override still stamps `front_inner`; no test
  asserts row-vs-anchor equality, but neutralising that override to `front_outer`
  is a clean future tidy-up (no demo exercises it today).
- `harness-cli decision add` was skipped — the CLI binary is absent in this
  checkout (`scripts/bin/` empty); register the durable row when it returns.
