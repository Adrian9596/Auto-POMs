# Overview

## Current Behavior

The BOM table already mirrors the reference row, scope, numbering, colorway,
photo, and callout contracts. Material Key callouts still depend on Board
images, a permanent material-list side panel reduces table width, BOM-only work
cannot be saved/autosaved, and print omits the Material Key.

## Target Behavior

Each Solid/Lace variant owns multiple BOM images. The TD can upload, paste, or
drop images, arrange them, place row-linked callouts, save/reopen and undo the
work, and print each Material Key above its matching BOM table. The editor has
only `BOM Solid` and `BOM Lace`; each is one continuous sheet with Material Key
always visible above the editable table.

## Affected Users

- Technical Designer creating and validating factory BOM sheets.
- Factory recipient reading the printed Material Key and BOM table.

## Affected Product Docs

- `docs/decisions/0041-bom-annotation-and-table.md`
- `docs/decisions/0043-bom-owned-material-key-images.md`
- `docs/GLOSSARY.md`

## Non-Goals

- AI translation, cloud calls, or a remote material catalog.
- More than one material thumbnail per BOM row.
- Using BOM images for measurement detection, anchors, or POM evidence.
- Deciding the no-Lace style rule.
