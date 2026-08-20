# US-090 Construction / BOM image drags stop corrupting the project

## Status

implemented

## Lane

normal

## Product Contract

On the Construction working board and the BOM Material Key:

- Dragging an image either moves it visibly, or does nothing at all. It never
  changes stored coordinates without changing what is painted.
- A panel holding two or more images can be arranged; the image under the cursor
  is the one that moves.

## Relevant Product Docs

- [ADR 0051](../../../decisions/0051-the-board-holds-still-when-the-chrome-moves.md) — the class of defect this was found under.
- [ADR 0045](../../../decisions/0045-construction-sheets-own-working-views-and-rows.md) — the Construction working sheets.
- [ADR 0041](../../../decisions/0041-bom-annotation-and-table.md) — BOM forks Construction's engine on purpose.

## Measured Problem

`ccBuildPanelLayout` and BOM's `bmCanvasView` are **fit-to-bounds** transforms
derived from the union bbox of the panel's images, and both were rebuilt from
the live bbox on **every draw**. So moving an image moved the very bounds the
transform is derived from.

Measured on the Construction page with one image in the OUTER panel, dragging
200 screen px right — the painted result read off the canvas pixels, not off
state:

| | Before |
| --- | --- |
| Stored `image.x` | **+128.21 world units** |
| Painted ink centroid | 359.2 → 359.2 — **did not move at all** |

`pushHistoryIfChanged` then wrote that invisible offset into history and into
the saved project, and it accumulates on every further drag. With two images the
bbox grows instead of translating, so the *other* image shifts and the whole
panel rescales mid-gesture.

Both sites were found independently by two audit lenses and survived adversarial
refutation at high confidence; the Construction measurement above is a direct
pixel read.

## Acceptance Criteria

- A single-image panel records **no** state change from a drag (it cannot move:
  the fit re-centres it whatever its coordinates).
- A two-image panel moves only the dragged image, visibly, during the gesture.
- The panel re-frames once on release.
- Callout anchor / label drags, which do not touch image bounds, are unchanged.
- `construction-check` and `bom-check` stay green.

## Design Notes

- Commands: none. Queries: none. API: none. Data: no schema change.
- UI surfaces: `src/ui/construction-canvas.js`, `src/ui/bom-canvas.js`,
  `src/ui/bom-state.js`, plus a shared `observeCanvasBox` in
  `src/ui/construction.js` used by `src/ui/bom.js`.

Two changes per page:

1. **The fit basis is frozen for the duration of an image drag**
   (`ccFrozenBounds` / `bmFrozenBounds`). The gesture becomes a plain
   translation in a stable space; the panel re-fits once on release.
2. **A lone image is selectable but not draggable.** With fit-to-bounds there is
   no arrangement to make, so the only thing a drag could achieve is the
   invisible mutation above.

Also generalised ADR 0051's ResizeObserver to both canvases (`observeCanvasBox`).
Both already re-derive their buffer *and* their whole transform from the live
rect on every draw, so neither can hold a stale buffer — but nothing redrew them
when the box changed without a redraw being requested. This is defence in depth
rather than a demonstrated fix: see "Not proven" below.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` |
| Integration | `npm run construction-check` (55), `npm run bom-check` (100), `npm run preview-check` (58) |
| Release | The pixel-level before/after measurements below |

## Evidence

| Case | Before | After |
| --- | --- | --- |
| One image, drag 200px | state **+128.21**, painted **0** | state **0**, painted 0 |
| Two images, drag 160px | other image shifts, panel rescales 1.214 → 0.795 | only the dragged image changes (`[150.87, 0]`); ink centroid moves 359.5 → **398.5** mid-drag, panel re-frames on release |

`construction-check` 55/55, `bom-check` 100/100, `preview-check` 58/58.

## Not Proven

The audit also reported, at high confidence, that a BOM tool switch rewraps the
toolbar hint and shrinks the Material Key canvas ~19px with no redraw, landing
callouts a few percent from the click. **It did not reproduce here**: measured at
1280 / 1000 / 860 px window widths, the canvas box stayed 1116×461 and the buffer
matched it exactly in all three tool states. The canvas has a fixed width inside a
scrolling sheet, so a toolbar wrap changes page height, not the canvas box.

The `observeCanvasBox` addition is kept because it is the same general mechanism
ADR 0051 established and costs nothing — but it is not evidence that finding was
real. Two related reports (the print stylesheet squashing the working board, and
a table row's scrollbar leaving `ccPanelLayouts` stale) are also unverified;
neither was measured, and a `ResizeObserver` may not run before a print capture.
