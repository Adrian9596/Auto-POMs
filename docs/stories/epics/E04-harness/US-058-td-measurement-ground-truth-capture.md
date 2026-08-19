# US-058 TD measurement ground-truth capture

## Status

planned

## Lane

normal

Risk flags: **weak proof** (the measurement gate currently scores nothing), **existing
behavior** (touches the `?label=1` labeler and the Measurements panel). No auth,
authorization, data-loss, audit, or external-provider flags → normal, not high-risk.

## Product Contract

A TD can record **real measured Size-L values** for a sketch from inside the app and
save them as measurement ground truth, so that `npm run measurement-accuracy` becomes
an active gate instead of a report, and Mode B POMs can be promoted on evidence.

## Why this is the blocker (verified 2026-07-26)

The plumbing is **already complete**. This runs today and works:

```sh
node test/tools/measure-demos.mjs --out=run.json
node scripts/measurement-accuracy-tests.mjs --measured=run.json
```

The gate reads the corpus and reports:

```text
ground-truth files: 3 (0 td_confirmed, 3 draft_pending_td)
scored 0 td_confirmed POM value(s) across 0 image(s)
No td_confirmed ground truth to score yet — gate inactive (drafts are report-only).
```

So the earlier belief that "Stage 1 has not wired `--measured`" is **wrong** — that
work exists. The single blocker is that **no ground truth is `td_confirmed`**:

- all 3 files in `scripts/groundtruth/measurements/` are `labeledBy: claude_draft`;
- they hold **identical library medians** across three different styles
  (POM 1/3/5/9/10 = `14 / 17 / 5.5 / 8 / 8` on demo1, demo3 and demo5 alike);
- POM 7 — one of only three Mode B readiness candidates — has **no entry at all**.

There is also a trap worth stating: because those drafts *are* library medians,
`|library − GT| = 0`, so fusion can never beat library-only. Ground truth must be
**independently measured**, not copied from the library, or the promotion gate is
unwinnable by construction.

ADR 0036 adds a second consumer: `inner-cup-left` / `inner-cup-right` anchor GT is now
stale by definition (the labels encode the superseded shared-row rule), so the same
capture session should re-drag those two anchors.

## Relevant docs

- `scripts/groundtruth/README.md` — corpus format + the `?label=1` anchor flow
- `docs/decisions/0009-measurement-suggestion-engine.md` — Tier-0 vs suggestion
- `docs/decisions/0033-mode-b-library-sketch-fusion.md` — what promotion gates
- `docs/decisions/0036-pom10-endpoints-own-height.md` — requires anchor re-labelling

## Acceptance Criteria

- Under `?label=1`, a second floating button **"💾 Save Measurement GT"** appears
  beside the existing "💾 Save Ground Truth".
- It serialises the **Measurements panel's current Size-L values** (the TD's typed
  numbers) to the `scripts/groundtruth/measurements/<image>.json` shape:
  `{ image, source, unit, labeledBy, notes, measurements: { <pom>: { value_in, tol_in } } }`.
- `source` is written as **`td_confirmed`**, and `labeledBy` is captured from the TD
  (prompt, default `td`). A draft is never silently promoted.
- `tol_in` comes from the POM template's TOL for that POM; a POM the TD left blank is
  **omitted**, never defaulted to a library median.
- Values are written as decimal inches regardless of the panel's fraction display.
- A POM whose panel value is still the **library suggestion** (untouched by the TD) is
  omitted, and the button reports how many POMs were skipped — this is the guard against
  re-creating the "GT == library median" trap.
- Saving with zero TD-entered values refuses with a toast rather than writing a file.
- `?label=1` behaviour is otherwise unchanged (view-role modal and autosave still
  suppressed; anchor save still works).

## Design Notes

- **UI surfaces:** `maybeShowGroundTruthLabeler` in `src/state.js:419` — add the second
  button next to the existing one (same fixed-position pattern, offset above it).
- **Commands:** new `exportMeasurementGroundTruth(imageName)` +
  `downloadMeasurementGroundTruth(name)` in `src/auto/debug-api.js`, mirroring
  `exportGroundTruth` / `downloadGroundTruth` (`src/auto/debug-api.js:18,47`).
- **Queries:** read per-POM values via `getPomSpec(pomKey)` (`src/ui/spec-panel.js:592`).
  It falls back to `suggestedSizeL(key)` when the TD has not typed anything — so the
  "was this TD-entered?" test must inspect the **raw** spec store, not `getPomSpec`'s
  resolved value.
- **Domain rules:** decimal inches on disk; the fraction display is presentation-only
  (US-048). Do not round.
- **Test hook:** expose `exportMeasurementGroundTruth` on `window.__braAutoModeDebug`
  so a headless test can assert the emitted shape without a download.
- Edit `src/*` then `npm run build`; never edit `app.js`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Emitted JSON matches the schema; blank POMs omitted; untouched-suggestion POMs omitted; `source: td_confirmed`; decimal (not fraction) values |
| Integration | `measurement-accuracy --measured=run.json` **scores > 0 POMs** once one file is `td_confirmed` (this is the criterion that proves the gate went live) |
| E2E | `?label=1&image=demo/demo3.jpg` → type values → Save → file lands in the corpus shape |
| Platform | n/a (offline browser only; no network — the offline invariant still holds) |
| Release | `npm run check`, `smoke`; `measurement-accuracy-selftest` still 5/5 |

## Harness Delta

- Closes backlog **#4**.
- Corrects `scripts/groundtruth/README.md`, which says scoring "needs a measured-value
  source (`--measured <file>`), which Stage 1 feeds" — that source **already exists** as
  `test/tools/measure-demos.mjs --out=`. Document the two-command recipe instead.
- Suggest adding an `npm run measurement-gate` script that chains both commands, so the
  wiring is discoverable rather than folklore.

## Evidence

- 2026-07-26: verified the gate is wired and inactive only for want of `td_confirmed`
  GT — `measure-demos.mjs --out=` produced values for 3 demos, and the gate consumed
  them and reported `scored 0 td_confirmed POM value(s)`.
- `measurement-accuracy-selftest` — 5/5 PASS (gate math already proven: improvement
  passes, regression fails, drafts never gate, promotion only on `td_confirmed`).
