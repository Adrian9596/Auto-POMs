# US-032 Toast queueing

## Status

implemented

## Lane

normal

## Product Contract

Event toasts are no longer lost when they collide. When a toast arrives
while the current one has been visible for less than a fair reading window
(~0.9 s), it queues (bounded to 3, oldest dropped, exact duplicates skipped)
and shows as the queue drains, instead of silently overwriting. A repeat of
the currently shown message just extends it.

Status-style toasts — live state that changes rapidly under keyboard use
(Tab part-cycling, eraser brush size) — are the deliberate exception: they
show immediately and clear the queue, because "latest wins" is the truth for
a status readout, and replaying stale part names after a Tab burst would be
worse than the old overwriting.

Existing `showToast(message, durationMs)` callers keep working unchanged.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 7)

## Acceptance Criteria

- Two distinct toasts fired back-to-back: the first is readable, the second
  appears afterwards (early-advance ~0.9 s when something is waiting; full
  duration otherwise).
- Rapid Tab cycling shows only the latest part name, immediately, and no
  stale names replay after the burst; same for brush-size taps.
- Queue is bounded (3) and skips messages already queued; a repeat of the
  visible message extends rather than queues.
- Numeric-duration call sites (e.g. 4200 ms error toasts) behave as before.
- `npm run check` and `npm run smoke` stay green.

## Design Notes

- UI surfaces: `src/ui/toast.js` — queue, early-advance timer, and a
  `{ replace: true }` option; second positional arg still accepts a number
  (duration) for the existing call sites. `state.toastTimer` remains the
  hide timer. Callers updated to `replace`: `cycleNudgePart` and the
  eraser brush-size handler in `src/manual/interactions.js`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check` |
| E2E | `npm run smoke`; browser pass: collision queues and drains, Tab spam shows latest-only with no replay, duplicate extension |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke` (failures: [])
  — 2026-07-15.
- Browser pass on demo1:
  - Collision: pressing L twice back-to-back showed "Locked all 1 image."
    immediately (not overwritten — the pre-US-032 behaviour) and the queued
    "Unlocked all 1 image." appeared as the queue drained.
  - Tab spam: three rapid Tab presses on a straight line showed the third
    stop ("Arrows move the whole line.") immediately, and polling for
    ~2.4 s afterwards captured zero replayed part names.
  - Duplicate-extend and the 3-entry cap are code-path only (logic
    inspected; no UI flow emits identical rapid toasts deterministically).
