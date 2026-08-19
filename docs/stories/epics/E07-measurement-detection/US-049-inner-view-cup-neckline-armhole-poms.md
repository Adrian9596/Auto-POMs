# US-049 Measure POM 9/10/17/18 on the front-inner view when present

## Status

implemented

## Lane

high-risk

## Product Contract

TD: "nếu hình ảnh có front inner thì hãy đưa các anchors của POM 8 9 10 17 18 về
phía inner view." Resolved (Decision 1 A): when a front-inner view is present,
POM **9, 10, 17, 18** are measured on it (anchors + lines on the inner photo);
**POM 8 stays on front-outer** (its anchors are shared with POM 5 & 6). Amends
[ADR 0011](../../../decisions/0011-cup-poms-measured-on-front-outer-view.md) via
[ADR 0034](../../../decisions/0034-cup-neckline-armhole-poms-measure-on-front-inner-when-present.md).
With no front-inner view, behaviour is unchanged.

## Relevant Product Docs

- ADR 0011 (cup on front-outer), ADR 0034 (this amendment)
- US-045 (front-inner auxiliary view recognition)

## Acceptance Criteria

- Front-inner aux view present ⇒ POM 9/10/17/18 drafts carry the inner photo's
  `sourceImageId`; their anchors (inner-cup-*, 171/172/181/182) display on the
  inner photo.
- POM 8 and all other POMs keep their front-outer geometry + source image.
- No front-inner view ⇒ byte-identical to before (front-outer for all).
- Only dedicated anchor kinds move; POM 5/6 (which share cf-top/cradle-cf-top
  with POM 8) are unaffected.

## Design Notes

- `buildAuxViews` (`src/auto-detection.js`): the front-inner aux view persists a
  trimmed detection (no ink mask) + a full anchor set seeded on that photo.
- `runOfflineDetection`: relocates the 8 dedicated moved-anchor kinds onto the
  inner photo in `state.autoMode.anchors` (display + interaction).
- `generatePOMDraftsFromAnchors` (`src/auto/drafts/generate-pom-fixture.js`):
  front pass filters anchors to the source image (no-op without an inner view);
  a second pass builds a fixture against the inner detection/anchors (swapping
  the active detection) and replaces the POM 9/10/17/18 drafts, converting them
  with the inner image.
- Anchors already carry per-anchor `sourceImageId` (`anchorWorldPos`).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | build + check pass |
| Integration | golden / contract / invariants / smoke unchanged except the pre-existing EvelynBliss demo (no-inner path byte-identical) |
| E2E | Browser: front+back source + separate inner photo → POM 9/10/17/18 drafts on inner image, POM 8 + rest on source |
| Platform | n/a |
| Release | n/a |

## Harness Delta

Decision 0034 recorded (amends 0011).

## Evidence

- `npm run check` pass; `smoke` clean; `invariants` 132/132; golden/contract
  green on every demo except EvelynBliss (pre-existing, unrelated — see US-047).
- Browser (localhost:4173) via `runAutoOnDataUrl` (demo5 inner + demo1 source):
  drafts by POM → 9,10,17,18 = inner image id 1; 8,11 = source id 49; moved
  anchor kinds all report inner image id 1. Screenshot confirms POM 9/10/17/18
  on the left (inner) photo, POM 8 + others on the middle (front-outer) photo.

## Known follow-up

Dragging a *moved* anchor pin in Auto Mode (pre-Generate) still reposes against
the single detection image; the applied line drags correctly in Manual Mode.
