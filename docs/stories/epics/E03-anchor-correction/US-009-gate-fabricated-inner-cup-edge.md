# US-009 Gate the fabricated inner-cup edge on open-neckline styles

## Status

done (2026-07-10)

## Lane

normal — 2 risk flags (existing behavior, weak proof around the real-CV
backend which no suite covers).

## Product Contract

On front-closure / deep-V styles whose apex detector fires on the strap top
(demo4-class), the cup model's POM 10 width row crosses the OPEN neckline V.
Its inner endpoint then falls back to the fixed gore inset — a fabricated
point floating in blank background — and the TD sees an `IC R` anchor dot in
empty space (reported 2026-07-10 on demo4.jpg under the real OpenCV backend).

The cup model must not source the inner-cup anchors when its inner endpoint
has no garment under it. Instead the seed falls down the existing precedence
chain (`innerCupTopInk` → view ratios → delete/REVIEW_ONLY), which lands the
anchors on real structure (gore top, lower cup body, placket edge).

## Relevant Product Docs

- `DETECTION_AND_MEASUREMENT_CONTRACT.md` (Part 1, Cup group)
- `POMS_CONTRACT.md` (POM 9 / POM 10)

## Acceptance Criteria

- demo4.jpg (real CV): inner-cup anchors sit on structure — no anchor in the
  open neckline V. Verified: IC L (0.0665, 0.696) side seam, IC R (0.1835,
  0.696) placket edge, IC top/bottom on the gore column.
- demo2.jpg (freeCv): same gate fires (its baseline had the same defect —
  strap-top POM 9 top, width row through the V); new anchors sit on the gore
  and right→left cup body. Golden re-baselined deliberately.
- All other fixtures byte-identical (golden 0.0000 drift except demo2).
- Invariants A5/B1/B2 hold on the legacy fallback path (cup side honors
  `cupModel.side`; POM 9 column clamped into the POM 10 span).

## Design Notes

- Domain rules: "a weak landmark must never become a confident anchor"
  (Engine Workflow Phase 6). The support predicate lives in the detector
  (`buildCupModel`) as `cupModel.innerEdgeSupported`; the TRUST decision
  flows through `landmark-qa.js` `cupModelUsable` (authoritative gate),
  mirrored by `innerCupFromCupModel` in `seed-anchors.js`.
- Support test = "inside the garment": faint lace fills don't register in
  the dark mask, so ink-proximity can't discriminate. Every garment-interior
  point has the neckline/top edge line ABOVE it; a point in the open
  neckline V sees background all the way to the ink-bbox top. Implemented as
  an upward scan at the inner-edge column (±2 px).
- Legacy `innerCupTopInk` fallback fixes: cup side honors `cupModel.side`
  when a model exists (the gore-top ink x sits ≈ on the axis, so its own
  left/right tie-break is arbitrary and can contradict invariants B1/B2);
  shared POM 9 column clamped into the POM 10 span (invariant A5).
- Contract C9 updated: `visibility === 'direct'` with
  `innerEdgeSupported === false` is legitimately review-flagged; the strict
  "trusted cupModel path" branch no longer applies to that case.

## Validation

harness-cli binary absent in this checkout — durable row not recorded
(harness friction; see Harness Delta). Suite results below are the proof.

| Layer | Expected proof |
| --- | --- |
| Unit | n/a (no isolated unit harness; behavior covered by suites below) |
| Integration | golden 19/19 PASS (demo2 re-baselined), invariants 209/209, contract 1032/1032, pipeline, junction, meaning, evidence, learning all PASS |
| E2E | smoke PASS; browser preview on demo4 (real CV): `innerEdgeSupported:false`, anchors on structure, no console errors |
| Platform | n/a |
| Release | n/a |

## Harness Delta

- `scripts/pom-contract-tests.mjs` captures `cupModel.innerEdgeSupported`
  and C9 exempts the unsupported-inner-edge case from the strict
  direct-cup branch.
- Friction: `scripts/bin/harness-cli` still absent — story row and matrix
  query skipped per the documented fallback (`docs/TEST_MATRIX.md`).

## Evidence

- Repro + fix verified headlessly via a clone of the invariant-tests CDP
  harness on both backends (freeCv + real OpenCV), and in the running
  browser preview (`__braAutoModeDebug.runAutoOnDataUrl` on demo4).
- Before (real CV, demo4): `inner-cup-right` (0.180, 0.337) — floating in
  the neckline V, 0.009 left of the CF axis at strap-mid height.
- After: `inner-cup-right` (0.1835, 0.696) — placket edge at the lower cup.
