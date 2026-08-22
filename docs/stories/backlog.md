# Story Backlog

This file is an index, not a second source of truth. Each story packet's own
`## Status` block is authoritative; this page exists so a reader can see in one
screen which epics have landed and what is still open. It is deliberately
short — kept to the epics and the open packets — because an index long enough
to drift is worse than one you can trust.

Do not create every possible story packet up front. Create story packets when
the work is selected or when a product decision needs a durable place to land.

## Epics

| Epic | Description | Packets | Status |
| --- | --- | --- | --- |
| [E01-manual-mode](epics/E01-manual-mode/) | Manual Mode handoff, board editing, line/note/anchor-point interaction | 18 | implemented |
| [E02-export](epics/E02-export/) | Excel measurement spec, size-selective export, editable grading | 2 | implemented |
| [E03-anchor-correction](epics/E03-anchor-correction/) | Anchor correctness for the detectors that seed the POM lines | 9 | implemented |
| [E04-harness](epics/E04-harness/) | Keep repository-harness integration current and usable in this checkout | 2 | in_progress |
| [E05-library](epics/E05-library/) | Library value layer: L0 contracts, L1 ingestion, TD review, POM 17/18 intake | 4 | implemented |
| [E06-engine-workflow](epics/E06-engine-workflow/) | Engine phases 6–8: landmark QA, anchor/POM contract, bias learning | 3 | implemented |
| [E07-measurement-detection](epics/E07-measurement-detection/) | The 18-POM auto pipeline: detection, evidence, accuracy gate | 22 | implemented |
| [E08-tech-pack](epics/E08-tech-pack/) | Tech-pack pages: MAIN PAGE, Construction, BOM, Preview & Export | 15 | in_progress |

## Open Story Packets

| Story | Lane | Status | Note |
| --- | --- | --- | --- |
| [US-058 TD measurement ground-truth capture](epics/E04-harness/US-058-td-measurement-ground-truth-capture.md) | normal | planned | Unblocks the **measurement accuracy gate**. `npm run measurement-accuracy` is wired but scores 0 POMs: all three files in `scripts/groundtruth/measurements/` are `draft_pending_td` library medians, so no POM can be promoted on evidence until a TD saves one `td_confirmed` file from inside the app. |
| [US-081 Factory workbook format](epics/E08-tech-pack/US-081-factory-workbook-format/) | high-risk | planned | Not started: `src/render/export-techpack-xlsx.js` still writes the six-sheet US-079 shape (no `CONSTRUCTION DETAIL`, no `PROTO Direction`), the `factory-format-check` suite its `validation.md` calls for does not exist, and Acceptance Evidence is still "Add results after verification." |

Every other packet under `epics/` has landed; read the packet's own `## Status`
block (or, for high-risk folders, `validation.md`) for its evidence.

## Known Drift

Recorded here rather than silently corrected — these live in files this index
does not own.

- `US-001 Re-enable Manual Mode` and `US-004 Refresh Repository Harness
  Integration` still read `in_progress` in their own packets, though Manual
  Mode shipped per [ADR 0008](../decisions/0008-reenable-manual-mode.md) and a
  dozen-plus later stories (US-082 … US-093) build on it. The packets need the
  correction, not this table.
- `scripts/bin/harness-cli query matrix` reports `status planned` for
  US-070 … US-074 and US-079/US-080 even where the packet says `done` or
  `implemented`, and carries no row for US-073 at all. The durable rows need a
  refresh pass with `harness-cli story update`.
- `README.md` in this folder still calls
  `epics/E01-manual-mode/US-001-reenable-manual-mode.md` "the first" active
  packet, which now describes numbering history rather than the active queue.
