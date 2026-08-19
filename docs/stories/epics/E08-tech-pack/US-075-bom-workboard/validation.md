# Validation

## Proof Strategy

Use the existing real-browser BOM suite as the main proof. Add deterministic
fixtures for Board-empty BOM images, Solid/Lace isolation, repeated paste,
save/open, undo, legacy migration, BOM-only autosave, and print DOM. Finish
with a direct visual screenshot at a 1600 px viewport.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | schema normalization, meaningful BOM work, image metadata stripping |
| Integration | save/open and legacy Board-linked callout migration |
| E2E | upload/paste/drop, arrange/delete/undo, callout placement, print |
| Platform | Chrome headless plus direct browser screenshot |
| Performance | history snapshots omit BOM bitmap bytes |
| Logs/Audit | no console errors; no network image/data calls |

## Fixtures

- Two tiny PNG data URLs with different aspect ratios.
- Empty Board with independent Solid/Lace BOM images.
- Legacy project with one Board-linked BOM callout.

## Commands

```text
npm run build
npm run check
npm run bom-check
npm run autosave-check
npm run smoke
npm run golden
npm run contract
npm run invariants
```

## Acceptance Evidence

- `npm run build` and `npm run check`: pass.
- `npm run bom-check`: 87/87 assertions pass, including the two-control
  `BOM Solid`/`BOM Lace` contract, permanently attached Material Key above
  table, Board-empty intake,
  Solid/Lace isolation, repeated paste, save/open, delete/undo, and print DOM.
- `npm run autosave-check`: BOM-only bitmap snapshot restores with Board empty.
- `npm run golden`: 13 demos, maximum drift 0.
- `npm run contract`: 753/753 pass, 66 skipped.
- `npm run invariants`: 135/135 pass, 34 skipped.
- `npm run smoke`: 18 drafts and 18 applied.
- `npm run mainpage-check`: 31/31 pass.
- `npm run construction-check`: 49/49 pass.
- `npm run export-xlsx`: pass.
- Direct Chrome QA at 1600 × 1000 found no horizontal table overflow. The
  Material Images column measured 233 px and all header cells fit. Uploading
  two mixed-aspect images produced common-height panels; a row-linked callout
  rendered its leader, dot, and label; the console remained clean.
- A second direct Chrome QA after removing the sub-views confirmed both Solid
  and Lace render Material Key and table simultaneously in the same sheet,
  Material Key is first, and no Table/Material Key controls remain.

No-Lace behavior remains deliberately deferred because the accepted reference
contains both variants and does not define the transition.
