# US-003 Anchor Nudge, Loupe & Snap-to-Ink

## Status

implemented

## Lane

normal

_Intake (2026-07-08): change request implementing U1 + U2 from
`ENHANCEMENT_OPPORTUNITIES.md` ("correction ergonomics"). Risk flags: 1
(changes existing anchor-drag behavior); no hard gates. `scripts/bin/harness-cli`
is absent from the repo, so this file is the durable record._

## Product Contract

Correcting a detected anchor pin no longer requires precise mouse aim:

- **Arrow-key nudge (U1a)** — with a pin selected (click it), the arrow keys
  move it by exactly 1 source-image pixel; `⇧`+arrow moves 10. A burst of
  keystrokes commits as one correction (one learning residual, one
  `anchor_nudged` telemetry event) ~0.7 s after the last key.
- **Magnifier loupe (U1b)** — while a pin is dragged or nudged, a circular
  inset beside it shows the sketch at 4× the current view with a crosshair on
  the pin's exact position, so the TD aims roughly and confirms in the loupe.
- **Snap-to-ink (U2)** — releasing a dragged pin pulls it onto the nearest
  ink pixel of the detection mask within ~12 screen px; holding `⌥` (Alt)
  while releasing places it freely. Nudge never snaps (arrows are deliberate).
  During a drag the loupe marks where the snap would land.

## Relevant Product Docs

- `ENHANCEMENT_OPPORTUNITIES.md` §3 U1, §4 U2 (plan of record)
- `POMS_CONTRACT.md` / `auto_mode_rules/anchor-schema.json` (unchanged)

## Acceptance Criteria

- Click a pin → arrows nudge 1 px, `⇧`-arrows 10 px, clamped to `[0,1]`;
  arrow keys are untouched while typing in a field or with no pin selected.
- Derived-anchor pinning, the cascade re-derive, and band/chest draft sync
  behave identically for drag, nudge, and snap (single `moveAnchorBy` path).
- Drag release snaps to ink only when the detection belongs to the pin's
  image and ink exists within tolerance; already-on-ink and `⌥`-release are
  no-ops; a one-time toast teaches the `⌥` override.
- Loupe renders only during an active drag/nudge, flips near canvas edges,
  and disappears afterwards.
- One learning residual + one telemetry event per drag commit
  (`anchor_dragged`) and per nudge burst (`anchor_nudged`).

## Design Notes

- `src/auto/anchors/anchor-interaction.js` — `moveAnchorBy` (extracted from
  the `drag-anchor` branch of `onMouseMove`), nudge session
  (`nudgeSelectedAnchor` / `flushAnchorNudgeSession` / `activeNudgeAnchorId`),
  `snapAnchorToInk`, snap-hint toast. `startAnchorDrag` flushes a pending
  nudge session so residual origins never blend.
- `src/manual/interactions.js` — drag branch delegates to `moveAnchorBy`;
  `onMouseUp(e)` snaps before the residual capture; arrow-key branch in
  `onKeyDown` after the in-field guard.
- `src/auto-detection.js` — `applyPotraceContoursToDetection` now retains the
  binary ink mask as `detection.inkMask/inkMaskW/inkMaskH` (session-only,
  ~1 byte per sample px; detection is never persisted or snapshotted).
- `src/render/render-auto-overlay.js` `drawAnchorLoupe`, called from
  `render-loop.js` after `drawAnchors`. `src/ui/dialogs/help-dialog.js`
  documents both shortcuts. No new source part; `app.js` regenerated.
- **Latent bug fixed in passing:** the drag-commit learning capture was gated
  on the history-snapshot fingerprint, but anchors (and drafts) are not part
  of snapshots — so `recordAnchorResidual` and the `anchor_dragged` telemetry
  event (counted by `auto/telemetry/session-stats.js`) never fired from a
  pure anchor drag. The capture is now gated on `interaction.changed`.

## Invariants preserved

- Anchors normalized `[0,1]` (every move goes through `clamp01`).
- Determinism: seeding/generation unchanged; snap/nudge run only on TD input,
  which headless suites never produce; snap is nearest-pixel with fixed
  row-major tie-breaking. `npm run golden` green.
- Offline: no network; the mask never leaves the browser.
- Learning: still optional/measurable/resettable, one residual per commit,
  rule JSON untouched. 16-POM contract untouched.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit/Integration | `npm run check`, `npm run invariants` (143/143), `npm run contract` (490/490) |
| Determinism | `npm run golden` (PASS) |
| E2E | `npm run smoke` (PASS), `npm run learning-tests` (PASS); manual QA: nudge/loupe/snap/⌥-override on demo1 via preview |
| Platform | n/a (single-page browser tool) |
| Release | n/a |

## Harness Delta

- Friction (repeat of US-002): `scripts/bin/harness-cli` referenced by
  CLAUDE.md/AGENTS.md does not exist in the repo — intake and story rows
  cannot be recorded via the CLI.
