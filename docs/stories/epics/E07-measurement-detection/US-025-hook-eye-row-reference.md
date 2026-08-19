# US-025 Hook-and-Eye Row Reference

## Status

implemented

## Lane

normal

## Product Contract

Use a confidently detected three-row back hook-and-eye closure to propose POM
12 at 3.00 inches, while keeping independent library proposals visible for TD
review when sketch-scale evidence is absent.

## Relevant Product Docs

- `POMS_CONTRACT.md`
- `test/TEST.md`
- `docs/decisions/0030-hook-eye-row-reference.md`

## Acceptance Criteria

- OpenCV evidence preserves a discrete back H&E row count.
- Exactly three rows plus back H&E construction produces POM 12 = 3.00 inches.
- The proposal identifies the row rule and matching library peers.
- The reference can calibrate only the back view.
- Synthetic peers never promote the result to Auto.
- Eligible library priors remain visible as Review without pixel scale,
  including POM 15 and POM 16 fallbacks.
- Unknown construction still abstains from cohort selection while available
  general-library medians remain visible as low-confidence Review baselines.
- Deterministic and browser checks cover the visible behavior.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Regular row grouping and exact three-row mapping. |
| Integration | POM 12 rule, back-only scale, and library fallback outcomes. |
| E2E | Demo page shows numeric Review proposals instead of an empty table. |
| Platform | Offline resource boundary remains intact. |

## Evidence

- `npm run construction-measurement-test` passes 38/38 deterministic checks.
- `npm run construction-measurement-browser-test` passes against the real
  offline page and local OpenCV runtime.
- The first pass shows 14 General Library Baselines; the OpenCV upgrade on
  `demo3.jpg` detects three rows, selects `back_hook_and_eye`, produces 16
  numeric proposals, and sets POM 12 to 3.00 inches with three matching peers.
- The browser audit also covers all three bundled sketches: `demo1` has zero
  H&E rows, `demo3` has three, and `demo5` has four with no direct mapping.
- `npm run check` passes.
