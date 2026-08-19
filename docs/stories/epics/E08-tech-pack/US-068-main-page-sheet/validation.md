# Validation

## Proof Strategy

Two things must hold before this story is done.

**Nothing that measures changed.** MAIN PAGE adds no anchor and no POM, so the
detection suites must be *byte-identical*, not merely green. `golden` is the
determinism gate and any movement there means the port leaked into detection.

**The new branch survives a round trip.** A project saved with MAIN PAGE data
must reopen with it intact, a project saved *before* this story must still open,
and the branch must undo/redo cleanly — the last one is the real risk, because
`makeSnapshot` feeds `snapshotFingerprint` and a mutable object added carelessly
there can either break undo dedup or make every render look like a change.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Field/spec regex binding: `Style No Breakdown` claims its row before the looser `/Style No/`. Colour token search folds diacritics and is order-free. Colorway removal renumbers `COL n`. |
| Integration | `npm run check` (build freshness + wiring). `npm run autosave-check` (round trip incl. the new branch). Old-project load: a fixture with no `mainPage` key opens with a seeded default. |
| E2E | `npm run smoke` (Auto pipeline unaffected). `npm run golden` — must stay 12/12 at 0.0000; any drift fails the story. `npm run contract` + `npm run invariants` unchanged. |
| Platform | Browser pass: picker opens/closes, off-list value persists to `fieldExtra`, Brand + date read-only, print preview hides screen-only controls. |
| Performance | Not a concern — 13 rows and a 47-entry list; no detection work added. |
| Logs/Audit | None. Assert MAIN PAGE edits write nothing to the learning store. |

## Fixtures

- `demo/demo1.jpg` — smoke/golden fixture, unchanged.
- A saved project **without** `mainPage`, to prove the additive default. Any
  pre-US-068 file under `library/` serves; capture one explicitly.
- The 13-row default field roster and the 47-entry Color Master List, both
  copied verbatim from `Tech pack Output` (source of record:
  `build_main_page_field_spec.py`, `Color_Master_List.xlsx`).

## Commands

```text
npm run build
npm run check
npm run autosave-check
npm run golden          # must be 12/12 @ 0.0000 — no drift permitted
npm run smoke
npm run contract
npm run invariants
```

Known-red, unrelated to this story: `npm run pipeline-tests` fails Test 10 by
design-contradiction with ADR 0022 (POM 7 arc tier). Do not read it as a
regression from US-068.

## Acceptance Evidence

Implemented and verified 2026-08-15 against build `fefd7f3c942f`.

### Detection is untouched

The load-bearing claim of this story. MAIN PAGE adds no anchor and no POM, so
these had to be *identical*, not merely green:

| Suite | Result |
| --- | --- |
| `golden` | **PASS — maxDrift 0.0000** on every fixture (tol 0.04). Zero drift, not "within tolerance". |
| `invariants` | PASS — 135/135 assertions, 0 failed. |
| `contract` | PASS — 753/753. |
| `smoke` | PASS — `"failures": []`; anchors dragged 0, drafts edited 0. |
| `check` | `check passed` (build freshness + per-part parse + wiring). |
| `autosave-check` | PASS — the new `mainPage` branch rides the existing autosave path without disturbing it. |

### The feature itself

New suite `npm run mainpage-check` — **29/29 assertions, PASS**. Nine steps:

1. Seeded shape: 13 field rows, 2 version panels, 2 colorways each, Brand
   read-only `Crossian`, 11 suggestion triggers.
2. Picking a suggestion writes **its own** row (proves the regex binding — the
   `Style No Breakdown` / `Style No` overlap is the trap).
3. `#undoBtn` restores the seeded value — the `makeSnapshot` branch is real, and
   `snapshotFingerprint` dedup still works.
4. An **off-list** value applies and lands in `fieldExtra.techDes` — the
   suggestion list is not a wall.
5. Diacritic folding: `nga hoang` → `Nga Hang Thi Hoang`.
6. Colour search by code fragment `14-38 lilac` → `14-3812 TCX Lilac Mist`
   (`#cbbdd8`); both panels mirror; removal renumbers to `COL 1` / `COL 2`.
7. **A project saved before US-068** (no `mainPage` key) opens and seeds the
   default — 13 fields, 2 colorways, libId, 47 library entries.
8. Save → open round trip preserves field value + colorway and repaints.
9. MAIN PAGE adds no anchors and no drafts; the persisted key shape is exactly
   `colorLibId, colorLibrary, colorways, fieldExtra, fields, provenance`.

### Browser pass (what the assertions could not see)

Three headless screenshots of the real sheet caught two defects that all 29
assertions passed straight through — worth recording, because it is the reason
the platform row is not just "assumed green":

- **Both pickers could be open at once.** The overlay's delegated click handler
  returns early on a trigger hit, so it never reached the close-the-colour-menu
  branch. Fixed by making each picker close the other on open. Re-verified
  programmatically: with the colour menu open, clicking a field trigger now
  yields `{colorOpen:false, fldOpen:true}`.
- **The provenance box read as a rendering fault** — a bare, unlabelled empty
  box. Fixed with a `.mp-note:empty::before` placeholder, suppressed under
  `@media print` so an empty note never prints.

Print layout confirmed by the `@media print` rules: `body.mainpage-open` hides
`.app`, un-fixes the overlay, and drops `.mp-screen-only` + `.mp-menu`.

### Known-red, unrelated

`npm run pipeline-tests` fails Test 10 by design-contradiction with ADR 0022
(POM 7 arc tier), exactly as it did before this story. Not a US-068 regression.

### Deferred, on purpose

- Sketch images on the sheet — the TD scoped them out of this pass; the version
  panels render a labelled placeholder rather than an empty frame.
- The colorway rows have no consumer here, because this tool has no BOM. Carried
  anyway so the sheet is a faithful replica; recorded in ADR 0037 rather than
  silently dropped.
