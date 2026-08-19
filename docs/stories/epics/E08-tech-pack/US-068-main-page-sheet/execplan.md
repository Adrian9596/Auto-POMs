# Exec Plan

## Goal

Give the TD one place to finish a style: measure the sketch, then fill the tech
pack MAIN PAGE without leaving the tool or retyping metadata into a second
workbook.

## Scope

In scope:

- New `state.mainPage` branch: `fields[]`, `fieldExtra{}`, `colorways[]`,
  `colorLibrary[]`, `colorLibId`.
- New source part `src/ui/main-page.js` re-implementing the source module's
  field table, shared field picker, colour picker, and colorway table on this
  tool's primitives.
- MAIN PAGE markup + CSS in `index.html`, screen-only controls hidden on print.
- Persistence through `buildProjectSnapshot` / `loadProject`, including the
  additive default for projects saved before this story.
- Undo/redo participation via `makeSnapshot`.

Out of scope (see `overview.md` Non-Goals):

- Sketch images, ink-box auto-balance, paste-to-slot.
- BOM colorway sync (no BOM exists in this tool).
- xlsx export changes.

## Risk Classification

Risk flags (4 → high-risk lane):

- **Data model** — the persisted project schema gains a branch.
- **Public contracts** — the `.json` project file is versioned and
  client-visible; old files must still open.
- **Existing behavior** — `makeSnapshot` feeds `snapshotFingerprint`, which
  gates undo dedup; `autosave-check` covers the round trip.
- **Multi-domain** — `state.js`, `project-io.js`, `history.js`, a new UI part,
  `index.html`, print CSS.

Hard gates:

- None triggered. The schema change is **additive with a default**, not a
  migration: a project saved before US-068 has no `mainPage` key and loads with
  a freshly seeded default. No existing field is renamed, moved, or dropped, so
  there is no data-loss path to gate.

## Work Phases

1. Discovery — source module + tool primitives mapped. **Done** (see
   `design.md` "Runtime mapping").
2. Design — schema, module boundary, picker behaviour. **Done.**
3. Validation planning — see `validation.md`.
4. Implementation — `src/` parts, then `npm run build`.
5. Verification — `npm run check`, `autosave-check`, `golden`, `smoke`, plus a
   manual browser pass on the sheet itself.
6. Harness update — decision 0037, `harness-cli story add`, ARCHITECTURE map.

## Stop Conditions

Pause for human confirmation if:

- The field roster or the Color Master List needs to change (both are copied
  verbatim from an audited source; editing them is a data decision, not a port).
- Adding `mainPage` to `makeSnapshot` proves to destabilise undo dedup.
- The print layout cannot be matched without restructuring the existing board
  print CSS.
- Colorways turn out to need a real sync target after all.
