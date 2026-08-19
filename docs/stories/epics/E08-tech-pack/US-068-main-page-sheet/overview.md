# Overview

US-068 — Port the tech pack MAIN PAGE sheet into Bra Auto Measure

## Current Behavior

Bra Auto Measure is a measurement tool. It detects a bra sketch, drafts 18 POM
lines, and exports a single-sheet `Measurement Spec` workbook. It holds no style
metadata at all: brand, style number, size range, garment description, and the
people responsible (fashion designer, tech pack designer, technical designer)
exist nowhere in `state`, in the saved project, or in the export. A TD who has
finished measuring still has to retype every one of those fields into a separate
tech pack workbook.

Colorways likewise do not exist in this tool.

The MAIN PAGE those fields belong to lives in a **different project** —
`Tech pack Output/TechPack output.html` — which is a self-contained tech pack
engine built on its own `Pack.*` runtime (`Pack.data`, `Pack.registerModule`,
`Pack.esc`, `Pack.pushUndo`, `Pack.emit`, `Pack.asset`). Nothing of that runtime
exists here, so the sheet cannot be copied across; it has to be rebuilt on this
tool's own primitives.

## Target Behavior

The tool gains a MAIN PAGE sheet that reproduces the tech pack layout:

- A 13-row key/value field table with a shared floating picker offering
  suggestions mined from 52 historical tech packs, while still accepting free
  typing. Off-list values are remembered per project.
- Brand pinned to `Crossian` and Tech Pack Creation date pinned to the project
  date — both read-only, as in the source.
- A colorway table per version panel (Lace / Solid), backed by the 47-entry
  Color Master List with search and an "add off-list colour" escape hatch.
- The provenance note block and the DRAFT / NOT-FACTORY-APPROVED sheet header.
- Print layout matching the source sheet, with screen-only controls hidden.

The whole sheet round-trips through save/open and participates in undo/redo.

## Affected Users

- Technical Designer — fills the MAIN PAGE after measuring, in one tool.

## Affected Product Docs

- `POMS_CONTRACT.md` — unaffected; MAIN PAGE adds no POM.
- `ARCHITECTURE.md` — gains a new UI module and a new `state` branch.
- `docs/decisions/0037-main-page-sheet-port.md` — the porting decision.

## Non-Goals

- **Sketch images on the sheet.** Explicitly deferred by the TD for this story.
  `versionImages`, the ink-box auto-balance pass, and paste-to-slot are all out.
- **BOM colorway sync.** The source's colorway rows exist to drive the `COL`
  columns of a BOM sheet. This tool has no BOM (verified: zero matches for
  `bom` across `src/` and `index.html`), so colorways are captured and printed
  but sync nowhere. Recorded as a known-inert limb, not silently dropped.
- **Adding a Main Page sheet to the xlsx export.** The export stays one sheet.
- Construction / POM / measurement sheets from the tech pack.
- Porting the `Pack.*` runtime itself.
