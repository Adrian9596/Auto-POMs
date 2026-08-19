# US-047 Deleting a POM line excludes that POM from the exported spec

## Status

implemented

## Lane

normal

## Product Contract

Before: the exported .xlsx is built from the POM template + custom POMs, with
each row's Size L falling back to the corpus **library suggestion** — so it is
independent of drawn lines. The only way to drop a POM from the export was the
review **× Hide** toggle. A TD deleted a POM line and its measurement still
appeared in the export.

After (TD: "delete a line has the same meaning as hide a line, the same
behavior"): **deleting a POM line excludes that POM from the exported spec**,
exactly as hiding it does — including pairing (deleting POM 1 drops 1 & 2). If a
line with that label is later redrawn, the live line wins and the POM returns.

## Relevant Product Docs

- `docs/decisions/0011-cup-poms-measured-on-front-outer-view.md` (library values pre-fill the export)
- Export invariant: two identical exports are byte-identical (`npm run export-xlsx`).

## Acceptance Criteria

- Deleting an annotation adds its POM label to `state.deletedPomKeys`.
- The xlsx export excludes any key in `deletedPomKeys` that has **no** live
  annotation with that label (redraw un-excludes); pairing partners drop too.
- `deletedPomKeys` persists with the project and through undo/redo; cleared by
  Clear All.
- Empty `deletedPomKeys` (all existing tests/fixtures) → byte-identical export,
  no behavior change.

## Design Notes

- Commands: `deleteSelected` (`src/manual/annotations.js`) records
  `getLabelText(ann)`; `clearAllAnnotations` resets the list.
- Queries: export exclusion in `buildSpecWorkbookXlsx` (`src/render/export-xlsx.js`)
  — `deletedPomKeys` are folded into `hiddenPomKeys` (guarded by `annByPom`),
  reusing the existing hidden-line pairing expansion.
- State: new `state.deletedPomKeys: []` (`src/state.js`); serialized in
  `src/project/history.js` (snapshot + restore) and `src/project/project-io.js`
  (save + load).
- UI surfaces: the Measurements PANEL still lists every template row (unchanged,
  pre-filled-spec design); only the EXPORT is filtered — matching how Hide
  leaves a panel row but drops the export row.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | build + check pass |
| Integration | export-xlsx PASS, export-hidden PASS, autosave-check PASS (empty deletedPomKeys → byte-identical) |
| E2E | Browser: delete POM 9 → export omits 9; delete POM 1 → omits 1 & 2; redraw a deleted POM → it returns |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None. Additive `state.deletedPomKeys`; export contract unchanged when empty.

## Evidence

- `npm run export-xlsx` / `export-hidden` / `autosave-check` / `check` — pass.
- Browser (localhost:4173) via `loadProject` + `exportSpecXlsxBase64`:
  base POMs `1..18`; `deletedPomKeys:['9']` → `1..8,10..18`;
  `deletedPomKeys:['1']` → `3..18` (pairing drops 2); `deletedPomKeys:['9']`
  WITH a live line labeled '9' → `1..18` (redraw wins).
- Note: `npm run golden` / `contract` currently fail ONLY on the newly-added
  demo `EvelynBliss vA 1.0.jpg` (no golden baseline + 1 detection assertion) —
  pre-existing, unrelated to this story; every other demo passes.
