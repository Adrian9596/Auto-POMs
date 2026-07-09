# 0010 Hidden POM lines are excluded from the Excel export

Date: 2026-07-09

## Status

Accepted

## Context

The Measurements panel has a per-POM `×` review toggle (`state.hiddenAnnIds` /
`state.hiddenDraftIds`), documented in `POMS_CONTRACT.md` as a way to isolate one
POM line on the board while spot-checking detection evidence. It was purely
visual: the Excel export (`src/render/export-xlsx.js`) walked the fixed 16-POM
template and wrote every POM regardless of visibility, so a POM the TD had hidden
still appeared — with measurements — in the exported spec.

A TD reported this as illogical: a line they had hidden should not show up in the
deliverable. This is also the one place that strains ADR 0009's principle "what
the panel shows is what exports" — a hidden row is still listed (greyed) in the
panel but is the row the TD has explicitly chosen not to see.

## Decision

A POM whose line is hidden via the `×` toggle is **omitted from the Excel export
entirely** — its whole row, not just its measurement cells.

- Filtering keys off `state.hiddenAnnIds` via `isAnnHidden(ann.id)`, matched to a
  POM by its label (`getLabelText`). Localized to `buildSpecWorkbookXlsx` in
  `src/render/export-xlsx.js`; no rule-JSON or contract change.
- **Paired POMs drop together.** POMs 1/2 and 3/4 share one drawn line, so hiding
  it removes both halves (partner resolved from `POM_TEMPLATE[key].pairing`).
- Remaining rows renumber contiguously and the embedded sketch is anchored below
  the last visible row, so the sheet has no gaps.
- The row is removed, not blanked (the TD's explicit expectation); blanking is
  what a *deleted* POM already produces.

## Alternatives Considered

1. Leave the export complete; treat `×` as board-only. Rejected: contradicts the
   TD's expectation and leaves "hidden" with no effect on the deliverable.
2. Blank the hidden POM's measurement cells but keep its row. Rejected: the TD
   wanted the row gone; a half-present row is more confusing than either extreme.
3. Persist visibility so the exclusion survives save/reopen. Deferred (see
   Consequences) — kept session-only to match the existing overlay semantics and
   keep the change localized to the exporter.

## Consequences

- **Session-only.** Visibility is not persisted (`hiddenAnnIds` resets on load,
  by design), so the export reflects the current review session: hide → save →
  reopen → export restores the row. A permanent per-style exclusion (persist the
  hidden set, or a dedicated "exclude from spec" flag distinct from the review
  overlay) is a possible follow-up.
- **Empty-spec edge.** Hiding all POMs yields a header-only sheet; no guard is
  added. A "nothing to export — all POMs hidden" warning is a possible follow-up.
- Refines ADR 0009's "panel = export": still true for visible rows; a hidden
  (greyed) row is the deliberate exception.
- Covered by `npm run export-hidden` (Chrome-free Node-VM suite). `export-xlsx`
  is unaffected — its fixture hides nothing, so all 16 rows still assert.

## Follow-Up

- **Image side completed (2026-07-09).** This decision originally excluded a
  hidden POM only from the spec *table*; the exported *sketch image* still drew
  the hidden line, because the three export render paths (Excel embedded PNG,
  Copy Image, PDF) use draw loops separate from the live canvas and lacked the
  `isAnnHidden` guard. A TD flagged that the measurement line should be removed
  from the sketch too. Fixed by a shared `visibleExportAnnotations()` helper
  (`src/render/export-pdf.js`) — `state.annotations` minus `isAnnHidden` — used
  by both export draw loops (`export-pdf.js`, `copy-image.js:renderBoardRegionToCanvas`,
  which also backs the Excel PNG) and by `getContentBounds()` so a hidden line
  no longer pads the crop. `getExportAnnIds()` debug hook + new assertions in
  `scripts/export-hidden-tests.mjs` cover it. Now a hidden POM is absent from
  the table AND the sketch drawing, consistent with the live canvas.
