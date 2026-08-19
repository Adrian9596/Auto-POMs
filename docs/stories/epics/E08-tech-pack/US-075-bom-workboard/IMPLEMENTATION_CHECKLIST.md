# BOM Working Board — Implementation Checklist

Status: implemented and browser-verified on 2026-08-16  
Source of truth: `Tech pack Output/TechPack output.html`  
Decision: [`docs/decisions/0043-bom-owned-material-key-images.md`](../../../../../decisions/0043-bom-owned-material-key-images.md)

## Reference decisions applied

- [x] Use the in-cell suggestion dropdown; remove the persistent side panel.
- [x] Use reference labels `＋ Dòng FABRIC` and `＋ Dòng TRIM`.
- [x] Keep one material thumbnail per BOM row (`row.photo`), matching the
  inspected HTML data model.
- [x] Give BOM its own Material Key images; do not read Board images.
- [x] Keep Solid and Lace image collections independent.
- [x] Allow multiple images/panels within each variant.
- [x] Expose only `BOM Solid` and `BOM Lace`; remove the Table/Material Key
  sub-view controls.
- [x] Keep Material Key permanently visible above the table in one continuous
  editable variant sheet.
- [x] Print each variant's Material Key above its BOM table on the same sheet.
- [ ] Define no-Lace style behavior in a separate TD decision; the accepted
  reference does not define it.

## Persistence and migration

- [x] Add BOM schema version 2 and normalized image metadata.
- [x] Keep bitmap bytes outside ordinary BOM history snapshots.
- [x] Serialize bitmap bytes only when saving/autosaving a project.
- [x] Recognize edited rows, callouts, images, photos, and colorway overrides
  as meaningful BOM-only work.
- [x] Save, autosave, reload, and restore a project with BOM work and an empty
  measurement Board.
- [x] Migrate referenced legacy Board images into the owning BOM variant.
- [x] Add an explicit autosave-quota fallback that reports stripped bitmaps.

## Table and Material Key UI

- [x] Use the full 1600 px-class working width with fixed column sizing.
- [x] Make `MATERIAL IMAGES` the widest content column.
- [x] Keep every row action visible without horizontal scrolling at 1600 px.
- [x] Add the `Bill of Materials Sheet` title band.
- [x] Add multi-file upload, image paste, and canvas drag/drop.
- [x] Preserve text paste in editable fields and make repeated image paste add.
- [x] Support image selection, move, delete, zoom, fit, and undo/redo.
- [x] Keep callouts attached by `imageId` and image-local normalized points.
- [x] Clear cross-variant image selection when switching Solid/Lace.
- [x] Keep BOM images isolated from anchors, POMs, drafts, and detection.

## Print

- [x] Render two self-contained factory sheets: Solid and Lace.
- [x] On each sheet render requirement band, Material Key, BOM title band,
  then the filtered BOM table.
- [x] Render the variant's images, callout leaders, dots, labels, and row links.
- [x] Exclude editor controls from printed output.

## Verification evidence

- [x] `npm run build`
- [x] `npm run check`
- [x] `npm run bom-check` — 100/100 assertions after US-077 callout-tool contract.
- [x] `npm run autosave-check`
- [x] `npm run smoke` — 18 drafts and 18 applied.
- [x] `npm run golden` — 13 demos, maximum drift 0.
- [x] `npm run contract` — 753/753 passed, 66 skipped.
- [x] `npm run invariants` — 135/135 passed, 34 skipped.
- [x] `npm run mainpage-check` — 31/31.
- [x] `npm run construction-check` — 49/49.
- [x] `npm run export-xlsx`
- [x] Direct browser QA at 1600 × 1000: no horizontal table overflow;
  233 px Material Images column; upload two mixed-aspect images; place a
  callout; no browser console errors.
- [x] Direct browser QA of the combined sheet: only `BOM Solid` / `BOM Lace`
  controls are present; both variants keep Material Key visible immediately
  above the table in the same sheet; browser console remains clean.
- [x] Direct browser QA of Select / Add Callouts / Add Leaders: batch row
  advancement, persistent multi-leader placement, Escape to Select, label
  drag, variant reset, and clean console.

## Deliberate follow-up

- [ ] TD decision for a style with no Lace variant.
- [ ] Native-resolution standalone Material Key export, if still required by
  US-056. The factory print path implemented here is complete.
