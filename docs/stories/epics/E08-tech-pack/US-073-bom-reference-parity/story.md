# US-073 BOM reference parity: column contract, bilingual headers, dual-sheet print

## Status

done

## Lane

normal

Reason: two risk flags — existing behavior (the BOM table's visible column
order/labels change, and the printed output changes from "one sheet, active
tab" to "BOM-SOLID + BOM-LACE, always both"), and weak proof (print output
has no automated assertions; `bom-check` covers the DOM/table/callouts but
not `@media print`). No data model change: `state.bom`'s persisted shape is
untouched — every change in this story is render/print/UI-affordance only.
No hard gate applies. Normal lane with stronger validation per
`docs/FEATURE_INTAKE.md`.

## Product Contract

Bring the BOM page to visual/behavioral parity with the reference factory
sheet (`Tech pack Output/TechPack output.html`, mod-bom — byte-identical to
the copy the FD supplied at `~/Downloads/Tech pack Output/`), per the parity
checklist in [`checklist.md`](checklist.md):

1. **Column contract matches the reference exactly** — order
   DESCRIPTION · TYPE / COMPOSITION · SUPPLIER NAME · ARTICLE # · WIDTH ·
   SIZE · AREA OF USE · MATERIAL IMAGES · one column per colorway, with the
   reference's bilingual EN + 中文 header strings (描述 · 材质 / 成分 ·
   供应商名称 · 款号 · 宽度 · 尺码 · 使用部位 · 材料图片).
2. **Print produces the reference's two factory sheets** — BOM-SOLID then
   BOM-LACE, each with a sheet-head block (style meta line composed from
   MAIN PAGE fields + the `BOM-SOLID`/`BOM-LACE` sheet name), page break
   between sheets, editor chrome (▾ buttons, action column, add-row lines,
   photo-trigger affordance) absent. Screen behavior is unchanged: the
   active Solid/Lace tab still shows one sheet, and all existing
   interactions keep working. Implemented as a print-only container
   (`#bomPrintSheets`) re-rendered alongside the screen table, so
   `bom-check`'s `#bomSections`-scoped selectors and the TD's editing DOM
   are untouched.
3. **Per-row ⊕ (add-to-material-key)** — the reference's `data-mk` row
   action: one click on a row's ⊕ jumps to the Material Key sub-view (on
   the row's own variant if its scope is single-sheet), selects that row,
   and arms callout placement, so the next sketch click drops that row's
   numbered callout.

Deliberate deviations from the reference, documented in the checklist and
left as-is: delete-row confirm dialog (this tool uses undo + toast instead —
a native `confirm()` would also hang the headless suites), AI/bilingual cell
translation, photo catalog matching, the ⚡ batch drafter, and per-row
`cw_default` (ADR 0041's drop list, unchanged by this story).

## Relevant Product Docs

- `docs/stories/epics/E08-tech-pack/US-073-bom-reference-parity/checklist.md`
  — the per-part parity checklist with DoD this story exists to satisfy.
- `docs/decisions/0041-bom-annotation-and-table.md` — the BOM page's decision
  record and its drop list (this story does not un-drop anything).
- `docs/stories/epics/E08-tech-pack/US-072-bom-annotation-and-table/` — the
  story that built the page this one polishes.

## Acceptance Criteria

- The BOM table header renders the reference's exact column order and
  bilingual labels, on screen and in print.
- Printing from the BOM page (any sub-view, any active tab) yields exactly
  two sheets — BOM-SOLID then BOM-LACE — each with a sheet-head; a
  BOTH-scope row appears on both, a SOLID/LACE-scope row only on its own.
- The screen table still shows only the active variant; all 47 pre-existing
  `bom-check` assertions still pass (plus new ones covering ⊕ and the print
  container).
- A row's ⊕ arms Material-Key placement linked to that row, switching
  variant when the row's scope demands it.
- `state.bom`'s persisted shape is byte-identical for untouched projects
  (no migration).

## Design Notes

- Commands: none new.
- Queries: none new.
- API: no test-hook changes (`window.__braAutoModeDebug` untouched).
- Tables: `.bm-table` header markup gains `<span class="bm-cn">` bilingual
  spans; `#bomPrintSheets` (print-only) renders both variants via a lean
  row renderer with no editor affordances.
- Domain rules: `BM_CELL_FIELDS` order becomes the reference's column
  contract; `BM_CELL_LABELS`/`BM_CELL_LABELS_CN` carry the reference's
  exact strings.
- UI surfaces: `src/ui/bom.js`, BOM CSS + print CSS in `index.html`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` (build + parse/wiring) |
| Integration | `npm run bom-check` — existing 47 assertions + new: header order/CN spans, ⊕ arms matkey for the clicked row, `#bomPrintSheets` carries two sheets with correct per-scope row counts |
| E2E | Manual: `npm run serve`, BOM page → ⌘P print preview shows BOM-SOLID + BOM-LACE with sheet-heads and no editor chrome (checklist section H) |
| Platform | n/a (offline browser tool) |
| Release | n/a |

## Harness Delta

None. (`scripts/bin/harness-cli` invocations were intermittently blocked by
a sandbox-classifier outage during this session; recorded here as friction,
fallback per AGENTS.md.)

## Evidence

- To be added after implementation: bom-check output, print-preview
  screenshots against the reference sheet.
