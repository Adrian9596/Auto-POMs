# 0043 BOM owns variant-specific Material Key images

Date: 2026-08-16

## Status

Accepted

## Context

ADR 0041 deliberately reused Board images for BOM callouts and printed only
the BOM tables. Direct inspection of the accepted reference
`Tech pack Output/TechPack output.html` shows a different product contract:
each BOM variant owns an independent, multi-image Material Key canvas, and
that canvas prints above the corresponding BOM table. The TD reviewed that
contract and instructed us to move the reference BOM into the current BOM.

The change affects persisted project data, undo/redo, autosave quota behavior,
image intake, variant ownership, and factory print output. BOM images must
remain metadata only and must never participate in sketch detection or POM
generation.

## Decision

- `state.bom.images` owns two independent collections: `solid` and `lace`.
- A BOM image has a stable id plus placement, size, and lock metadata. Bitmap
  bytes live in a dedicated runtime store so history snapshots do not clone
  base64 data on every BOM edit.
- A callout remains linked by `imageId` and image-local normalized coordinates.
- Row ownership, tool modes, and synchronized deletion/scope behavior are
  refined by ADR 0044.
- Material Key accepts multiple images through file upload, image paste, and
  drag/drop. Repeated paste adds images.
- The editor exposes only `BOM Solid` and `BOM Lace`. Each variant is one
  continuous sheet with its Material Key permanently attached above its BOM
  table; there are no separate Table/Material Key view controls.
- Each printed BOM variant is self-contained: Material Key first, BOM table
  second, on the same factory sheet.
- Existing BOM row photos remain singular (`row.photo`), matching the current
  HTML reference data model.
- The table uses in-cell suggestion popovers; the persistent side panel is
  removed so the factory-width table can use the full working area.
- The implementation remains fully offline. AI translation and cloud/catalog
  services from sibling systems are not introduced.

## Alternatives Considered

1. Continue sharing Board images. Rejected because an empty Board would still
   block BOM work and Solid/Lace could not own different material sketches.
2. Copy a Board image only when a callout is created. Rejected because it
   creates implicit duplicate assets and unclear update semantics.
3. Print Material Key as a third sheet. Rejected because the reference places
   each variant's Material Key above its own BOM table.

## Consequences

Positive:

- A TD can build a BOM with an empty measurement Board.
- Solid and Lace Material Keys cannot leak images or callouts into each other.
- Printed factory sheets carry their visual material legend and table together.
- Ordinary BOM edits keep history snapshots small.

Tradeoffs:

- Project loading now migrates the pre-0043 Board-linked callout shape.
- Autosave must account for a second image-byte store and explicitly report a
  bitmap-stripped fallback.
- No-Lace style behavior remains outside this slice because the selected
  reference contains both variants and does not define that transition.

## Follow-Up

- Verify the no-Lace product rule in a separate TD decision before hiding or
  removing the Lace tab.
