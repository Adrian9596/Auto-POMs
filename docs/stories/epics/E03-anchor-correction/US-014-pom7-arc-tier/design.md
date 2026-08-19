# Design — US-014 POM 7 arc tier

## Domain Model

Seam tier vocabulary (extends ADR 0021): `strong` | `seam` (trusted — feed
the cupModel and its side picker) | `guide` | `arc` (review-grade — feed
nothing downstream; drawn for the TD only).

## Application Flow

1. `findCupBottomFromInk` (auto-detection.js) additionally returns `bottomX`:
   the median x of the columns within 2 px of the arc's deepest point (the
   flat center of the wire dip). Sole prior consumer (cupModel bottom trace)
   ignores the new field — behavior unchanged.
2. Arc-tier commit, placed after the seam/guide winner block and before the
   cupModel stage: fires only when `cradleCupTop` is still null and
   `cradleY`/`bandY` exist. Sides tried `+1` then `-1` (right-cup preference
   matches the demo3 control and the GT labeling convention); each requires a
   validated apex and passes the same quality guards the cupModel uses
   (`support ≥ 0.30`, `bottomY > apexY + 0.08`, `bottomY ≥ cradleY − 0.05`)
   plus `bottomY < bandY − 0.01`. Commits top = (bottomX, bottomY),
   bottom = (bottomX, bandY), tier `arc`.
3. cupModel: `trustedSeamTier = tier ∈ {strong, seam}` gates BOTH the seam
   consumption and the side picker (`seamSide`) — an arc commit on the right
   cup cannot flip a cupModel that today defaults to the left cup.
4. POM 6 rescue `cradleCfFromCupSeam` (seed-anchors.js + landmark-qa.js,
   kept in lockstep): fires only from trusted tiers. A curved wire's
   bottom-cup y projected onto the CF axis would be confidently wrong on
   plunge gores (demo5: wire bottom 0.795 vs gore top GT 0.583).
5. QA: `seamArc` → SOURCE_CLASS `detected`, confidence `low` (forces
   reviewRequired), note explaining the provenance and the POM 9/10 isolation.

## Interface Contract

- `detection.cradleCupTier` gains value `'arc'`.
- `C7.seam-source`: `seam` OR (`seamGuide`|`seamArc`) + reviewRequired.
- Synthetic matrix asserts `<drawability>@<tier>` per case.

## Alternatives Considered

1. Reuse the cupModel's own bottomPoint for POM 7 — rejected: the cupModel
   picks its side by apex confidence (left on demo5/7); POM 7 GT convention
   is the right cup, and coupling POM 7's x to cupModel side re-entangles
   the two systems US-013 just separated.
2. Keep hard REVIEW_ONLY (offered to the user) — declined 2026-07-11.
