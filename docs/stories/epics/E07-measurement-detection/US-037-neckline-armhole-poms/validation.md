# Validation

## Proof Strategy

Two things must both hold: **(a)** the 16 existing POMs are provably
unchanged (no regression from extending the contract), and **(b)** POMs
17/18 draft, place, grade, and export correctly and deterministically. The
contract-count change means several suites move from asserting 16 to 18 —
each such change must be intentional, not a silenced failure.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | `parseSpecNumber`/fixture builders unaffected; `nextCustomPomNumber()` returns 19 as the first custom number. |
| Integration | `npm run check` + `contract` green with 18 rows / ids 1..18; `load-rules` accepts 18, still rejects 19+ and duplicates; `anchor-schema` has the 4 new kinds, no dupes. |
| E2E | `npm run smoke` reports 18 drafts (was 16); draft→approve→apply→Manual edit works for 17 and 18; `npm run export-xlsx` emits 18 rows and stays green; `export-hidden` drops 17/18 when hidden. |
| Determinism | `npm run golden` stays 12/12 at tol — the new seeds/detectors must be deterministic (same sketch → same 17/18 lines). This is the key regression guard for the existing POMs too. |
| Invariants | `npm run invariants` green — new anchors normalized `[0,1]`, each POM on exactly one view, 17/18 don't perturb the cupModel-coupled invariants (B3 etc.). |
| Accuracy | `npm run accuracy` unchanged for 1–16 (no baseline regression); 17/18 scored only if GT is added, else reported as unscored (documented, not a silent gap). |
| Suggestions / prep | `suggestions-tests`, `library-l0-tests`, `measurement-preparation-report` updated to 18 and green. |

## Fixtures

- The existing `demo/*.jpg` set (demo1 is the primary neckline/armhole
  exemplar from the screenshot that opened this thread).
- Deterministic anchor seeds via `buildPOMFixtureFromAnchors` in the
  headless suites (no Chrome needed for the contract/fixture layer).
- Ground truth for 17/18 in `scripts/groundtruth/*.json` is **optional for
  this story**; if omitted, record in evidence that 17/18 are unscored by
  the accuracy gate and why.

## Commands

```text
npm run build && npm run check
npm run contract
npm run golden
npm run smoke
npm run invariants
npm run export-xlsx && npm run export-hidden
npm run suggestions-tests
npm run accuracy            # 1-16 must not regress
```

## Acceptance Evidence

Implemented 2026-07-18. All green:

- `check` passed; `contract` 657/657; `invariants` 121/121; `golden` PASS
  (re-baselined — the existing 16 POMs were bit-identical, maxDrift 0.0000
  on all 11 images; only the two new lines + 4 anchors were added);
  `smoke` failures: [] with **draftCount 18**; `export-xlsx`,
  `export-hidden`, `suggestions-tests`, `library-l0-tests`,
  `library-intake-tests` PASS; `measurement-prep-check` verified.
- Browser pass on demo1 after Apply Lines: **18** anchors/lines. The 4 new
  anchors seed `front_outer`, review-flagged: `171`(0.124,0.167),
  `172`(0.380,0.165), `181`(0.380,0.165), `182`(0.395,0.326). Drafts:
  `gen-17` straight/DRAWABLE (neckline width), `gen-18` curved with control
  points/APPROXIMATE (armhole curve length). Screenshot shows POM 17 as a
  horizontal line across the top neckline and POM 18 as a bowed curve at the
  right strap/armhole; board reads "18 lines".
- Anchor naming: numeric POM-indexed scheme `171/172` (POM 17),
  `181/182` (POM 18) per TD request.
