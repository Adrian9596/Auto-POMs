# 0045 Construction sheets own working views, operation rows, and callouts

Date: 2026-08-16

## Status

Accepted

## Context

Construction already had Lace/Solid note filtering, a shared Board-image
canvas, and a flat live note table. The TD asked to make Construction follow
the faster and more coherent BOM working-sheet model: a wide annotation board
above a permanently visible table, with a small editable draft already present.
The TD also required each Lace/Solid sheet to contain distinct Outer and Inner
views, including independently owned images.

The existing note-as-both-row-and-callout shape could not represent an unpinned
draft row, a row moving between Outer and Inner, or a Lace/Outer image set that
must not leak into Solid/Inner. A durable ownership boundary was therefore
needed before changing the UI.

## Decision

- Construction has two sheets, `lace` and `solid`. Each sheet owns two working
  views, `outer` and `inner`, and one operation-row list.
- Each view owns its own image set. Paste, upload, and drop add images to the
  focused view; images are never shared implicitly across sheet/view boundaries.
- A Construction Operation Row has a stable id, sheet, view, Area, and
  Construction Detail. New Construction projects seed six blank-detail rows in
  each view: `CUP`, `SLING`, `CRADLE`, `SIDE_SEAM`, `BACK_CLOSURE`, and
  `FRONT_CLOSURE`.
- The Area dropdown also offers `NECKLINE`, `ARMHOLE`, `UNDERBAND`, `STRAP`, and
  `BACK`. Construction Detail is an empty string by default; the application
  must not insert `TBC`, stitch types, SPI, dimensions, or other technical
  wording without a TD action.
- Each row owns at most one Construction Callout. A callout may have multiple
  leader targets, but its number, Area, and detail text always derive from its
  row. Rows may exist without a callout.
- Construction uses the same explicit interaction model as BOM: Select, Add
  Callouts, and Add Leaders. Add Callouts advances through uncovered rows;
  Add Leaders stays active for multiple targets until Select or Escape.
- Deleting a row deletes its callout in the same undoable change. Moving a row
  between Outer and Inner deletes its old callout rather than projecting image
  coordinates into a different working view.
- Legacy Construction notes migrate without losing their text, target, label,
  or image. A note on a `front_inner` Board image becomes Inner; every other
  legacy note becomes Outer. Existing projects with Construction content do not
  receive the new blank seed rows.

This decision supersedes ADR 0040's shared Board-image simplification and ADR
0042's rule that every table row must already be a pinned note. Their leader
geometry, phrase-library behavior, and editable-table principles remain valid.

## Alternatives Considered

1. Keep one shared Board-image canvas and add an Outer/Inner dropdown. Rejected:
   callouts could appear on the wrong construction evidence and Lace/Solid
   images could not be authored independently.
2. Create four top-level pages. Rejected: TDs read this as two Construction
   sheets, each containing an Outer/Inner pair.
3. Seed technical construction sentences. Rejected: it would invent production
   facts and create deletion work for the TD. Only structure and Area are seeded.

## Consequences

Positive:

- Construction and BOM share one annotation grammar, reducing TD interaction
  cost and preventing table/callout drift.
- Draft rows support table-first authoring without forcing premature callouts.
- Image ownership and row ownership are explicit enough for safe save/open,
  undo, and future print/export work.

Tradeoffs:

- The persisted Construction shape requires a migration from legacy notes.
- Moving a row to another view intentionally discards its old callout; the TD
  must place a new one on the correct image.
- A fresh Construction project starts with 24 blank-detail rows total (12 per
  sheet), so the table must stay compact and easy to scan.

## Follow-Up

- Printed Construction sheets may later render the two working views and their
  shared table, but factory-release approval remains a separate TD decision.
