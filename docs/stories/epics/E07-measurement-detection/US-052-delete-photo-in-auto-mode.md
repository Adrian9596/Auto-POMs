# US-052 Allow deleting an added photo in Auto Mode

## Status

implemented

## Lane

normal

## Product Contract

TD: "i cannot delete the photo I added." The tool boots into Auto Mode and
photos are added there, but Delete (button + key) was disabled in Auto Mode, so
a photo could only be removed by Reset Board (which clears everything). Deleting
a selected **photo** must work in Auto Mode; annotations/drafts stay gated to
the Auto workflow (Discard Drafts / Review-Only).

## Root cause

- `src/manual/interactions.js`: the Delete/Backspace handler `return`ed early
  whenever `state.appMode === 'auto'`.
- `src/manual-tools.js` (`updateAutoModeUI`): `el.deleteBtn.disabled = true`
  unconditionally in Auto Mode.

Both were meant to protect Auto DRAFTS from Delete, but over-blocked images too.

## Fix

- Keyboard: `if (appMode === 'auto' && selection.kind !== 'image') return;` —
  Delete works for an image selection in Auto, still blocked for annotations/drafts.
- Button: in Auto Mode, `deleteBtn.disabled = !(selectedImage && !locked)`.
- `deleteSelected` (`src/manual/annotations.js`): when an image is removed, purge
  Auto state tied to it — anchors + drafts with that `sourceImageId`, the aux
  view for it, and the whole `detection` if it was the detection source — then
  re-derive the status chip (`ensureAutoModeStatus`). No orphans.

## Acceptance Criteria

- Auto Mode: select a photo → Delete button enabled → deletes just that photo.
- Deleting an aux (front-inner) photo drops its aux view + its moved POM anchors.
- Deleting the detection source clears detection/anchors/drafts and resets status.
- Locked images still require Unlock first. Manual Mode delete unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | build + check pass |
| Integration | smoke clean, invariants 132/132, autosave PASS |
| E2E | Browser (Auto Mode): select added photo → deleteBtn enabled → delete → photo gone, its aux view + 8 moved anchors purged, source detection preserved |

## Evidence

- Browser: 2 photos (demo5 aux front_inner id 1 + demo1 source id 49) in Auto
  Mode; selecting photo 1 enabled Delete (was disabled); delete → images [49],
  auxViews 0, anchors 29→21 (image-1 anchors purged), detection source 49 kept.
