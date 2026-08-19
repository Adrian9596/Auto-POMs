# 0047 MAIN PAGE carries version sketches, a split style breakdown, and Block Reference

Date: 2026-08-17

## Status

Accepted

## Context

ADR 0037 ported the MAIN PAGE sheet onto this tool's primitives and declared
sketch images on the sheet an explicit non-goal — the `.mp-sketchrow` slots
were left in the markup so they could drop in later without a relayout. The
field roster was carried over "verbatim minus Block Reference", which the
source module strips at runtime, and `Style No Breakdown` was carried as one
free-text value.

FD supplied the factory-facing MAIN PAGE layout the tool is meant to produce.
Against it, three gaps are real:

1. Each version panel shows two technical flats (front and back). The tool
   shows a placeholder.
2. `Style No Breakdown` is not one value — it is three labelled sub-cells:
   `style prefix`, `category #`, `range no`.
3. `Block Reference - 原版品` is a row on the sheet, not a stripped one.

## Decision

1. **Version sketches are TD-supplied, not derived.** Each version panel owns
   two slots — FRONT and BACK — filled by upload or paste, exactly like a BOM
   material photo. The tool never auto-adopts a Board photo or a Construction
   image: what prints on the factory-facing MAIN PAGE is the TD's choice, and
   Board sketches carry POM lines. This reverses ADR 0037's non-goal; the
   slots it reserved are what get filled.
2. **Sketch bytes live outside `state.mainPage`.** `mpSketchDataById` holds
   the base64 by image id, the state row holds `{ id, aspect }` only — the
   same split BOM board images use, because history snapshots clone
   `state.mainPage` on every keystroke-group and four full-resolution flats
   would be cloned 120 deep. Every import mints a NEW id, so undo across a
   replaced slot still finds its bytes in the map.
3. **`Style No Breakdown` is three parts.** `field.parts = { prefix,
   category, rangeNo }` is authoritative; `field.value` is kept in sync as the
   composite `prefix · category · rangeNo` so every consumer that reads a
   field value (preview, workbook, any later reader) keeps working. The range
   name picker binds to `prefix` only — ADR 0037's warning about composite
   strings corrupting the style name stands.
4. **`Block Reference - 原版品` is a normal field row**, appended by
   `ensureMainPage()` when missing, so projects saved before this change gain
   it on open. It has no suggestion roster.
5. **One sheet body, three surfaces.** The page, the Preview & Export A4
   sheet, and the MAIN PAGE worksheet all read the same
   `state.mainPage`; the sheet and the preview share the sketch markup
   builder. The worksheet lays the same content out linearly (fields, then
   COLORWAYS, then LACE VERSION and SOLID VERSION sketch blocks with
   reserved rows) because a worksheet has no side-by-side panel — ADR 0046's
   "preview is content, not Excel pixels" rule applies in both directions.

## Alternatives Considered

1. **Auto-fill sketches from Board or Construction images.** Rejected by FD:
   Board photos carry POM lines and Construction images are annotated; the
   MAIN PAGE flat is a clean drawing the TD picks.
2. **Keep the breakdown one free-text cell and split only on export.** Every
   consumer would need the same fragile parser, and the sub-cell headers the
   factory reads would be invented at export time.
3. **Store sketch data URLs directly in `state.mainPage`** (the BOM row-photo
   pattern). Fine for a thumbnail, not for four full flats × 120 history
   entries.
