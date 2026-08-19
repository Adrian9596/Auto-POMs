# 0041 BOM: editable table + material-key annotation, ported and scoped down

Date: 2026-08-16

## Status

Accepted

Amended by US-074 (2026-08-16,
[`docs/stories/epics/E08-tech-pack/US-074-bom-reference-seed/story.md`](../stories/epics/E08-tech-pack/US-074-bom-reference-seed/story.md)):
a project's *first-ever* BOM no longer materializes empty — `ensureBom()`
seeds the reference sheet's exact 12-row BOM, one-shot, guarded by
`bom.seedId`. Everything else in this record stands.

## Context

The TD's request in full (Vietnamese): *"chuyển BOM annotation và Bom
table"* — port the BOM (Bill of Materials) annotation and BOM table from the
tech pack's reference output into this tool, the same way MAIN PAGE ([ADR
0037](0037-main-page-sheet-port.md)) and Construction ([ADR
0039](0039-construction-annotation-page.md), [ADR
0040](0040-construction-lace-solid-leader-lines.md)) were already forked from
sibling reference projects. Per the standing instruction to proceed without
stopping for clarifying questions, scope was decided from reading the
reference implementation directly rather than asked about, exactly as ADR
0040 did for Construction's Lace/Solid split.

Reading `Tech pack Output/TechPack output.html`'s `mod-bom` module (read-only
recon; nothing in `Tech pack Output/` was edited) surfaced a materially
bigger feature than Construction — 1,436 lines vs. Construction's ~800 —
spanning three genuinely different concerns bundled under one name:

1. **The editable table** — one shared `D.bom.rows` array (each row carrying
   a `scope`: `BOTH`/`SOLID`/`LACE`), rendered twice against two
   scope-filtered views (Solid sheet, Lace sheet), split into FABRIC/TRIM
   section bands, plus one column per colorway (`D.colorways`, owned by
   `mod-main`) and a per-row reference photo thumbnail.
2. **The "material key"** — a genuinely separate canvas/SVG annotation
   surface (`D.matkey`), one per variant, where numbered labels connect via
   an auto-routed leader line (edge-to-dot, arrowhead) to a point on a pasted
   reference photo — the code's own hint text literally calls a fresh batch
   of these "N annotation BOM" (`autoDraftMatkey`), confirming "annotation"
   in the TD's request means specifically this canvas layer, distinct from
   the table.
3. **A per-row reference photo** (`r.photo`) — an unrelated third concept (a
   picture of the swatch itself, resolved from a 4.2MB image catalog or
   uploaded), not to be confused with the material-key annotation above.

The reference also wires in an AI translation call (`translateBom()` →
`Pack.ai.translate()`, gated behind the same API-key infrastructure that
project's own `CLAUDE.md` flags as off-limits) and a `BOM_DRAFT` auto-seed
mechanism that generates rows from Construction features. Both are
out of reach for this tool by existing invariant (`AGENTS.md`: "no network
call carries sketch/measurement data — offline by design") and by precedent
(ADR 0040: "none of which this tool has or needs," referring to exactly this
BOM module's AI/asset-management infrastructure).

## Decision

Port the table and the material-key annotation; drop everything that needs a
network call or an asset-management subsystem this tool doesn't have.

- **New source parts**: `src/ui/bom-material-data.js` (a static 27-material
  suggestion library, ported verbatim from the reference's `#bom-lib` data
  island — real material names, area-of-use options, supplier/article
  examples, mined from 1,748 historical BOM records) and `src/ui/bom.js` (the
  module: `ensureBom()`/`renderBom()`/`initBom()`, mirroring
  `construction.js`'s three-function shape).
- **Row model**: `state.bom.rows[]`, each
  `{ id, section:'FABRIC'|'TRIM', scope:'BOTH'|'SOLID'|'LACE', cells:{description, composition, supplier, article, width, size, areaOfUse}, cwOverride:{} }`.
  One shared array, scope-filtered per variant at render time — the reference
  tool's own data model already keeps Solid/Lace as one row list with a scope
  enum, not two parallel schemas, so this needed no simplification of its
  own; it was the smaller half of the module by design.
- **Table rendering**: `#bomPage` gets its own Solid/Lace toggle tabs (same
  convention as Construction's `[data-cc-variant]`, ADR 0040), each showing
  the shared row list filtered by scope, split into FABRIC/TRIM section
  bands with an always-visible per-section "+ Add row" button (ported
  verbatim as a correctness detail — the reference module's own comment
  flags hiding an empty section's add-button as a prior bug). Columns: `#`
  (computed row number, live, never stored — same non-goal as Construction's
  `seq`), the 7 `cells` fields, then one column per
  `state.mainPage.colorways` entry (`bw-*` reads `col`/`value`), then a
  per-row scope `<select>` + delete button.
- **Colorway columns finally consume `state.mainPage.colorways`.** ADR 0037
  named this "knowingly inert — this tool has no BOM" when MAIN PAGE landed;
  this story is that BOM. A colorway column defaults to showing that
  colorway's name and accepts a per-row-per-column override
  (`row.cwOverride['COL n']`), matching the reference's `cwCell()` exactly
  (plain editable text, not a swatch/checkmark).
- **Material-key annotation reuses the shared board images**, not a new
  paste/upload image model — the same choice ADR 0040 made for Construction
  variants, for the same reason: this tool has one shared image board, and
  building a second image-attachment mechanism (the reference's `panels`
  array of pasted/uploaded photos) would be a materially larger,
  architecturally mismatched change nothing in the request asked for. A
  callout is `{ id, rowId, imageId, variant, targets:[{nx,ny}, ...], textPos:{nx,ny} }`
  — deliberately reusing Construction's exact multi-anchor/edge-leader-
  line/arrowhead/double-click-delete engine (`ccLabelBox`/`ccEdgeToward`/
  `ccDrawArrowHead`-equivalent functions, forked not shared, per this
  codebase's "duplicate over premature abstraction" convention — there is no
  existing shared leader-line module to extract into). Label text is derived
  live from the linked row's current number + description (`N. {description}`),
  never stored, matching how the reference computes BOM row numbers.
- **Suggestion picker is a side-panel searchable list**, mirroring
  Construction's phrase quick-list (ADR 0039) — not the reference's per-cell
  floating `SuggMenu` popover. Picking a material fills the selected row's
  `description` and pre-fills `areaOfUse`/`supplier`/`article`/`width`/`size`
  **only into cells the TD has not yet typed into** (never overwrites), same
  "suggestion, never a wall" contract as Construction's phrase list.

## Alternatives Considered

1. **Port the reference's per-variant pasted-image material key
   (`D.matkey.variants.SOLID/LACE.panels`)** verbatim. Rejected for the same
   reason ADR 0040 rejected per-variant image sets for Construction: this
   tool has one shared image board, and duplicating a second, independent
   per-sheet image-attachment model is a much bigger change than "add BOM
   annotation and table" implies.
2. **Port the row reference-photo (`r.photo`) and its 4.2MB image-catalog
   matching subsystem.** Rejected: this is asset management (upload,
   catalog-matching by article/description/supplier), a category of
   infrastructure this tool has deliberately never built (ADR 0039/0040 both
   named "asset management" as something the reference has that this tool
   "has or needs" neither). Dropping it also removes ~350–400 of
   `mod-bom`'s 1,436 lines.
3. **Port `translateBom()`/bilingual `cells_cn`.** Rejected outright:
   `translateBom()` calls an AI API gated behind key infrastructure this
   tool must never touch (per the reference project's own `CLAUDE.md`, and
   per this tool's own offline-by-design invariant). No bilingual field
   exists anywhere else in this tool either, so adding one only for BOM
   would be an unrequested, isolated addition.
4. **Port `BOM_DRAFT`'s auto-generate-rows-from-Construction-notes.**
   Considered because it is the one piece of real cross-module intelligence
   in the reference (house-rule keyword matching against construction
   features). Deferred: it coupling two independently-scoped features
   together is a bigger design commitment than the TD's two-word request
   implies, and a TD can already add a BOM row by hand from the material
   quick-list in under the same number of clicks.
5. **Port the reference's floating per-cell `SuggMenu` popover** (search box
   pinned under the clicked column, `▾` triggers on 6 of 7 columns).
   Rejected in favor of the simpler side-panel list already established by
   Construction's phrase quick-list — same underlying goal (searchable,
   never-a-wall suggestions), reusable UI pattern, far less new code.

## Consequences

Positive:

- BOM finally exercises `state.mainPage.colorways` — a data model ADR 0037
  explicitly flagged as "knowingly inert" pending exactly this feature.
- The material-key annotation is visually and behaviorally consistent with
  Construction's leader lines (same edge-based geometry, same multi-anchor/
  double-click-delete convention) — a TD who has learned one annotation
  surface in this tool already knows the other.
- Suggestion data (27 materials, mined from 1,748 historical records) is
  real, not invented, matching the precedent set by Construction's 336-entry
  phrase port and MAIN PAGE's 47-entry Color Master List.
- Fully additive: `state.bom` is null until first use, seeded lazily by
  `ensureBom()`, persisted via `history.js`/`project-io.js` exactly like
  `mainPage`/`construction` — a project saved before this story opens with
  an empty BOM, not an error.

Tradeoffs:

- No per-row reference photo, no bilingual cells, no AI translation, no
  auto-draft-from-Construction, no split-row (size-run row pairing), no
  floating per-cell picker, no orphan-callout QA warning — a future reader
  comparing this to the reference tool's BOM feature will find it
  meaningfully smaller by design, not an incomplete port.
- Material-key callouts point at the shared board images, not a
  purpose-pasted material photo — a TD who wants to annotate a swatch photo
  that isn't already on the board has to add it as a regular board image
  first, same limitation Construction already accepted for its own leader
  lines.
- `bom-material-data.js`'s 27 materials are a fixed snapshot of the
  reference's mined library at port time — it will not grow as this tool's
  own project corpus grows, unlike `fieldExtra`-style remembering elsewhere
  in this tool (MAIN PAGE); a TD's off-list description is still always
  accepted, just never learned back into the suggestion list.

## Follow-Up

- If the TD asks for row reference photos, the smallest slice is a plain
  per-row image-paste button reusing this tool's existing image-import path,
  not the reference's catalog-matching machinery.
- If the TD asks for BOM rows to auto-generate from Construction notes, the
  data model needs no change — `BOM_DRAFT`'s house-rule keyword logic can
  read `state.construction.notes` and call the same `addRow()` this story
  already exposes.
- `bom-material-data.js` can be regenerated from a fresher reference library
  export the same way `generate-suggestions` regenerates the Tier-0 library
  values, if the 27-material snapshot goes stale.
