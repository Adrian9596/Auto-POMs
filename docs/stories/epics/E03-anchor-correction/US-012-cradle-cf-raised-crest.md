# US-012 Place Cradle CF on the Raised Center-Front Crest

## Status

implemented

## Lane

normal

_Intake (2026-07-11): TD image correction to existing POM 6/POM 8 anchor
placement. Harness CLI remains absent; this story records the durable intent._

## Product Contract

The real measurement workflow defines `cradle-cf-top` as the point where the
cradle/cup-bottom seam meets or approaches the center-front axis. On a style
with a raised center-front cradle edge, the anchor belongs on that upper black
crest—not on a denser horizontal lace row below it.

## Relevant Product Docs

- `MEASUREMENT_REAL_WORKFLOW_AND_IMPLEMENT.md` §5–6
- `DETECTION_AND_MEASUREMENT_CONTRACT.md` (`cradle-cf-top`)
- `POMS_CONTRACT.md` (POM 6 and POM 8)

## Acceptance Criteria

- `demo/1.jpg` and `demo/2. fail example POM 9 and 10.png` seed
  `cradle-cf-top` in normalized y range `0.62–0.66`, on the same raised black
  cradle edge (previously about `0.85` / `0.90`).
- The anchor remains on the CF axis and continues to drive both POM 6 start and
  POM 8 end.
- The raised-edge override requires a traced contour with a symmetric crest;
  unrelated neckline details and flat lower rows do not qualify.
- Existing placket-junction and no-seam behavior remains contract-safe.

## Design Notes

- `src/auto/anchors/seed-anchors.js` examines traced contours in a bounded band
  above the global cradle-row prior.
- A candidate must sit near CF and the same contour must descend on both sides.
- Among qualifying bound/stitch edges, the upper edge wins.

## Validation

| Layer | Expected proof |
| --- | --- |
| Focused contract | `npm run contract -- --only=1.jpg` |
| Detection limits | `npm run pom6-limitations`, `npm run pipeline-tests` |
| Corpus regression | `npm run golden`, `npm run invariants` |
| Real detector | `npm run demo` |

## Harness Delta

- Added a TD-approved fixture range in `scripts/groundtruth/expectations.json`
  so a future golden refresh cannot silently restore the lower wrong row.

## Evidence

- Focused contract: `demo/1.jpg` places `cradle-cf-top` at `y=0.6367` and
  passes the TD range guard; `demo/2. fail example POM 9 and 10.png` passes the
  same raised-cradle range.
- `npm run check`: pass.
- `npm run contract`: 1034/1034 assertions pass.
- `npm run invariants`: 209/209 assertions pass.
- `npm run pom6-limitations`: all four hard diagnostic cases pass.
- `npm run pipeline-tests`: pass.
- `npm run golden`: all 19 fixtures pass after refreshing only the two
  intentional raised-cradle baselines.
- Detection demo: 19/19 images captured; POM 6 remains drawable/medium on both
  corrected raised-cradle fixtures.
