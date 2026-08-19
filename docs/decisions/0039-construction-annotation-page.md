# 0039 Construction annotation is a third tech-pack page, rebuilt not linked

Date: 2026-08-15

## Status

Accepted

## Context

The TD's request in full: *"Ok vậy giờ thêm construction annotation vào thành
tab thứ 3"* — add construction annotation as the 3rd tab. This is the exact
extension [ADR 0038](0038-page-navigation-model.md) paid for up front:
`TECH_PACK_PAGES` was made a registry, not a hardcoded Board/MAIN PAGE pair,
specifically so BOM/Construction would be additive.

The source of the content is a separate sibling project, "Bra construction"
(`../Bra construction/construction.html`), a ~10,300-line single-file canvas
tool: numbered callout notes with leader lines, backed by tiered phrase
libraries, a draggable quick-term panel, PPTX import, and hand-rolled PDF/PPTX
export. Two questions were resolved with the TD before this ADR:

- **Source relationship:** rebuild on this tool's own primitives (chosen) vs.
  literally link/embed the other project. Rebuild won — same "fork not link"
  precedent as [ADR 0037](0037-main-page-sheet-port.md) for MAIN PAGE. The two
  projects share no runtime (`Bra construction` has its own globals/closures,
  this tool has its own `state`/render loop); there is no shared module to
  link to.
- **Read access for planning:** the TD explicitly authorized reading
  `Bra construction`'s docs and source to understand its structure, with the
  standing exception that `.env` or any credential/secret file in that project
  is never to be read, regardless of this permission.

Auditing the sibling project (`docs/PROJECT_MAP.md`, `CODE_MAP.md`,
`APP_KNOWLEDGE_MAP.md`, `DEAD_CODE_AUDIT.md`, and targeted reads of
`construction.html`) surfaced a scope-defining fact: the phrase data is not one
dataset but four tiers of increasing size —
`TERM_LIBRARY` (103 entries, a quick-term panel), `STARTER_CONSTRUCTION_PHRASES`
(16 hand-curated), `GENERATED_PDF_CONSTRUCTION_PHRASES` **inlined** in
`construction.html` (217 entries, confirmed by direct line-range/count —
an earlier pass in this effort miscounted this array at 58 by grepping the
wrong line range; the array actually spans source lines 2100–4989), and a
wholly **separate external file** `construction-phrases-v2.js` (loaded as
`window.CONSTRUCTION_EXTERNAL_PHRASES`) carrying a confirmed 2,894-entry PDF
harvest. The first three total 336 entries and are self-contained inside the
one file already read; the fourth is a distinct, much larger artifact. That
split is what makes a bounded phase 1 possible without either under- or
over-committing.

## Decision

Add `construction` as a third page in `TECH_PACK_PAGES`
(`src/ui/page-nav.js`), alongside `board` and `mainpage`, exactly as ADR 0038
anticipated: one registry entry, one content element
(`#constructionPage`, `.page-hidden` + explicit `grid-row:3` like `.mp-page`).

Phase 1 scope, rebuilt against this tool's own primitives in a new
`src/ui/construction.js` (module shape mirrors `main-page.js`:
`ensureConstruction()`/`renderConstruction()`/`initConstruction()`):

- **Numbered callout notes with leader lines**, placed on the Board's existing
  shared sketch images — not a separate upload. A note is
  `{id, seq, imageId, target:{nx,ny}, textPos:{nx,ny}, note, color, showArrow}`.
  `target`/`textPos` are normalized `[0,1]` **within the owning image's own
  x/y/width/height rect** (mirrors the board's per-image world-space
  convention, deliberately distinct from the anchor `[0,1]`-of-whole-image
  convention, since a Construction note is scoped to one image among possibly
  several on the board).
- Rendering reuses the source project's leader-line model: the line is **not
  stored**, it's recomputed every frame from `target` and `textPos`, drawn on
  a dedicated `#constructionCanvas` (read-only fit-to-container; no pan/zoom of
  its own — it mirrors the Board's current image layout each render).
- Create / select / drag (both the pin and the label) / delete a note.
  Deleting, dragging, and creating are undoable through the **existing shared
  history stack** (`history.js`) — no separate undo system, same pattern as
  every other project-data mutation in this tool.
- A phrase quick-list panel seeded from the **336-entry merged phrase set**
  ported verbatim: `TERM_LIBRARY` + `STARTER_CONSTRUCTION_PHRASES` + the inline
  `GENERATED_PDF_CONSTRUCTION_PHRASES`. Picking a phrase fills the note text;
  off-list text is still free-form (same "a suggestion list is never a wall"
  rule already established for MAIN PAGE's suggestion pickers).
- Full persistence: `state.construction` is included in `history.js`'s
  `makeSnapshot`/`restoreSnapshot` and `project-io.js`'s
  `buildProjectSnapshot`/`loadProject`, the same additive-field pattern used
  for `state.mainPage` (files saved before this story have no key and seed a
  default on open).

Explicitly **not** ported in phase 1 (all present in the source project):

- PPTX import, PDF export, PPTX export.
- The "Build Note" structured builder UI.
- "My Terms" (user-authored localStorage phrase additions).
- `SMART_NOTE_LIBRARY` autocomplete hints (37 category-grouped hint phrases).
- Arrange Notes (auto-layout), Duplicate Note (`D` shortcut), Mirror Note.
- Manual per-note label-width handle (fixed default width only).
- Multi-target notes (Shift-click to add a second leader from one label).
- The ~2,894-entry external `construction-phrases-v2.js` harvest.

## Alternatives Considered

1. **Link/embed the `Bra construction` project's runtime directly** (e.g. load
   `construction.html` in an iframe, or share its JS file). Rejected: no
   shared module exists between the two projects, this tool's state/history/
   render conventions are incompatible with the source's own globals-based
   model, and an iframe would break the "one shared undo stack, one saved
   project file" invariant this tool is built around.
2. **Port the full 2,894-entry external phrase harvest in phase 1.** Rejected
   as scope creep for a first landing; the 336-entry inline set is
   self-contained, sufficient to prove the UI, and the external file is a
   clean, separable follow-up.
3. **Free-floating notes not attached to any image.** Rejected: every note in
   the source project targets a point on the garment sketch; a construction
   annotation with no target defeats its purpose. Notes are scoped per-image
   instead of per-board so multi-image boards (already supported) stay
   unambiguous about which sketch a note belongs to.

## Consequences

Positive:

- The registry-based design ADR 0038 paid for pays off immediately: adding
  Construction costs one `TECH_PACK_PAGES` entry and one content element, not
  a repeat of the MAIN PAGE overlay-to-tab refactor.
- Phase 1 ships real, previously-curated phrase content (336 entries) rather
  than placeholder text, without committing to porting the much larger
  external harvest before the UI itself is validated.
- Undo/redo and save/load fall out for free by following the exact
  `state.mainPage` inclusion pattern in `history.js`/`project-io.js` — no new
  persistence mechanism to design or test.

Tradeoffs:

- Construction notes use a **different** normalization convention (per-image
  world-space `[0,1]`) than anchors (whole-image `[0,1]`). Future readers must
  not conflate the two; a note's `target` cannot be fed into anchor-consuming
  code and vice versa.
- Feature parity with the source project is intentionally incomplete. TDs
  used to the source tool will not find PPTX/PDF export, autocomplete, or
  multi-target notes on day one.

## Follow-Up

- If the 2,894-entry external phrase harvest is wanted, port
  `construction-phrases-v2.js` as its own story — it is additive to the
  `mergeConstructionPhrases`-style de-dupe already modeled in phase 1's data
  loading, not a redesign.
- PDF/PPTX export for the Construction page, if requested, should follow the
  existing `export-xlsx.js`/`export-pdf.js` offline, hand-rolled precedent in
  this repo rather than porting the source project's export engine verbatim.
- Multi-target notes and the manual label-width handle are the two source
  features most likely to be asked for next per the source project's own
  `APP_KNOWLEDGE_MAP.md` priority roadmap; both are additive to the note shape
  (`targets: [...]` already plural in the source's own `createCallout`) and
  should not require a schema version bump if added later — only a
  `migrateAnnotation()`-style default-fill for old notes.
