# 0046 Preview & Export tab exports one multi-sheet tech-pack workbook

Date: 2026-08-16

## Status

Accepted

## Context

The tool grew into four tech-pack pages (Board, MAIN PAGE, Construction, BOM),
but every export path (Excel spec, PDF, Copy Image) serves only the Board. A
TD assembling a factory hand-off has no way to review the whole tech pack in
one place or ship it as one file. FD confirmed the target deliverable is a
single Excel workbook, previewed page-by-page before export.

## Decision

Add a fifth tab, "Preview & Export", registered in `TECH_PACK_PAGES`:

1. **Preview** — A4 sheets stacked vertically in fixed order: MAIN PAGE
   (portrait), CONSTRUCTION SOLID (landscape), CONSTRUCTION LACE (landscape),
   BOM-SOLID (portrait), BOM-LACE (portrait), POM / How to Measure
   (landscape). Orientation is per-page by content shape.
2. **Hybrid sheet formats** — MAIN PAGE, BOM-SOLID, BOM-LACE, and POM export
   as real-cell worksheets (factory can copy article numbers, sizes,
   formulas); CONSTRUCTION SOLID/LACE export as embedded page images because
   their value is the sketch-plus-callout layout.
3. **BOM splits into two sheets** — BOM-SOLID holds scope SOLID + BOTH rows,
   BOM-LACE holds scope LACE + BOTH rows. BOTH rows are duplicated
   deliberately to match the factory-facing per-variant BOM format.
4. **Preview fidelity is content, not Excel pixels** — cell-based sheets
   preview as paper-styled DOM of the same data; no simulated Excel grid.
5. **One shared render path** — each Construction preview canvas is produced
   by the same function whose output is embedded in the workbook; the POM
   worksheet is produced by the existing Board spec builder (one builder, two
   entry points). Preview and export can never disagree.
6. **Parallel export buttons** — the Board "Export Excel" button and its
   single-sheet file stay unchanged; the new tab has its own "Export Tech
   Pack (.xlsx)" button that writes only the enabled sheets.
7. **Page inclusion persists** — `state.preview.enabledPages` is saved in the
   project snapshot (a solid-only style stays lace-free across sessions);
   missing field defaults to all pages enabled. `state.activePage` remains
   session-only.

The workbook remains a hand-built STORE zip; no new vendored libraries.

## Alternatives Considered

1. Export hub without preview — same rasterizer cost, blind exports.
2. Preview-only tab keeping scattered export buttons — two code paths that
   drift; the tech pack still cannot ship as one file.
3. Browser-print PDF (`window.print`) — cheap but output depends on the print
   dialog, cannot produce the Excel deliverable, untestable headless.
4. All-image workbook — preview matches perfectly but the factory cannot copy
   or search any data.
5. One BOM sheet with a scope column — mirrors the app model but diverges from
   the per-variant BOM format factories consume.
6. Replacing the Board export button — cleaner single path, but FD chose to
   keep the familiar one-sheet spec flow intact; drift risk is mitigated by
   sharing the POM builder.

## Consequences

Positive:

- The whole tech pack is reviewable in one scroll and ships as one file.
- Shared render/builder functions keep preview, workbook, and the legacy
  export consistent by construction.
- Scope-filtered BOM sheets match how factories read solid vs lace styles.

Tradeoffs:

- The hand-built xlsx writer must grow multi-sheet + multi-drawing support
  (workbook.xml, per-sheet rels/drawings) — the largest piece of the work.
- BOTH-scope BOM rows are intentionally duplicated across two sheets.
- Two export buttons coexist; the shared POM builder is the guard against
  format drift.

## Follow-Up

- New `preview-check` suite; extend export validation to read every sheet via
  openpyxl and verify BOM scope filtering.
- Screenshot review of each preview sheet (US-068 lesson: assertions can pass
  while the page looks wrong).
