# Architecture

This is the harness architecture view: the boundary rules and discovery notes an
agent should honor before changing code. The **detailed project map** (pipeline
phases, module table, data-flow diagram, build model) lives in the repo-root
[`../ARCHITECTURE.md`](../ARCHITECTURE.md). Read that first for the full picture.

## Product surfaces & stack

- **Surface:** a single browser page. `index.html` (layout/CSS) + `app.js`
  (all logic). No server, no backend, no build-time bundler beyond a concat step.
- **Stack:** vanilla JavaScript in one IIFE. OpenCV.js WASM is self-hosted from
  `vendor/` for offline/pinned detection, with a dependency-free fallback;
  `potrace.js` is used for tracing.
- **Runtime:** fully offline. No network call carries sketch or measurement data.

## Core domains

- **Detection** — offline image analysis → bbox, symmetry axis, band line, and
  view classification (`front_outer` / `front_inner` / `back`).
- **Anchors** — schema-driven landmarks in normalized `[0,1]` image space; some
  are derived (e.g. `drop_to_line`). The TD drags to correct.
- **POMs** — the fixed 16 points of measure generated from anchor pairs.
- **Learning** — optional, local, resettable calibration that biases anchor
  seeds from TD corrections. Never mutates rule JSON.
- **Project** — save/open JSON, autosave, history.

## Boundary rule (parse-first)

Unknown data is normalized at its boundary before it enters the pipeline:

```text
source image / saved project JSON / rule JSON
  -> parse & normalize (anchors to [0,1], views classified)
  -> pipeline stages (detect -> seed -> generate)
  -> rendered overlay / saved project
```

Inner stages work with meaningful types (anchor kinds, view roles, POM ids from
`auto_mode_rules/*.json`), not re-validated raw values.

## Layering (this codebase)

```text
rules + state  (auto/rules, state.js)
   <- detection (auto-detection.js, auto/detect)
       <- anchors (auto/anchors)
           <- drafts / POM generation (auto/drafts)
               <- render + UI (render/*, ui/*)
learning + telemetry wrap the anchor→draft edges; project I/O persists.
```

Parts share one IIFE scope and are concatenated in the order declared in
[`../scripts/source-parts.mjs`](../scripts/source-parts.mjs). A part must appear
after anything it references.

## Dependency & change rules

- **`app.js` is generated output, not source.** Edit `src/*`, then `npm run
  build`. Never edit `app.js` directly.
- The **16 POMs** (`auto_mode_rules/pom-template.json`) and **anchor schema**
  (`anchor-schema.json`) are a versioned contract (`version.json`). Changing
  them is a decision — record it under `docs/decisions/`.
- **Mode behaviour is Auto-first with a Manual handoff** (decision 0008),
  localized to `src/auto/mode.js`, `src/state.js`, `src/project/project-io.js`,
  `src/auto/drafts/draft-actions.js`, the `manual-only` CSS in `index.html`,
  and `src/render/copy-image.js`. Fresh load boots Auto; after Apply the app
  hands off to Manual so the TD corrects the applied lines. Manual is the
  post-Apply correction step, not a fresh-load entry point — keep it that way.
- **Learning stays optional, measurable, resettable** and never writes rule JSON.

## Invariants (must hold)

- Anchors normalized `[0,1]` in source-image pixel space.
- Every POM has one review/apply placement view (`front_outer` / `front_inner`
  / `back`). POM 14 is the measurement-path exception: `view: front_to_back`
  with `placementViewRole: back`.
- Determinism: the same sketch yields the same lines (`npm run golden`).
- Offline: no sketch or measurement data leaves the browser.

Proof for these lives in the suites mapped by [`TEST_MATRIX.md`](TEST_MATRIX.md)
and detailed in [`../TESTING.md`](../TESTING.md).
