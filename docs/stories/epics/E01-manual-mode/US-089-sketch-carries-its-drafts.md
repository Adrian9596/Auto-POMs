# US-089 The sketch carries its draft lines in Auto Mode

## Status

implemented

## Lane

normal

## Product Contract

Dragging a sketch photo moves the POM lines that sit on it — in Auto Mode, where
the lines are still drafts under review, exactly as in Manual Mode, where they
have been applied.

## Relevant Product Docs

- `docs/decisions/0008-reenable-manual-mode.md` — Auto-first with a Manual handoff.
- US-052 — photos are draggable and deletable in Auto Mode.
- [US-086](US-086-first-press-line-editing.md) — photos are moved with select-then-drag.

## Measured Problem

Found while auditing for the class of defect [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md)
exposed: geometry captured against one thing and consumed against another.

`startImageDrag` (`src/manual/pointer-events.js:594`) collects the lines to carry
via `getAnnotationsOnImage`, which filtered `state.annotations` only. In Auto
Mode — before Apply Lines — `state.annotations` is still empty and the lines
under review live in `state.autoMode.draftAnnotations`, so
`interaction.groupedAnnotationIds` came out empty.

Measured on `demo/demo1.jpg`, dragging the photo body 200 screen px right from a
point 77.5 world units clear of every anchor pin and every draft:

| Mode | Photo | Lines that followed |
| --- | --- | --- |
| Auto (drafts) | +92.8 world units | **0 / 18** |
| Manual (applied) — control | +92.8 world units | 18 / 18, by exactly 92.8 |

The control is what makes the result trustworthy: the same gesture, the same
harness, the same photo — only the array the lines live in differs.

The photo and its anchor pins moved (anchors are normalized to the image, so
they travel for free), and the 18 drafts stayed on empty board. Apply Lines then
committed them at those stale coordinates: silently wrong measurements, no error.

## Acceptance Criteria

- Dragging a sketch in Auto Mode moves every draft that sits on it, by exactly
  the distance the photo moved.
- Manual Mode behaviour, group drag across a multi-image selection, and locked
  photos are unchanged.
- Nothing else consumes the widened result: `getAnnotationsOnImage` has one
  other reference, a comment in `src/manual/line-nudge.js:61`.

## Design Notes

- Commands: none. Queries: `getAnnotationsOnImage` widened. API: none.
- UI surfaces: `src/manual/viewport.js` only.

`getAnnotationById` already resolved both arrays (`src/manual/annotation-lookup.js:108-115`,
whose comment says so explicitly), so the drag handler needed no change — the
ids simply never reached it.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` |
| Integration | `npm run board-interaction-check` — the Auto-Mode draft-carry section |
| E2E | `npm run smoke`, `npm run golden`, `npm run accuracy` — unchanged |
| Release | The before/after table above |

The new suite section runs in the pre-Apply Auto window (the only place drafts
exist), asserts the press actually opened `drag-image` rather than grabbing an
anchor, asserts the photo actually moved, and drags back afterwards so the later
checks start from the board they expect. Run against the previous bundle to
confirm it fails there rather than merely passing here:

```text
FAIL the photo moved 93.51 world units but 18/18 drafts did not follow it
(deltas [0,0,0,0,0,0]...) — Apply would commit them at stale coordinates
```

68 assertions, up from 62.

## Harness Delta

None — `board-interaction-check` grew by 6 assertions.

## Evidence

After the fix, the same measurement: Auto 18/18 at 92.8, Manual 18/18 at 92.8 —
identical, which is the point.
