# Exec Plan — US-013 POM 7 seam tier decouples the cupModel

## Goal

Let POM 7 (cradle height at bottom cup) accept weaker-but-real seam evidence
(sparse dashed vertical guides) WITHOUT that acceptance being able to move
POM 9/10 inner-cup geometry through the shared `cupModel`. Unblocks the
"dashed guide" tier that was prototyped and reverted on 2026-07-09 because it
broke invariant B3 on real demos.

## Scope

In scope:

- A `cradleCupTier` provenance field on the detected bottom-cup seam:
  `strong` / `seam` (today's two acceptance paths) vs `guide` (new relaxed
  dashed tier).
- `buildCupModel` consumes the seam only when the tier is NOT `guide` —
  guide-tier detections leave the cupModel exactly on its current ink-arc /
  cradle-row fallback path.
- Guide-tier candidates considered ONLY when today's acceptance finds no
  candidate at all (strictly additive; zero behavior change on images that
  detect today).
- Guide-seeded `cradle-cup-top/bottom` anchors: confidence `low`,
  `source: seamGuide`, `reviewRequired: true` (mirrors the accepted POM 6
  `seamProjected` pattern).
- Contract rule `C7.seam-source` extended: `seamGuide` accepted only when the
  anchor is flagged for review (mirrors `C6.seam-source`).
- `pom7-limitations` sparse-dashed case flips from `knownLimitation` to
  expected-DRAWABLE.

Out of scope:

- Making demo4/demo5/demo7 actually detect their curved wire seams (their
  reject is "no candidate", not the dash gap — that is future detector work,
  now measurable via the accuracy corpus).
- Any rule-JSON (pom-template / anchor-schema) change. Learning changes.

## Risk Classification

Risk flags:

- Existing behavior (POM 7/9/10 detection paths are live and test-covered).
- Weak proof (accuracy corpus is 1 day old, draft-labeled).
- Multi-domain blast radius via the shared cupModel (the reason this is a
  story, not a patch).

Hard gates: none (no auth/data/external/validation-weakening). High-risk lane
chosen because the 2026-07-09 revert proved the blast radius is real.

## Work Phases

1. Discovery — DONE: coupling confirmed at `src/auto-detection.js`
   `buildCupModel` (seam wins over ink-arc when side matches); demo4/5/7
   fail POM 7 with `cradleCupTopPresent:false` while their cupModel is
   already `visibility:direct` via the ink-arc fallback.
2. Design — this folder's `design.md`.
3. Validation planning — `validation.md`.
4. Implementation — detector tier + cupModel gate + QA provenance + contract
   rule + limitation-suite flip.
5. Verification — build/check, detection-limitations, invariants (B3),
   contract, golden (re-baseline ONLY for images that newly draft POM 7,
   after visual inspection), accuracy, smoke.
6. Harness update — ADR 0021; memory updated.

## Stop Conditions

Pause for human confirmation if:

- Invariant B3 fails with the cupModel gate in place (would mean a second,
  unknown coupling path — do not chase it silently).
- Golden drift appears on any anchor OTHER than cradle-cup-top/bottom or
  POM 7 rows (the change must be additive).
- The guide tier fires on a majority of demos (would mean the floor is too
  permissive and we are drawing noise).
