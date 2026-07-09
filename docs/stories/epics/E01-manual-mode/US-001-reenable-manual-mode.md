# US-001 Re-enable Manual Mode with Post-Apply Handoff and Copy Image

_First story packet in this repo — starts the `E01-manual-mode` epic and the
`US-NNN` numbering scheme suggested in `docs/stories/README.md`._

## Status

in_progress

## Lane

normal

Intake: change request, one risk flag (changes accepted/documented auto-only
behavior). See `docs/decisions/0008-reenable-manual-mode.md` for the contract
change. Locked plan: `manual mode plan.md` (repo root).

## Product Contract

After the 16 POM lines are auto-generated and applied, the TD can verify and
correct them with the full manual toolset instead of being locked out of
editing:

- **Apply handoff:** after "Apply Lines", the app auto-switches to Manual Mode.
  Applied auto lines are plain editable annotations (drag, reshape endpoints,
  move labels, delete, copy/paste, reflect, keyboard shortcuts, styles, export).
- **Visible toggle:** a Manual/Auto mode toggle stays visible in both modes so
  the TD can return to Auto (e.g. re-detect / redo drafts).
- **Reopen behavior:** saved projects that contain applied lines reopen in
  Manual Mode, ready to edit.
- **Auto-first:** fresh load still boots into Auto Mode; the 16-POM auto
  pipeline (detect → seed anchors → generate) is unchanged.
- **Copy Image:** a new toolbar button and `⌘⇧C` copy the whole board (sketch +
  all lines/labels, content bounds) as a PNG to the clipboard, fully offline.
- **Learning:** the learning loop capturing TD edits of auto-origin lines in
  Manual Mode is intended behavior (per the fork's learning design).

## Relevant Product Docs

- `docs/product/README.md` — core product rules (mode behavior updated by this
  story).
- `POMS_CONTRACT.md` — the 16 POMs; **unchanged** by this story.
- `manual mode plan.md` — the locked implementation plan (phases, coercion
  points, verification steps).
- `docs/decisions/0008-reenable-manual-mode.md` — the durable decision record.

## Acceptance Criteria

- Fresh load boots into Auto Mode; Detect → Generate → Approve → Apply Lines
  behaves as before up to the apply.
- After a successful Apply, the app switches to Manual Mode and the manual
  toolbar appears (edit group, drawing tools, styles, labels, export, help).
- Applied lines are editable: dragging a line, dragging an endpoint, and moving
  a label each work and each produce one undo entry.
- `⌘C` / `⌘V` duplicates a selected line (offset, new number); `M` reflects it
  within its view.
- The Manual/Auto toggle is visible in both modes; switching back to Auto
  restores the auto toolbar and hides the manual controls.
- Copy Image (toolbar button or `⌘⇧C`) puts a whole-board PNG (sketch +
  lines/labels, content bounds) on the clipboard with no network call; success
  and failure produce a toast, and clipboard-permission failure is handled
  gracefully.
- Saving and reopening a project with applied lines opens in Manual Mode with
  lines editable; a fresh (no applied lines) load stays Auto-first.
- No changes to rule JSON, anchor schema, POM geometry, or detection output
  (determinism preserved).

## Scope

Plan phases 1–4 of `manual mode plan.md`:

1. Unlock the mode coercion points + auto-handoff after
   `applyApprovedDraftsAtomically`.
2. Reveal the manual UI (auto-scoped `.manual-only` CSS) and keep the mode
   toggle visible in both modes.
3. Copy Image (`src/render/copy-image.js`, toolbar button, `⌘⇧C`, toasts) —
   the only net-new feature.
4. Reopen-in-Manual for projects containing applied lines.

Out of scope:

- Detection-accuracy work (Track A/B research) — separate.
- New POM logic, rule JSON (`auto_mode_rules/pom-template.json`), or anchor
  schema (`auto_mode_rules/anchor-schema.json`) changes — untouched.

## Design Notes

- Commands: n/a (browser tool; no CLI surface changes).
- Queries: n/a.
- API: n/a (fully offline; no network endpoints).
- Tables: n/a (no schema; project JSON + localStorage unchanged in shape).
- Domain rules: applied drafts already carry `auto:true` /
  `sourceMode:'auto-mode'`, so flipping `appMode` makes them editable with no
  new unlock logic; Copy Image must stay local (`canvas.toBlob` →
  `ClipboardItem`) to preserve the offline invariant; learning capture on
  manual edit of auto-origin lines is intended.
- UI surfaces: mode toggle (`modeManualBtn`/`modeAutoBtn`) visible in both
  modes; manual toolbar revealed when `body` is not `app-auto`; new Copy Image
  button near Export PDF; `⌘⇧C` shortcut (does not clash with `⌘C` copy line).

## Validation

Durable proof status via `scripts/bin/harness-cli story update` is **skipped**:
`scripts/bin/harness-cli` is absent on this machine, so this file is the
record of proof status. Backfill the CLI row if/when the binary is available.

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run build` then `npm run check` (parse/wiring validation) pass after every `src/` edit. |
| Integration | Headless suites green: `invariants`, `contract`, `golden`, `pipeline-tests`, `junction-tests`, `autosave-check`, `smoke`. Reconcile any suite that asserts `appMode === 'auto'` after Apply or that applied lines are locked. |
| E2E | In-browser steps from `manual mode plan.md` §9: Apply → auto-switch to Manual with manual toolbar; edit line/endpoint/label with one undo entry each; `⌘C`/`⌘V` duplicate and `M` reflect; Copy Image / `⌘⇧C` pastes a whole-board PNG into an external app; toggle back to Auto; Save then Open reopens in Manual with editable lines. |
| Platform | n/a — single-platform offline browser tool (clipboard PNG requires a `ClipboardItem`-capable browser; graceful toast on failure). |
| Release | n/a — no release pipeline; deliverable is the rebuilt `app.js` + `index.html`. |

## Harness Delta

- `scripts/bin/harness-cli` is not present on this machine; the story and
  decision rows expected by `docs/stories/README.md` and
  `docs/decisions/README.md` could not be registered. Recorded in files only.

## Evidence

TBD — add suite output and browser verification notes after the parallel
implementation lands and validation runs.
