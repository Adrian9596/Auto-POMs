# Design

## Domain Model

- BOM row: shared material record filtered into Solid/Lace by scope.
- Material Key image: variant-owned visual panel, separate from Board images
  and from a row's material thumbnail.
- Material callout: link from one BOM row to one Material Key image using
  normalized image-local target and label coordinates.

## Application Flow

1. Select Solid or Lace and open Material Key.
2. Add one or more local images by file, paste, or drop.
3. Arrange images or run Fit Images.
4. Arm a BOM row and place its callout on one image.
5. Save/autosave serializes image metadata plus bitmap bytes.
6. Print renders Material Key followed by the filtered table per variant.

## Interface Contract

No network or API contract is added. Local project JSON gains
`state.bom.images.solid[]` and `state.bom.images.lace[]`; each saved image
contains `dataURL`, while runtime/history metadata omits it.

## Data Model

```text
state.bom = {
  schemaVersion: 2,
  rows: [...],
  images: {
    solid: [{ id, x, y, width, height, locked }],
    lace:  [{ id, x, y, width, height, locked }]
  },
  callouts: [{ id, rowId, imageId, variant, targets, textPos }]
}
```

Legacy Board-linked callouts are migrated by copying only the referenced Board
image into the corresponding BOM variant. Bitmap bytes are reused in memory;
the Board and BOM metadata remain independent after migration.

## UI / Platform Impact

Browser-only, fully offline. The table uses the full BOM width. Material Key
has image controls and accepts direct paste/drop. Print remains A3 landscape
and hides editor controls.

## Observability

No analytics are added. Browser tests inspect persisted shape, image ownership,
callout linkage, print DOM, autosave fallback, and detection invariants.

## Alternatives Considered

1. Shared Board images: rejected by ADR 0043.
2. Third Material Key print sheet: rejected by ADR 0043.
3. Base64 inside every history snapshot: rejected due quota and latency risk.
