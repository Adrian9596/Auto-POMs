# US-033 Spec panel rebuild scaling

## Status

implemented

## Lane

normal

## Product Contract

The Measurements panel stays responsive as the row count grows (custom POMs
17+). `renderSpecPanel()` no longer rebuilds every row on every
`updateUI()` — it skips the rebuild when none of the data the table renders
from has changed, updating only the selection highlight (the common case:
plain clicks / selection moves). Any real data change — geometry, POM
labels, drafts and their badges, Size L / TOL specs, custom POMs,
calibration, hidden rows, detection summary, anchor review flags, mode —
still triggers a full rebuild with pixel-identical output. No visible
behaviour change at any row count; only the wasted rebuilds go away.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 5)

## Acceptance Criteria

- Selecting lines back and forth does not rebuild the table (fast path:
  highlight classes only); measured latency per click drops accordingly at
  high row counts.
- Every data change listed above still refreshes the panel: value cells
  after a nudge/drag commit, draft Approve/R-O badges, hide toggles,
  spec-field edits, custom POM add/remove, scale changes, mode switches.
- The editing-field focus guard behaves exactly as before.
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- `specPanelFingerprint()` in `src/ui/spec-panel.js` — JSON of the table's
  actual data inputs: annotation geometry/labels (rounded), draft fields
  used by draft rows (approval/edit flags, drawability, confidence, reason,
  uncertainty, reviewNotes), `pomSpecs`, `customPoms`, calibration, hidden
  id lists, image count, anchors' review-flag count, and the detection
  object's identity (WeakMap id — detection is replaced wholesale per run,
  never mutated for summary fields).
- `renderSpecPanel()` compares against the fingerprint stored after the
  last full rebuild; on match it runs `updateSpecHighlightOnly()` and
  returns. Selection is deliberately NOT in the fingerprint. The stored
  fingerprint updates only at the end of a successful full rebuild, so the
  focus-guard early-return can never mark a skipped rebuild as done.
- Risk note: a future panel feature that renders from state outside the
  fingerprint must add its input to `specPanelFingerprint()` — documented
  in a comment at the function.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass: fast-path skip measured (DOM identity + latency at 16 and ~70 rows), correctness probes for each data-change class |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15. Smoke covers the Auto-Mode draft rows / approve / apply
  flow through the new fingerprint path.
- Browser pass on demo1 + 54 loaded custom POMs (72 tbody rows):
  - Fast path: selection clicks average **0.21 ms** (row DOM node identity
    survives clicks — no rebuild); a forced data change (hide toggle)
    averages **12.65 ms** — the cost every click used to pay. ~59×.
  - Correctness probes each broke node identity (rebuilt) exactly when
    they should: hide/unhide toggle (with `pom-hidden` class applied),
    Size L change-event edit (value preserved after rebuild); arrow-nudge
    kept the live value cell updating; selection highlight moves correctly
    on the skip path.
