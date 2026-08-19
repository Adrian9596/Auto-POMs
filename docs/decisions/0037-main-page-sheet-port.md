# 0037 MAIN PAGE is rebuilt on this tool's primitives, not copied from the tech pack

Date: 2026-08-15

## Status

Accepted. Superseded in part by
[ADR 0047](0047-main-page-carries-version-sketches-and-style-breakdown.md),
which fills the reserved sketch slots, splits `Style No Breakdown` into three
sub-cells, and restores `Block Reference - 原版品` — the roster is 14 rows.

## Context

The tech pack MAIN PAGE sheet lives in a separate project,
`Tech pack Output/TechPack output.html`. The TD asked for it inside Bra Auto
Measure so a style can be finished in one place instead of retyping brand, style
number, size range and the responsible designers into a second workbook.

The obvious move — copy the module across — does not work. The source is built
on its own runtime: `Pack.registerModule`, `Pack.data`, `Pack.esc`,
`Pack.pushUndo`, `Pack.markDirty`, `Pack.emit`, `Pack.asset`,
`Pack.placeVertically`. None of it exists here (verified: zero `Pack.` matches
across `src/`). The two projects also disagree about what a document *is*: the
tech pack is a multi-sheet document engine, this tool is a measurement board
with one export.

Two further constraints surfaced during discovery:

- This tool has **no BOM** (zero `bom` matches across `src/` and `index.html`).
  The source's colorway rows exist precisely to drive a BOM's `COL` columns.
- The persisted project file is a versioned, client-visible contract, and
  `makeSnapshot` feeds `snapshotFingerprint`, which gates undo dedup.

## Decision

Rebuild the MAIN PAGE on this tool's own primitives rather than porting the
`Pack.*` runtime, re-pointing roughly eight calls (mapping table in the US-068
`design.md`).

Carry the *data* across verbatim — the 13-row field roster, the suggestion
rosters mined from 52 historical packs, and the 47-entry Color Master List — and
carry the source's hard-won behavioural rules with it, specifically:

- bind a suggestion spec to its row **once, by regex**, never per render,
  because the labels are editable;
- keep the `▾` trigger in its own `<td>`, never inside the value cell;
- let `Style No Breakdown` suggest range names only;
- never treat a suggestion list as a wall — off-list values persist in
  `fieldExtra`.

Add `state.mainPage` **additively, with a seeded default**, so projects saved
before this story keep opening.

Ship the colorway table even though its BOM sync has no target here, and record
that limb as knowingly inert rather than dropping it silently.

## Alternatives Considered

1. **Embed the tech pack HTML in an iframe.** Rejected: it ships its own
   runtime, an Anthropic API key path, and a 5.8 MB base64 payload, and it
   cannot see the board's style data. This tool is offline and self-contained by
   charter.
2. **Port the `Pack.*` runtime, then drop the module in unmodified.** Less
   porting work, but it leaves the tool with two competing state and undo
   systems. The re-pointing cost is bounded; the double-runtime cost is not.
3. **Fields only, no sheet layout.** Offered at intake; the TD chose the full
   sheet replica.
4. **Drop colorways** since nothing consumes them. Rejected: they are part of
   the sheet the TD asked for, and an inert-but-recorded limb is honest where a
   silent omission is not.

## Consequences

Positive:

- One tool finishes a style: measurements *and* the MAIN PAGE.
- The tool keeps a single state, undo, and persistence model.
- Old projects are unaffected — the schema change is additive.
- The suggestion data stays traceable to its audited source.

Tradeoffs:

- The port is a **fork, not a link**. If the tech pack's field roster or Color
  Master List changes, this copy does not follow. Both sides now have to be
  updated by hand.
- Colorways are captured and printed but sync nowhere until a BOM exists here.
- `colorLibrary` (47 entries, ~3 KB) is copied into every saved project, so a
  project stays self-describing when the master list later moves.
- `state.mainPage` enters `makeSnapshot`, so every MAIN PAGE edit becomes an
  undo step.

## Follow-Up

- Sketch images on the sheet (`versionImages`, ink-box auto-balance,
  paste-to-slot) — deferred by the TD, out of US-068.
- A MAIN PAGE sheet in the xlsx export — the export stays one sheet for now.
- If a BOM ever lands here, wire the colorway sync and retire the inert-limb
  note above.
- Decide whether the field roster should become shared data between the two
  projects instead of a fork.
