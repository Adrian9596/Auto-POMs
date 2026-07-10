# Testing — Bra Auto Measure

The suites answer four different questions: **does it build**, **does it run**,
**is it correct**, and **did it change**. Knowing which question a suite answers
tells you when to run it. All commands are `npm run <name>` and live in
`scripts/`.

---

## Quick guide: what to run when

- **After any `src/` edit:** `build` → `check` → `smoke`.
- **After a detection / anchor change:** add `invariants`, `contract`, and
  `golden` (re-baseline with `golden --update` only when the change is
  intentionally better, confirmed by `accuracy`).
- **After a learning / meaning / evidence change:** the matching subsystem suite.
- **Before shipping:** the full set.

`check`, `pipeline-tests`, `junction-tests`, and `export-hidden` need no browser.
The rest drive a headless Chrome over raw CDP (zero npm deps); `accuracy`
additionally needs labelled ground truth and a local Chrome install.

## The suites

| Command | Question it answers | What it does | Runner |
|---|---|---|---|
| `check` | Does it build & wire? | Rebuilds `app.js`, then parse-validates every `src/` part in isolation plus the standalone `opencv_*` / `potrace` / script files. | Node, parse-only |
| `smoke` | Does it run end to end? | Headless Auto Mode run on `demo/demo1.jpg`; asserts the pipeline completes and the output is structurally sound. | Chrome CDP |
| `golden` | **Did output change?** (stability) | Runs detection on **every** `demo/*.jpg` and diffs anchors (by kind), draft count, per-POM **draft-line geometry** (start/end/control points, normalized to the source image — guards the fixture→draft path that anchor drift can't see), and `detection.quality` against committed per-image baselines. Fails on drift. `--update` re-seeds baselines; `GOLDEN_TOL` overrides tolerance. | Chrome CDP |
| `accuracy` | **Is it correct?** | Scores detector seeds against **human-placed TD ground truth** in `scripts/groundtruth/`. Lower is better. Bands: tight ≈0.02 ("a TD wouldn't touch it"), loose ≈0.04 ("a nudge fixes it"), normalized image units. Pins the deterministic offline detector for reproducibility. | Chrome CDP + ground truth |
| `invariants` | Are structural properties intact? | Checks properties that must hold with no ground truth: geometry (A1–A6), cup bounds (B1–B4), visibility (D1–D3), across all demos. Complements `golden` (change) and `accuracy` (correctness). | Chrome CDP |
| `contract` | Are the fragile POMs semantically right? | Semantic checks (aligned to the POM contract in `POMS_CONTRACT.md`) for the 6 hard front-view POMs — 6, 7, 8 (cradle/cup heights), 9, 10 (inner cup), 16 (apex) — on every demo. | Chrome CDP |
| `pipeline-tests` | Are the pure stages correct? | Loads `app.js` into a Node VM with DOM stubs and feeds each detection stage a fixed synthetic input; asserts on returned shape and per-stage timing. No Chrome. | Node VM |
| `junction-tests` | Is the junction detector correct? | Drives `detectJunctions` with synthetic masks of known topology (cross = 1 junction + 4 endpoints, L = 1 corner, …) on thin **and** thick strokes (covers Zhang–Suen thinning). No Chrome. | Node VM |
| `learning-tests` | Does the calibration loop behave? | Exercises residual recording / bias via `__braAutoModeDebug.learning`: 5 consistent corrections activate bias; OFF blocks collection; duplicate samples ignored; large residuals rejected; reset clears buckets. | Chrome CDP |
| `meaning-tests` | Is meaning-aware learning scoped right? | (style, POM) meaning catalog: Style A vs B don't collide; reconfirm re-opens the popover; cancel records nothing; Manual Mode unlock works (`setAppMode('manual')` switches for real and drawing-tool shortcuts activate); Reset Learning vs Reset Meanings stay separate. | Chrome CDP |
| `evidence-tests` | Does style evidence capture work? | `__braAutoModeDebug.styleEvidence`: empty summary well-formed; add/list(newest-first)/forget; after apply + simulated TD edit, candidates carry normalized coords and commit persists; a TD-deleted POM records confirmed-absent evidence. | Chrome CDP |
| `autosave-check` | Does autosave/restore work? | Injects a state edit, waits for the debounced autosave, reloads, and asserts the restore banner appears and Restore recovers the annotation. | Chrome CDP |
| `export-xlsx` | Is the Excel spec export right? | Seeds a fixture project (image + Size L / L2 / TOL specs), builds the workbook with a frozen date via `__braAutoModeDebug.exportSpecXlsxBase64`, unzips it in Node, and asserts: all OOXML parts present, header row exactly `POM…5XL2`, alpha grade math (Δ-from-L), depth grade math (L2 offset + Δ-from-L2, explicit Size L2 wins), held POMs flat, POMs with **no library value + no line** (15/16) blank, TOL/中文 written as text, embedded PNG valid, and two same-date exports byte-identical (determinism). | Chrome CDP |
| `export-hidden` | Do hidden POMs stay out of export surfaces? | Boots `app.js` in a Node VM, seeds applied POM lines, hides some via `__braAutoModeDebug.setHiddenAnnIds`, and asserts the exported sheet drops each hidden POM's **whole row** (paired 1/2 & 3/4 drop together) and renumbers the remaining rows contiguously. It also checks the shared export image path used by PDF, Copy Image, and Excel embedded PNG only draws visible POMs. See [ADR 0010](docs/decisions/0010-hidden-poms-excluded-from-export.md). | Node VM |
| `suggestions-tests` | Is the Tier-0 library-value layer right? | Validates `auto_mode_rules/sizeL-suggestions.json` shape (POMs 1–14 carry a corpus median, 15/16 are "no data"); regenerates from `../Measurements 2` and byte-compares when the corpus is present (skips cleanly otherwise); and in headless Chrome asserts the panel pre-fills Size L / TOL from each suggestion with a "library" badge, a no-data POM shows blank + a "no data" badge, and a TD override wins and reverts. Regenerate the JSON with `npm run generate-suggestions`. See [ADR 0009](docs/decisions/0009-measurement-suggestion-engine.md). | Node + Chrome CDP |
| `library-l0-tests` | Are the governed library foundations internally consistent? | Validates the complete Phase L0 folder/schema/artifact inventory, parses all library JSON, checks manifest and POM-registry structure, recomputes live POM/anchor SHA-256 fingerprints, enforces immutable POM numbering 1–17, mirrors the fixed 1–16 contract, keeps POM 17 inactive, guards pending/approved aliases, and verifies enums, size membership, and disabled similarity ranking. | Node, dependency-free |
| `pom6-limitations` | Where is POM 6 still weak? | Diagnostic matrix for POM 6 (cradle height at center front). Hard-fails only on clear regressions: a clean horizontal CF cradle seam must draw; no seam / a too-short decorative CF tick must stay `REVIEW_ONLY`. A frame with a strong bottom-cup seam (POM 7) but no CF seam must now **draw** via the `cradleCfFromCupSeam` seed fallback (projected to the CF axis, low-confidence + `reviewRequired`) — a hard `DRAWABLE` guard. Surfaces `cradleCfTop` / `cradleCupTop` presence in each reason line. | Synthetic |
| `pom7-limitations` | Where is POM 7 still weak? | Diagnostic matrix for POM 7. Hard-fails only on clear regressions (e.g. drawing POM 7 with no vertical POM 7 ink); known weak spots print as `LIMITATION` so they guide tuning **without** making CI red. | Synthetic |
| `pom14-limitations` | Is POM 14's curved strap-length contract intact? | Diagnostic matrix for POM 14 (shoulder strap). Asserts the **contract**, not detection strength: on a front+back sketch POM 14 draws as a curved line from the front strap upper joining seam to the back strap end, stays low confidence, and remains an always-verify POM; on a front-only sketch it refuses to guess and demotes to `REVIEW_ONLY` because the back end is absent. | Synthetic |
| `viewrole-limitations` | Is back-view classification intact? | Diagnostic matrix for multi-view role classification (the back POMs 11/12/13/15 depend on it). Hard guards: a single centered symmetric blob must **not** be read as a back view; a separated symmetric-front + asymmetric-center-seam-back layout must identify a back view. Ambiguous near-identical blobs print as `LIMITATION` (expect `viewRoleReviewRequired`). | Synthetic |
| `detection-limitations` | Run all four detection matrices | Aggregate runner: `pom6` → `pom7` → `pom14` → `viewrole` limitations in sequence. Any hard-case regression fails the whole run; `LIMITATION` lines stay non-fatal. | Synthetic |

The four `*-limitations` suites share their headless machinery — the DOM stub,
rule-fixture loader, VM pipeline load, ink-canvas builder, staged
detect→seed→fixture run, and the `PASS`/`FAIL`/`LIMITATION` reporter — from
`scripts/lib/synthetic-detection.mjs`. A suite only owns its synthetic
mask-builders and its `cases[]`. Each case declares either `hardExpected`
(asserted; a mismatch is a `FAIL` and exits non-zero) **or** `knownLimitation`
(printed as `LIMITATION`, always non-fatal) — so a suite never bakes in an
expectation for behavior that is a known weak spot rather than a contract.

## Stability vs. correctness (important distinction)

- **`golden` = stable.** It compares against the tool's *own* previous output.
  Green means "nothing changed," which can be a *stable wrong answer*.
- **`accuracy` = correct.** It compares against a *human's* corrected anchors.
  This is the only suite that can say the detector is actually right.

So a detection change that lowers `accuracy` error but trips `golden` is a
**good** change — verify with `accuracy`, then re-baseline `golden --update`.
Never re-baseline golden to silence a regression you haven't checked against
accuracy or invariants.

## Ground truth (for `accuracy`)

Produced by the in-app labeling flow: open `index.html?label=1`, add the image,
Detect Sketch, drag every anchor onto the true landmark, click **Save Ground
Truth**, and drop the file in `scripts/groundtruth/<image-basename>.json`.
Growing this corpus beyond the demo set is milestone **M3** in the charter and
the prerequisite for calibrating the tolerance bands (**M4**).
