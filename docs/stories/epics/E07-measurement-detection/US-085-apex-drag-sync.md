# US-085 POM 16 Follows a Dragged Apex Anchor

## Status

implemented

## Lane

normal

Change request against accepted behaviour. Risk flags: existing behaviour
(the anchor-drag → draft-sync path), weak proof (no suite exercised a
simulated drag at all, for any POM). Two flags, no hard gate — normal lane
with stronger validation.

## Relevant Product Docs

- [ADR 0049](../../../decisions/0049-horizontal-span-poms-share-one-row.md) —
  same "anchors right, line wrong" symptom class, different trigger.
- [US-084](US-084-apex-pair-row-repair.md) — the apex slant gate and
  `APEX_MAX_SLANT` / `APEX_SLANT_LIMIT` constants this reuses.

## Product Contract

While the TD drags `apex-left` or `apex-right` to correct a mis-detected
anchor, POM 16's line follows live: it redraws at the pair's midpoint and its
`drawability` flips between `DRAWABLE` and `REVIEW_ONLY` as the correction
makes the pair more or less credible, using the same 0.06 slant gate as
initial generation.

## Root Cause

`moveAnchorBy` calls `syncBandChestDraftsFromAnchors(anchor.kind)` on every
anchor move so drafts stay tied to anchors during a drag — but that function
only recognized `band-left/right` and `chest-left/right`. Every other POM's
draft, including POM 16, is drawn once at Generate time and never revisited,
so dragging any other anchor moves the pin but leaves the line stale at the
pre-drag position. Anchors render correctly (resolved live from normalized
position every frame); draft lines don't (world coordinates baked once) —
the exact asymmetry ADR 0049 describes, here triggered by a manual TD
correction instead of a seeding-fallback branch.

Reported as: "anchors đúng nhưng lines không đúng vị trí" on a sketch the
user described as itself mis-detected — i.e. the workflow was detect → drag
an anchor to fix it → the line didn't follow.

## Reproduction

No demo fixture reaches this path un-aided (detection lands the apex pair
correctly on all of them once US-084 landed). Reproduced by simulating a real
TD drag against the live app via CDP — `mousedown`/`mousemove` dispatched on
`#boardCanvas` (mousemove listens on the canvas, not `window` — the opposite
of `mouseup`, which is on `window`; get this backwards and the drag silently
no-ops), `mouseup` on `window` — then reading `getAnchors()` /
`getDrafts()`:

| | before drag | after dragging apex-left +15 world px |
| --- | --- | --- |
| `apex-left` anchor | `(128.7, -26.0)` | `(144.3, -10.5)` (anchor moved ✓) |
| POM 16 draft `start` | `(128.7, -26.0)` | **`(128.7, -26.0)` — unchanged** |

The anchor moved; the line didn't.

## Change

`src/auto/drafts/generate-pom-fixture.js`, `syncBandChestDraftsFromAnchors`:

- `apex-left`/`apex-right` added to the `relevant` gate.
- A dedicated apex block, not the plain `updateLine` helper: `updateLine`
  deliberately never touches an already-`REVIEW_ONLY` draft (band/chest never
  need to *become* drawable mid-drag), but un-REVIEW-ONLY-ing POM 16 is
  exactly the point of a TD dragging apex to fix it. The block recomputes the
  same midpoint-`y` line and slant gate `buildPOMFixtureFromAnchors` uses at
  Generate time, toggling `drawability`/`confidence`/`uncertainty` live.
- `APEX_MAX_SLANT = 0.06` duplicated here (function-scoped, not reachable
  from the generation function's own copy) — now three copies across two
  files (`generate-pom-fixture.js` ×2, `src/auto-detection.js` ×1). Only the
  contract `E4` invariant guards these from drifting apart; it was not
  extended to a third copy for this change (see Known Gaps).

## Validation

- `npm run build && npm run check`: pass (cache-buster `916026c7bf82`).
- `npm run golden`: PASS, byte-identical on all 13 fixtures — expected, since
  no fixture's detection ever reaches this path; only a live drag does.
- `npm run contract`: PASS 883/883 (unchanged — no assertion exercises a
  simulated drag yet).
- `npm run invariants`: PASS 187/187 (unchanged, same reason).
- Manual live reproduction (above) re-run after the fix, same sketch, same
  drag: POM 16 draft `start`/`end` now match the dragged anchor's midpoint
  line, and `drawability` recomputes from the live slant.

## Known Gaps

- **No automated suite simulates an anchor drag**, for POM 16 or for the
  pre-existing POM 1/2/3/4 sync this pattern was copied from. `golden` /
  `contract` / `invariants` only exercise Generate-time output; the drag-sync
  path has been unverified by CI since it was introduced for band/chest, and
  stays that way for POM 16 now. Recommended follow-up: extend
  `invariant-tests.mjs`'s CDP harness with a drag simulation (`mousedown`on
  `#boardCanvas`, `mousemove` on `#boardCanvas`, `mouseup` on `window`) and
  assert the affected draft's geometry against the post-drag anchor.
- **Scoped to POM 16 only**, by explicit choice. The other 13 POMs with no
  live-sync (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18) still draw stale
  lines after a TD drags their anchors post-Generate — the general form of
  this bug remains. Fixing it for all of them was considered and deferred to
  a separate pass: it means either re-running full generation logic per-POM
  on every drag tick (risk: could reset unrelated `tdApproved`/`tdEdited`
  draft state if not done carefully) or writing N more per-POM incremental
  formulas by hand. Whichever POM's anchor a TD drags next after Generate,
  expect the same "anchor right, line stale" symptom until that pass lands.

## Harness Delta

None.
