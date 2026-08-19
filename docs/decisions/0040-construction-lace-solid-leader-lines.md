# 0040 Construction annotation: Lace/Solid split, zone taxonomy, multi-anchor leader lines

Date: 2026-08-15

## Status

Accepted

## Context

The TD's request in full (Vietnamese): *"Tôi muốn chính xác construcion
annotation ở phần techpak out put hiện tại, gồm lace và solid, cách dùng
leader lines"* — make the Construction annotation page match the reference
tech-pack tool's construction feature, including its Lace/Solid split and how
it uses leader lines. When asked to narrow scope, the TD instead pointed
directly at the reference artifact: `Tech pack Output/TechPack output.html`
(a sibling project living inside this same Drive folder, with its own git
repo and its own `CLAUDE.md`) — and asked to proceed without further
clarifying questions.

This is a **different** sibling reference than the one [ADR
0039](0039-construction-annotation-page.md) forked from (`../Bra
construction/construction.html`). `Tech pack Output/TechPack output.html` is a
larger, more mature tech-pack authoring tool with its own BOM module, AI
drafting/translation, PDF-mined phrase library, and asset management — none of
which this tool has or needs. Reading it (read-only; nothing in `Tech pack
Output/` was edited, per that project's own `CLAUDE.md` — editing its
generated artifacts is reserved for its own maintainers) surfaced its
construction feature (`mod-con` in `TechPack output.html`):

- Two physical sheets, `#sheet-con-lace` and `#sheet-con` (nav labels
  "Construction · Lace" / "Construction · Solid") — each with its own
  outer/inner canvas pair and its own note list.
- A 7-value garment zone taxonomy (`CUP, NECKLINE, ARMHOLE, CRADLE, UNDERBAND,
  BACK, STRAP`) tagged on every note, feeding a per-zone operation table below
  each canvas (not ported here — see Non-Goals).
- Leader lines drawn in an SVG overlay from the callout box's own **edge**
  (not its label point) to each anchor, with an arrowhead, and multiple
  anchors per callout (`c.anchors: [...]`) — a callout can point at more than
  one detail. An anchor is removed by **double-clicking** it; a `.anc`'s CSS
  comment states this outright: *"double-click here is the ONLY way to remove
  one leader line."*

ADR 0039's own Follow-Up section had already flagged multi-target notes as
the most likely next ask, and named the field `targets: [...]` (plural) as
the anticipated shape — this decision fulfills that prediction rather than
inventing a new one.

## Decision

Extend the note shape in `src/ui/construction.js` (US-071):

```
{ id, seq, imageId, zone, variant, targets:[{nx,ny}, ...], textPos:{nx,ny},
  note, color, showArrow }
```

- **`targets` replaces the singular `target`.** `ensureConstruction()` runs a
  one-time, idempotent `ccMigrateNote()` over every note on load, wrapping an
  old `target` into a 1-element `targets` array. Multiple anchors are added
  via a new `#ccAddArrowBtn` (armed like `#ccAddNoteBtn`: click the button,
  then click the sketch); the **first** anchor keeps the existing numbered-pin
  visual (a filled circle with the note's `seq`), later anchors render as
  small plain dots — same information, minimal visual disruption to notes
  authored before this change.
- **Leader lines are drawn from the label box's own edge**, not its anchor
  point (`ccLabelBox()` + `ccEdgeToward()`, ported math from the reference
  tool's `edgeToward()`), with a canvas-drawn arrowhead at the target end
  (`ccDrawArrowHead()`). Still recomputed every render, never stored — same
  invariant as ADR 0039.
- **Double-click an anchor to remove just that leader line**
  (`ccOnDoubleClick`/`ccDeleteAnchorAt`), ported verbatim as an interaction
  convention. A note must keep at least one anchor — double-clicking the last
  one is a no-op with a toast; `Delete note` / Backspace remains the only way
  to remove a note entirely.
- **`zone`** (the 7-value taxonomy, `CC_ZONES`) is added to every note,
  defaulted via a trimmed port of the reference's keyword-based `inferZone()`
  (`ccInferZone()`, reading only the note's own text — this tool's notes carry
  no `region`/`html` field to also match against) and editable via a new
  `#ccNoteZone` `<select>` in the side panel. **Purely descriptive**: nothing
  downstream reads it (no BOM module, no export grouping — this tool has
  neither), unlike the reference tool where it drives a printed table.
- **`variant`** (`'solid' | 'lace'`, default `'solid'`) is added to every
  note, with two toolbar tab buttons (`[data-cc-variant]`) switching which
  notes render/hit-test/get a per-sheet `seq` sequence
  (`ccVisibleNotes()` filters `state.construction.notes` by variant). Deviates
  from the reference tool in one respect, deliberately: **both variants
  annotate the same shared board sketch images** — they do not get separate
  image sets the way the reference tool's `pages[0,1]` (Solid) vs `pages[2,3]`
  (Lace) do. This tool has one shared image board, not a per-sheet image
  model, and duplicating that would be a much larger, unrequested change to
  how Construction sources its sketches.

## Alternatives Considered

1. **Two fully separate pages/canvases (`#sheet-con-lace`-style), each with
   its own image set**, mirroring the reference tool exactly. Rejected: this
   tool's board is a single shared image set consumed by every page (MAIN
   PAGE, and now Construction); giving Construction its own per-variant image
   board would be a much bigger architectural change than the TD's request
   implies, and nothing in the request asked for different sketches per
   variant — only a Lace/Solid split of the *notes*.
2. **A single note list with a `material` tag instead of a variant-scoped tab
   split.** Considered because it's a smaller diff. Rejected: the reference
   tool's nav literally presents Lace and Solid as two separate pages the TD
   switches between, not a filter on one list — a tab split matches that
   mental model and lets each sheet keep its own `seq` numbering, closer to
   "two sheets" than "one filtered sheet."
3. **Port the full per-zone operation table** (`.con-table`, zone-pick
   add-note menu) below the canvas. Deferred — see Non-Goals; it is a
   materially bigger UI (a whole second editable surface per note, bilingual
   EN/中文 rendering, an `over8`-word-limit flag) that the TD's request did not
   name, and it duplicates information already visible via the canvas +
   side-panel.

## Consequences

Positive:

- Leader lines now read correctly against real note text: a long note's box
  no longer has a line running straight through its own words, since the
  line now stops at the box edge.
- A note can annotate two or more details at once (e.g. one "Coverstitch"
  note pointing at both side seams) without duplicating the note text.
- Lace and Solid annotations no longer collide in one undifferentiated list;
  a TD switching fabrics keeps independent, independently-numbered note sets.
- The migration is additive and one-directional: a project saved before this
  story opens, seeds `targets`/`zone`/`variant` defaults, and round-trips
  fine: no version bump, no schema flag, matching ADR 0039's own predicted
  migration shape.

Tradeoffs:

- `zone` is decorative in this tool (no table, no export grouping) — a future
  reader must not assume it drives anything printed, unlike in the reference.
- Lace and Solid share one image board; a TD who genuinely needs different
  sketches per variant (e.g. a lace-specific flat) still has to swap the
  Board's images by hand before switching tabs. This is an explicit, named
  simplification, not an oversight.
- Multi-anchor notes add one more mode (`ccArrowArmed`) alongside
  `ccArmed`; the double-click-to-delete convention is easy to miss without
  the `#ccAddArrowBtn` tooltip.

## Follow-Up

- If the TD asks for the per-zone operation table (`.con-table` equivalent),
  it is additive to `zone` already existing on every note — no note-shape
  change needed, only a new render surface + a `data-con-add`-style
  zone-picker "add note" control.
- Per-variant image sets (matching the reference tool's `pages[0,1]`/`[2,3]`
  split exactly) remain a possible, larger follow-up if the shared-board
  simplification above turns out to matter in practice.
