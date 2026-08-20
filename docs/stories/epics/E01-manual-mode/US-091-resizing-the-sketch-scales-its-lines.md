# US-091 Resizing the sketch scales its lines and holds every value

## Status

implemented

## Lane

normal

## Product Contract

Resizing a sketch photo on the board is a **layout** act, not a re-measurement:

- The POM lines drawn on that photo scale with it, so they stay on the garment.
- Every measured value is exactly what it was before the resize.

## Relevant Product Docs

- [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md) — the class of defect this was found under.
- [US-089](US-089-sketch-carries-its-drafts.md) — the same shape for *moving* a sketch.

## Measured Problem

Anchors are stored normalized to their image (`image.x + anchor.x * image.width`)
so they scale for free. Annotations are absolute world coordinates and nothing
touched them: `resizeImageFromCorner` (`src/render/hit-testing.js:156`) mutates
only `image.x/y/width/height`.

Measured on `demo/demo1.jpg` with 18 lines applied, dragging the SE corner
handle outward:

| | Before |
| --- | --- |
| Photo | scaled ×1.2354 |
| Lines that followed | **0 / 18** |

The lines detach from the garment they annotate, at every zoom, permanently.

## The decision this needed

Scaling the lines is the easy half. On its own it silently restates every
measurement, because a value is `lineLength × unitsPerPx` and the line just got
longer — turning a *visible* defect (lines obviously detached) into an
*invisible* one (lines look right, numbers quietly changed by the scale factor).
That is strictly worse, so this was taken back to the TD rather than guessed.

The TD chose: **lines scale, measured values stay the same.**

`state.calibration.unitsPerPx` cannot express that. It is global, while a resize
is per-image, so dividing it by the scale factor would silently restate the
values of lines on *other* photos. Instead each scaled line carries the factor:

- `scaleAnnotationsForImageResize` (`src/manual/viewport.js`) scales the line's
  start / end / curve controls / label about the resize anchor and multiplies
  `ann.measureScale` by the factor.
- `lineLength` (`src/manual/annotation-lookup.js:73`) divides it back out.

Kept on the **annotation**, not the image: the line↔image association is
positional and can change, while the factor belongs to the line for good. All
six callers of `lineLength` are measurements — the spec panel, the tolerance
check, the Set Scale dialog, the grading model, and the on-canvas label — and
none of the drawing or hit-testing paths go through it, so one place covers it
consistently. Set Scale therefore also calibrates in the same normalized px.

`annotationsWithinBounds` was split out of `getAnnotationsOnImage` so the resize
can ask which lines belonged to the photo **as it was before** the rect changed;
asking afterwards would test the new bounds and lose any line a shrink pushed
outside.

## Acceptance Criteria

- Resizing a photo scales every POM line on it, about the same corner the photo
  scales about.
- No measured value changes, at any scale factor, for any line.
- Group resize (2+ selected photos) behaves identically, about the group anchor.
- Moving a photo is unaffected — `measureScale` stays 1.
- Anchors, erase strokes and Auto-mode drafts keep their existing behaviour.

## Design Notes

- Commands: none. Queries: `annotationsWithinBounds` split out of
  `getAnnotationsOnImage`. API: none. Domain rules: unchanged.
- UI surfaces: `src/manual/viewport.js`, `src/render/hit-testing.js`,
  `src/manual/pointer-events.js` (group resize), `src/manual/annotation-lookup.js`.
- `ann.measureScale` rides along in the existing generic annotation clone, so
  history, autosave and project save/load carry it with no schema work.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` |
| Integration | `npm run board-interaction-check` section 7b |
| E2E | `npm run smoke`, `npm run golden`, `npm run accuracy` — unchanged |
| Release | The before/after measurements below |

## Evidence

After, same gesture:

| | After |
| --- | --- |
| Photo | scaled ×1.2354 |
| Lines that followed | **18 / 18** |
| `measureScale` recorded per line | 1.2354, exactly the photo's factor |
| Worst measured-value drift | **0 %** |
| Control — *moving* the photo | 18/18 follow, `measureScale` stays 1, drift 0 % |

Section 7b asserts the corner press actually opened `drag-image-resize` and that
the photo actually scaled, so it cannot pass vacuously — the first draft of it
did exactly that, opening a marquee because the selecting press had been claimed
by a line. It now picks the press point furthest from every line. Run against
the previous bundle to confirm it fails there rather than merely passing here:

```text
FAIL the photo scaled x1.2538 but only 0/18 lines followed it
```

73 assertions, up from 68.
