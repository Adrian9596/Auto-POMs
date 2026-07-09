# 0008 Re-enable Manual Mode (Auto-first with Post-Apply Handoff)

Date: 2026-07-08

## Status

Accepted

## Context

This repo is an Auto-only fork of the "How to measure1" assistant. The
documented auto-only contract (CLAUDE.md, ARCHITECTURE.md §5) deliberately
locked the app to Auto Mode: `setAppMode` coerced every request to `'auto'`,
reopened projects were re-coerced to Auto, and the manual UI was hidden via the
`.manual-only` CSS class. The manual toolset itself (drag/reshape, shortcuts,
copy/paste, reflect, styles, export) was forked in and compiled into `app.js`,
just inert.

In practice the TD's job does not end at auto-generation: the 16 auto-applied
POM lines need verification and correction, and the Auto-only lock left no way
to edit an applied line. The TD confirmed the desired behavior (locked
decisions in `manual mode plan.md` §3).

## Decision

Deliberately change the auto-only contract to **Auto-first with a Manual Mode
handoff**:

- **Unlock the 4 coercion points** (`manual mode plan.md` §5): drop the
  `mode='auto'` overwrite in `setAppMode` and the non-auto guard in
  `requestAppModeChange` (`src/auto/mode.js`); keep the `appMode:'auto'`
  initial default in `src/state.js` (auto-first); stop re-coercing loaded
  projects to Auto in `src/project/project-io.js`.
- **Post-Apply handoff:** after the atomic commit in
  `applyApprovedDraftsAtomically` (`src/auto/drafts/draft-actions.js`), switch
  to Manual Mode. A visible Manual/Auto toggle remains in both modes so the TD
  can return to Auto.
- **Reopen in Manual:** saved projects that contain applied lines open in
  Manual Mode, ready to edit.
- **Copy Image** (the only net-new feature): `src/render/copy-image.js` renders
  the whole board (sketch + lines/labels, content bounds) to an offscreen
  canvas and puts a PNG on the clipboard via `canvas.toBlob` →
  `ClipboardItem` — fully offline. Exposed as a toolbar button and `⌘⇧C`.
- **Learning capture is intended:** the learning loop capturing TD edits of
  auto-origin lines in Manual Mode is by design, per the fork's learning model.

What is preserved, unchanged:

- **Auto-first fresh load** — auto detection remains the point of the tool.
- **The 16-POM auto pipeline** — no rule JSON, anchor schema, or geometry
  changes; determinism (`npm run golden`) unaffected.
- **The offline invariant** — no network call carries sketch or measurement
  data; Copy Image is clipboard-only.
- **Learning never mutates rule JSON** — it still only biases anchor seeds.

## Alternatives Considered

1. Keep the Auto-only lock and treat corrections as anchor re-drags plus
   re-generation. Rejected: it cannot fix an individual applied line, and the
   full manual toolset already exists in the fork.
2. Hand off to the parent "How to measure1" app for manual editing (export /
   reimport). Rejected: breaks the single-tool offline workflow and duplicates
   project state.
3. Boot into Manual Mode by default. Rejected: the tool is auto-first by
   charter; Manual is entered by the post-Apply handoff, project reopen, or
   the toggle.

## Consequences

Positive:

- The TD can verify and correct all 16 auto lines in place with the existing
  manual toolset (mostly an unlock, not new code).
- The learning loop gains real correction signal from manual edits of
  auto-origin lines.
- Whole-board PNG export via clipboard, with no new network surface.

Tradeoffs:

- The documented auto-only localization set is obsolete; CLAUDE.md and
  ARCHITECTURE.md are updated alongside this record.
- Test suites on the `applyApprovedDraftsAtomically` critical path may assert
  post-Apply `appMode === 'auto'` or locked applied lines and must be
  reconciled (re-run `invariants`, `contract`, `golden`, `pipeline`,
  `junction`, `autosave-check`, `smoke`).
- Manual Mode reintroduces UI surface (shortcuts, tools) that the Auto-only
  docs no longer have to explain away but tests must now cover.

## Follow-Up

- Story packet:
  `docs/stories/epics/E01-manual-mode/US-001-reenable-manual-mode.md`.
- `scripts/bin/harness-cli decision add` is **skipped**: the CLI binary is
  absent on this machine. Backfill the durable decision row when available.
- Confirm during validation that no suite pins the post-Apply mode, and record
  evidence in the story packet.
