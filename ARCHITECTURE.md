# Architecture — Bra Auto Measure

_The project map. How the pieces fit, how data flows, and how the app is
built. For **why** the project exists see [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md);
for **what** it measures see [`POMS_CONTRACT.md`](POMS_CONTRACT.md); for
**how to run it** see [`README.md`](README.md)._

---

## 1. One-paragraph overview

The app is a single-page, fully offline browser tool. `index.html` holds the
layout, CSS, and the `<script>` tags; `app.js` holds all logic. `app.js` is
**generated** — it is the concatenation of ~50 files under `src/` (plus the
rule JSON, inlined) produced by `npm run build`. At runtime the app takes a
bra sketch image and runs it through three offline phases — **detect → seed
anchors → generate POMs** — wrapped by an optional **learning** layer and a
**local persistence** layer. Nothing is sent to a server.

## 2. Runtime load order (`index.html`)

Scripts load in this order before the app boots:

1. `opencv_free_api.js` — dependency-free fallback vision API (`FreeOpenCVAPI`).
2. `vendor/opencv-4.x-20260603.js` — pinned OpenCV.js WASM (~11 MB, WASM
   embedded), loaded `async` so it never blocks first paint and detection stays
   offline.
3. `opencv_real_api.js` — wrapper (`RealOpenCVAPI`) over the vendored WASM
   build; if it is still compiling or unavailable, `getCvApi()` transparently
   falls back to `FreeOpenCVAPI`.
4. `potrace.js` — raster-to-vector tracing helper.
5. `app.js` — the built bundle; its final line calls `init()`.

Fixed rule data is loaded by `src/auto/rules/load-rules.js` from
`auto_mode_rules/*.json` at startup, with the build-time **inlined** copy
(`BUILTIN_AUTO_MODE_RULE_JSON`) as a fallback when the JSON can't be fetched
(e.g. `file://`).

## 3. The pipeline (data flow)

```mermaid
flowchart TD
    IMG[Sketch image added\npaste / drop / button] --> DET

    subgraph P1[Phase 1 · Detect · offline]
        DET[runOfflineDetection\nsrc/auto-detection.js] --> CV{OpenCV WASM ready?}
        CV -- yes --> REAL[RealOpenCVAPI\nopencv_real_api.js]
        CV -- no --> FREE[FreeOpenCVAPI\nopencv_free_api.js\ndeterministic ink mask]
        REAL --> JUNC[detectJunctions\nsrc/auto/detect/junctions.js]
        FREE --> JUNC
        JUNC --> DRES[Detection result:\nbbox · symmetry axis · band line\nviews front_outer / front_inner / back\nquality]
    end

    DRES --> SEED

    subgraph P2[Phase 2 · Anchors]
        SEED[seedAnchorsFromDetection\nsrc/auto/anchors/seed-anchors.js\nschema-driven] --> DERIVE[derive-anchors.js\ndrop_to_line etc.]
        DERIVE --> ANCH[Anchors\nnormalized 0..1 in image space]
        ANCH --> DRAG[TD drags to correct\nsrc/auto/anchors/anchor-interaction.js]
    end

    DRAG --> GEN

    subgraph P3[Phase 3 · Generate POMs]
        GEN[generatePOMDraftsFromAnchors\nsrc/auto/drafts/generate-pom-fixture.js] --> VAL[validateAutoFixture\nvalidate-fixture.js]
        VAL --> BUILD[buildDraftAnnotation\nbuild-draft-annotation.js]
        BUILD --> APPLY[draft-actions.js\nauto-apply 18 POM lines]
    end

    APPLY --> RENDER[Render\nsrc/render/render-loop.js\n+ detection-overlay.js + anchor-pins.js]
    APPLY --> SAVE[(Project JSON\nsrc/project/project-save.js + project-load.js)]

    DRAG -. residuals .-> LEARN
    APPLY -. accepted/edited .-> LEARN
    subgraph L[Learning · optional · localStorage]
        LEARN[calibration-store · acceptance-stats\nmeaning-store · style-evidence-record]
    end
    LEARN -. median bias on next seed .-> SEED
```

The three phases correspond directly to the schema and rules: detection
produces a bbox and a **view classification** (`front_outer` / `front_inner` /
`back`); seeding walks `anchor-schema.json` to place each anchor (some are
_derived_, e.g. `drop_to_line` projects a point vertically onto the band line);
generation reads anchor positions and emits the 18 POM rows defined in
`pom-template.json`. Anchors are stored in **normalized `[0,1]` image space**
so they survive pan, zoom, resize, and save.

## 4. Module map (`src/`)

`src/` is grouped by role. Order of concatenation is declared once in
[`scripts/source-parts.mjs`](scripts/source-parts.mjs) — parts share one IIFE
scope, so a part must appear after anything it references.

| Group | Files | Responsibility |
|---|---|---|
| **Rules & state** | `auto/rules/load-rules.js`, `state.js`, `dom-refs.js`, `project/grade-rules.js`, `bootstrap.js`, `dev/url-bootstrap.js` | Load rule JSON; hold global app state (`state.js`); DOM element registry (`dom-refs.js`); grade-rules v2 + custom-POM data model (`project/grade-rules.js`); `init()`/vision-engine warm-up (`bootstrap.js`); `?label=`/`?project=`/`?autoDraft=` test-and-demo boot paths (`dev/url-bootstrap.js`). `state.js` must stay positioned right after `load-rules.js` — its top-level `const RULES = loadAutoModeRules();` runs at parse time, not hoisted. |
| **Geometry** | `curves.js`, `geometry/math.js` | Curve and vector math shared across phases. |
| **Detection** | `auto-detection.js`, `auto/detect/junctions.js` | Offline image analysis; view classification; junction/endpoint/corner detection. |
| **Anchors** | `auto/anchors/seed-anchors.js`, `derive-anchors.js`, `anchor-interaction.js` | Seed anchors from detection; derive dependent anchors; drag/reset interaction. |
| **Drafts (POM gen)** | `auto/drafts/generate-pom-fixture.js`, `build-draft-annotation.js`, `validate-fixture.js`, `draft-actions.js` | Anchors → 18-row fixture → validated → draft annotations → applied. |
| **Learning** | `auto/learning/calibration-store.js`, `shadow-detection.js`, `acceptance-stats.js`, `meaning-store.js`, `meaning-commit.js`, `style-evidence-record.js`, `style-evidence-capture.js`, `style-evidence-reuse.js` | Residual calibration (median bias, `calibration-store.js`) + shared shadow-redetect utilities (`shadow-detection.js`); accept/edit stats; (style,POM) meaning catalog (`meaning-store.js`) + the manual-line-to-meaning workflow spanning all three stores (`meaning-commit.js`); TD-edit style evidence — durable store (`style-evidence-record.js`), save-time capture (`style-evidence-capture.js`), generate-time reuse/bias (`style-evidence-reuse.js`). All local. |
| **Telemetry** | `auto/telemetry/session-stats.js`, `session-timer.js` | Detect-to-POM timing/session summaries. |
| **Auto mode** | `auto/mode.js`, `auto/debug-api.js`, `auto/debug-export.js` | Mode switching (Auto ↔ Manual); `debug-api.js` is just the `window.__braAutoModeDebug` object literal — the export/summary builders it calls (ground truth, CV debug, stage summary) live in `debug-export.js`. |
| **Project** | `project/history.js`, `project-save.js`, `project-load.js`, `autosave.js`, `project-library.js`, `ui/dialogs/autosave-restore-banner.js` | Undo history; save/open JSON (`project-save.js`/`project-load.js` — projects with applied lines reopen in Manual Mode); debounced autosave engine (`autosave.js`) + its restore-banner UI (`ui/dialogs/autosave-restore-banner.js`); library. |
| **Render** | `render/viewport.js`, `render/render-loop.js`, `render/detection-overlay.js`, `render/anchor-pins.js`, `render-annotations.js`, `render-images.js`, `render-stitches.js`, `render/copy-image.js`, `hit-testing.js` | Pointer/viewport math (`viewport.js`); canvas draw loop (`render-loop.js`); read-only detection diagnostic overlay (`detection-overlay.js`); draft lines + draggable anchor pins (`anchor-pins.js`); annotations, hit-testing. `copy-image.js`: Copy Image — renders the whole board (sketch + lines/labels, content bounds) to an offscreen canvas and puts a PNG on the clipboard, offline. |
| **UI** | `ui/bindings.js`, `spec-panel.js`, `main-page.js`, `ui/construction-phrase-data.js`, `ui/construction.js`, `ui/bom-material-data.js`, `ui/bom.js`, `ui/page-nav.js`, `toast.js`, `ui/dialogs/*` | DOM wiring, measurements panel, toasts, dialogs. `main-page.js`: the tech pack MAIN PAGE sheet — style metadata, suggestion pickers, colorways, printable page. Style metadata only: no anchor, no POM, so detection never reads it ([ADR 0037](docs/decisions/0037-main-page-sheet-port.md)). `construction.js` (+ `construction-phrase-data.js`'s ported phrase/term library): the Construction annotation page — numbered callout notes with leader lines dropped onto the board's own sketch images, plus a quick-search phrase panel; a note's `targets`/`textPos` are normalized to its *owning image's own rect*, a different convention from the anchor `[0,1]`-of-whole-image one. Metadata only: no anchor, no POM, so detection never reads it ([ADR 0039](docs/decisions/0039-construction-annotation-page.md)). Notes also carry a `variant` (`'solid'`/`'lace'`, toolbar-tab-scoped rendering + independent per-variant `seq` numbering), a `zone` (the 7-value `CC_ZONES` garment taxonomy, keyword-defaulted, purely descriptive — nothing downstream reads it), and `targets` (1+ anchors per note; leader lines are drawn from the label box's own edge to each anchor with an arrowhead, and a double-click on one anchor removes just that leader line) ([ADR 0040](docs/decisions/0040-construction-lace-solid-leader-lines.md)). `bom.js` (+ `bom-material-data.js`'s ported 27-material suggestion library): the BOM page — a shared FABRIC/TRIM row list (`scope`: `BOTH`/`SOLID`/`LACE`, same toolbar-tab convention as Construction's variants) rendered as an editable table with one column per `state.mainPage.colorways` entry (finally consuming what ADR 0037 called "knowingly inert"), plus a "material key" canvas annotation that forks Construction's exact multi-anchor/edge-leader-line/arrowhead/double-click-delete engine under a `bm*` prefix to place numbered callouts, linked to table rows, on the board's own sketch images. A project's *first-ever* BOM materializes as the reference factory sheet's exact 12-row BOM (`BM_SEED_ROWS`, verbatim from `Tech pack Output/TechPack output.html`'s `#pack-data` `bom.rows`; one-shot, guarded by `bom.seedId` so a TD-emptied table stays empty — US-074). Metadata only: no anchor, no POM, so detection never reads it ([ADR 0041](docs/decisions/0041-bom-annotation-and-table.md)). `page-nav.js`: the tab bar that switches between tech-pack pages (Board, MAIN PAGE, Construction, BOM) — owns the one `TECH_PACK_PAGES` registry and `state.activePage` (session-only, like `state.selectedImageIds`) ([ADR 0038](docs/decisions/0038-page-navigation-model.md)). |
| **Manual** | `manual/*`, `import/*`, `ui/dialogs/pptx-picker-dialog.js`, `render/export-pdf.js`, `render/export-xlsx-grading.js`, `render/xlsx-writer.js`, `render/export-spec-xlsx.js`, `render/export-techpack-xlsx.js` | Manual editing toolset (drag/reshape, shortcuts, copy/paste, reflect, styles, export); hidden in Auto, active after the post-Apply handoff or via the mode toggle. Export Excel — writes the Measurement Spec `.xlsx` (18 POM rows, 14-column graded size run per `Grading rules.md`, board PNG embedded) with a hand-rolled STORE-method ZIP writer, fully offline: grading math (`export-xlsx-grading.js`), the generic OOXML+ZIP toolkit (`xlsx-writer.js`), the single-sheet export incl. `buildSpecSheetRows` — the one shared builder the tech-pack workbook also calls (`export-spec-xlsx.js`), and the 6-sheet tech-pack workbook (`export-techpack-xlsx.js`). |

## 5. The mode contract (Auto-first, Manual handoff)

This is a fork of the "How to measure1" assistant. It boots **Auto-first**, and
after "Apply Lines" it hands off to **Manual Mode** so the TD can correct the
applied lines (see `docs/decisions/0008-reenable-manual-mode.md`). The mode
behaviour is deliberately localized:

- `auto/mode.js` — `setAppMode()` / `requestAppModeChange()` switch between
  `'auto'` and `'manual'`.
- `bootstrap.js` — `init()` boots via `setAppMode('auto')`; initial state is auto.
- `auto/drafts/draft-actions.js` — after the atomic commit in
  `applyApprovedDraftsAtomically`, switches to Manual Mode.
- `project/project-load.js` — reopened projects that contain applied lines open
  in Manual Mode.
- `auto/drafts/generate-pom-fixture.js` — Generate auto-applies (no per-row
  approval on a clean apply); tests keep the review path via the
  `keepDraftsForReview` option.
- `index.html` — manual controls carry the `manual-only` class, hidden only in
  Auto (`body.app-auto`); the Manual/Auto toggle is visible in both modes.
- `render/copy-image.js` — Copy Image (toolbar button / `⌘⇧C`): whole board →
  PNG to the clipboard, fully offline.

The Approve / Review-Only / Apply / Discard controls only surface when an
auto-apply fails (e.g. duplicate POM rows on one image), so drafts stay on the
board for row-by-row resolution.

## 6. Build model

```
src/*.js  (order: scripts/source-parts.mjs)
   +  auto_mode_rules/*.json  (inlined as BUILTIN_AUTO_MODE_RULE_JSON)
   ─────────────────────────────────────────────  npm run build
                    │   (scripts/build-app.mjs wraps parts in one IIFE,
                    │    parse-validates with `new Function`, appends init())
                    ▼
                 app.js  ──loaded by──▶  index.html
                    │                        ▲
                    └── content hash ────────┘
                        (app.js?v=<hash> cache-buster, kept in sync)
```

**Never edit `app.js` directly** — it is regenerated and your change would be
lost. Edit the relevant `src/*` part, then `npm run build`. `npm run check`
rebuilds and parse-validates every part in isolation plus the standalone
`opencv_*` / `potrace` files.

The build also rewrites the `<script src="app.js?v=…">` cache-buster in
`index.html` to a **content hash of the bundle**. This is what makes a shipped
fix actually reach browsers: a static `?v=` served every rebuild's fresh
`app.js` under the same URL, so browsers and the GitHub Pages CDN kept serving
the stale cached copy. The hash changes only when `app.js` changes, and
`npm run check` fails if `index.html`'s buster is out of sync — so `index.html`
is a build output too, not hand-edited for the version string.

## 7. Data & persistence

- **Rule data** (`auto_mode_rules/`): `pom-template.json` (the 18 POMs, EN + ZH
  labels, anchor pairs, pairing, confidence tiers), `anchor-schema.json` (anchor
  kinds, groups, hints, derivations), `version.json` (template/rule/anchor
  versions). These are the versioned contract; the learning loop never edits them.
- **Project files**: JSON via `project-save.js`/`project-load.js` — the durable artifact a user saves.
- **Local browser storage** (`localStorage`): learning buckets
  (`bra.learning.v1`), acceptance stats (`bra.autoAcceptance.v1`), meanings,
  style evidence, and autosave. All device-local; clearing it resets learning.

## 8. Key invariants (things that must stay true)

- Anchors are always normalized `[0,1]` in source-image pixel space.
- Every POM belongs to exactly one review/apply placement view (`front_outer` /
  `front_inner` / `back`). POM 14 is the measurement-path exception:
  `view: front_to_back`, placed for review as `placementViewRole: back`.
- The 18-POM set is fixed and versioned (extended 16 → 18 by ADR 0032);
  changing it is a contract change.
- Learning is **optional, measurable, resettable**, and never mutates rule JSON.
- No network call carries sketch or measurement data (offline by design).
- `app.js` is generated output, not source.

See [`TESTING.md`](TESTING.md) for the suites that guard these.
