# Bra Auto Measure — Project Charter

_Status: Living document · Last updated 2026-07-27 (reconciled against the
accepted decision record and the shipped feature set)_

> The machine-readable source of truth for what the tool measures is
> [`auto_mode_rules/pom-template.json`](auto_mode_rules/pom-template.json);
> the operating manual is [`README.md`](README.md) and
> [`POMS_CONTRACT.md`](POMS_CONTRACT.md). This charter sits above them and
> answers _why the project exists and what "done" looks like_.
>
> Where this charter and an accepted decision in
> [`docs/decisions/`](docs/decisions/) disagree, **the decision wins** and this
> file is the thing that needs updating. The scope statements below were last
> reconciled against ADRs 0008–0036 on 2026-07-27.

---

## 1. Vision

Turn a flat bra technical sketch into a complete, review-ready **measurement
spec** in seconds, entirely on the technical designer's own machine — no cloud,
no manual line-drawing, no measurement IP leaving the browser. The tool should
feel like a fast, opinionated first draft that a technical designer corrects
rather than a blank canvas they build from scratch.

"Review-ready spec" has two halves, and they are held to different standards:

- **The lines.** All 18 POM lines placed on the right landmarks, automatically.
  This is the part the tool is expected to get right on its own.
- **The values.** A defensible Size L proposal per POM, carrying its evidence —
  derived from the sketch's own geometry where the sketch can be trusted,
  anchored to the library corpus where it cannot. The tool **suggests; it never
  assigns** ([ADR 0009](docs/decisions/0009-measurement-suggestion-engine.md)),
  and the TD owns the final number
  ([ADR 0027](docs/decisions/0027-td-owned-size-l-finalization.md)).

## 2. Problem statement

Producing a measurement spec from a bra sketch is slow and manual. A
technical designer (TD) reads the flat, decides where each of the 18 POMs
belongs across the front-outer, front-inner, and back views, and draws
every line by hand. The work is repetitive, easy to do inconsistently
between people and styles, and hard to audit. Existing measurement tools
still centre on manual annotation, and cloud-based vision would put
proprietary sketch artwork on someone else's servers.

This project removes the blank-canvas step. It detects the sketch offline,
seeds the anchors that drive all 18 POMs, and generates the lines
automatically, leaving the TD to verify and nudge rather than draw. It is
a focused fork of the "How to measure1" Bra Measurement Assistant: the same
detection engine and drafting pipeline, boots **Auto-first**, and after the
lines are applied it hands off to a **Manual Mode** so the TD can make the
small fixes the auto pass can't get perfect (see
[`docs/decisions/0008-reenable-manual-mode.md`](docs/decisions/0008-reenable-manual-mode.md)).

**Auto Mode remains the priority.** The point of the tool is that the auto
pass gets so close the TD rarely has to touch a line; every roadmap
investment goes into making auto better (§8). Manual Mode is the bounded
correction step after auto — not a return to blank-canvas drawing — and the
app never boots into it on a fresh sketch.

## 3. Objectives

The project is judged against six objectives, in priority order:

1. **Correctness (geometry)** — auto-seeded anchors land close enough to the
   true landmarks that a TD rarely has to move them.
2. **Speed** — get from "image added" to "lines applied" in one short,
   uninterrupted pass.
3. **Privacy** — all detection, learning, and storage stay on the local
   machine; no sketch or measurement data is transmitted.
4. **Consistency** — the same sketch yields the same lines every run, and
   different styles are measured by the same rules.
5. **Defensibility (values)** — every number the panel shows can be traced to
   its source. A numeric proposal carries its view, anchors, pixel length,
   scale source and decision
   ([ADR 0026](docs/decisions/0026-auditable-view-local-measurement-evidence.md));
   a library value is badged as such; a POM with no basis shows "no data"
   rather than a fabricated number. The TD resolves every POM to a final
   Size L ([ADR 0027](docs/decisions/0027-td-owned-size-l-finalization.md)).
6. **Improvement over time** — the tool learns from each TD correction so
   its seeds get better without changing the underlying rule data.

## 4. Users & stakeholders

- **Primary user:** the technical designer / product-development team who
  measures sketches and owns the resulting spec (Crossian measurement
  standard; POM names carry English + Chinese labels for factory handoff).
- **Downstream consumers:** anyone who reads the exported project — grading,
  tech-pack assembly, and factory communication.
- **Maintainers:** the engineers who own the detection engine, rules JSON,
  and test suites.

## 5. What the tool does today (current state)

The core engine, the Auto-first pipeline, and the post-Apply Manual handoff
are built and covered by tests. The pipeline runs in three offline phases
plus a learning layer:

- **Detect** — pure pixel analysis on the source image (bounding box,
  vertical symmetry axis, band line, and view classification into
  front-outer / front-inner / back), preferring the real OpenCV.js WASM
  backend when available and falling back to a deterministic offline ink
  mask. No model download or API call is required.
- **Seed anchors** — a schema
  ([`anchor-schema.json`](auto_mode_rules/anchor-schema.json)) drives anchor
  placement; positions are normalized `[0,1]` in the image's own pixel
  space so they survive pan / zoom / resize / save. Some anchors are
  _derived_ (e.g. dropping a point vertically onto the band line) rather
  than detected.
- **Generate drafts** — anchor positions are turned into 18 POM fixture
  rows, validated, and applied to the project in place, with no per-row
  approval step. Rows without a reliable line are demoted to REVIEW_ONLY,
  stripped of geometry, and dropped with a note naming the missing anchors.
  POMs 9 / 10 / 17 / 18 are measured on a **front-inner** view when the board
  has one, whether that is a separate photo or a third panel in a single photo
  ([ADR 0034](docs/decisions/0034-cup-neckline-armhole-poms-measure-on-front-inner-when-present.md),
  [ADR 0035](docs/decisions/0035-single-photo-three-view-board-support.md)).
- **Learn (optional)** — after each correction the tool records the
  detected→corrected residual per `(anchor kind × view role)` and applies
  the running median as a bias on future seeds. The loop is optional
  (toggle persisted locally), measurable (sample counts and medians are
  inspectable), and resettable (one-click clear). It never edits the rule
  JSON and nothing leaves the browser.
- **Hand off to Manual (correction)** — after the lines are applied the
  app switches to Manual Mode so the TD can fix what auto didn't nail: drag /
  reshape / relabel / delete a line, multi-select, copy/paste, reflect, and copy
  the whole board to the clipboard as a PNG. A visible Manual/Auto toggle returns
  to Auto (e.g. to re-detect). All offline; edits feed the learning loop.
- **Propose a value (Tier 0)** — each POM's Size L and default TOL are
  pre-filled from a corpus-derived median, shown muted with a
  "library · <confidence>" badge and a provenance tooltip. Suggestions are a
  display fallback in `getPomSpec()`, never persisted, always overridable; POMs
  with no corpus rows show "no data" instead of a number
  ([ADR 0009](docs/decisions/0009-measurement-suggestion-engine.md)). A drawn
  line reports its own length in real units once the TD sets a board scale.
  **Mode B** — the sketch × library fusion that would derive the value from the
  detected geometry — is implemented and flag-gated **off**, pending per-POM
  validation against ground truth
  ([ADR 0033](docs/decisions/0033-mode-b-library-sketch-fusion.md)).
- **Grade and export** — the TD sets a per-POM grade rule (step / hold) in the
  Grading dialog, previews the graded run, and exports a Measurement Spec
  `.xlsx`: 15-size run (8 alpha + 7 depth columns), live formulas, imperial
  fractions, and the board PNG embedded — written offline by a hand-rolled ZIP
  writer. Hidden POMs are excluded from the export entirely
  ([ADR 0010](docs/decisions/0010-hidden-poms-excluded-from-export.md)).
- **Persist** — projects save/open as JSON; a project that already has applied
  lines reopens in Manual Mode, ready to edit. Autosave and
  acceptance/telemetry stats are captured locally.

Build model: source lives under `src/*` and is concatenated into `app.js`
by `npm run build` — `app.js` is never edited directly. Fixed POM, anchor,
and rule data live in `auto_mode_rules/*.json`.

## 6. Scope

**In scope**

- Offline detection, anchor seeding, and automatic generation of the fixed
  set of 18 POMs across the three defined views. **This is the priority** —
  the roadmap invests here so the auto pass needs less correction over time.
- Manual anchor correction (drag / reset) during the Auto pass.
- **Manual Mode as the post-Apply correction step** — after the lines are
  applied, the TD can fix them in place (drag / reshape / relabel / delete),
  copy/paste, reflect, and copy the board as a PNG, with a visible Manual/Auto
  toggle. It exists to correct the auto output, not to draw specs from scratch.
- **Measurement values as TD-owned suggestions** — pre-filled Size L / TOL with
  visible provenance, per-POM override, and "no data" where the corpus is
  silent. Suggest, never assign (ADR 0009 / 0026 / 0027).
- **Grade rules and the graded size run inside the exported spec** — per-POM
  step / hold, the 15-size run, and the `.xlsx` writer (US-011,
  [ADR 0018](docs/decisions/0018-custom-poms-extend-contract.md)). This is
  spec output, not a grading product; see the non-goal below.
- **Custom POMs (19+)** as project-local extensions of the contract — Manual
  lines the TD draws and labels, with full spec-panel / grading / export
  parity. They never enter the rule JSON and the auto pipeline never drafts
  them (ADR 0018, renumbered by
  [ADR 0032](docs/decisions/0032-extend-pom-core-range-to-18.md)).
- The local learning loop, acceptance stats, and Detect-to-POM telemetry.
- Local project save/open (JSON) and autosave.
- Test suites for stability, correctness, and pipeline/contract invariants.

**Out of scope (non-goals)**

- **Manual-first / blank-canvas authoring** — the app never boots into Manual
  Mode on a fresh sketch and is not a general drawing tool. Manual Mode is
  entered only after the auto Apply, by the toggle, or by reopening a project
  with applied lines; auto detection stays the entry point and the priority.
- **Cloud or API dependencies** — no server-side detection, no uploading of
  sketches, no external model calls at runtime. Manual-mode features
  (including Copy Image) stay fully offline.
- **Changing the measurement definition casually** — the 18 POMs and their
  anchor pairs are a versioned contract; the learning loop tunes seeds, not
  rules. Widening the core range is possible but is a deliberate decision with
  a full ripple map (ADR 0032 took 16 → 18), never an ad-hoc edit.
- **Assigning a measurement** — the tool proposes and shows its evidence; it
  never commits a number on the TD's behalf, and it never overwrites an
  override. This was an explicit reversal of the original "the tool never
  waits for the TD" proposal (ADR 0009).
- **Grading as a product** — per-POM grade rules and the graded size run in the
  exported spec are **in scope** (above). What stays out: a grading engine the
  TD manages outside a project, size-chart authoring, and any grade rule the
  house standard does not already define.
- **Tech-pack assembly or fit recommendation** — those are adjacent tools, not
  this one.
- **A general image annotator** — the tool is specific to bra sketches and
  this POM set.

## 7. Success metrics

Correctness and stability are measured separately, because "stable" and
"correct" are different questions:

- **Seed accuracy (geometry correctness).** Scored by `npm run accuracy`
  against human-placed TD ground truth. Target: anchors land within the
  **tight** tolerance (≈2% of image dimension — "a TD would not bother touching
  it") for the high-confidence POMs, and within the **loose** tolerance (≈4% —
  "a small nudge fixes it") for medium-confidence POMs.
- **Value accuracy (defensibility).** Scored by `npm run measurement-accuracy`:
  per-POM absolute error in inches against TD-confirmed ground truth, gated by
  a one-sided regression ratchet (mean 0.01 in, max 0.02 in, per-POM 0.02 in).
  A Mode B POM may only be promoted once its fused value beats library-only on
  that suite. **This metric is currently unmeasurable** — every ground-truth
  file is still `draft_pending_td`, so the gate reports and does not score.
  Producing TD-confirmed ground truth is M3.
- **Correction rate.** Share of generated POM lines accepted without an
  edit, tracked by the local acceptance stats. Trend should rise as the
  learning loop accumulates samples.
- **Time to applied lines.** Detect-to-POM session time from telemetry; the
  headline speed number, kept short and interruption-free.
- **Determinism (stability).** `npm run golden` shows zero unexpected drift
  vs. the self-seeded baseline; `npm run check`, `contract`, and
  `invariants` stay green on every change.
- **Privacy invariant.** No network calls carry sketch or measurement data;
  verified by design (offline engine) and code review.

## 8. Milestones

**Delivered**

- M0 — Offline detection engine, schema-driven anchors, and POM
  generation working end to end (`npm run smoke` on demo images).
- M1 — Auto-first fork: fresh load boots Auto, Generate-Drafts auto-applies
  the lines. (Originally shipped as an auto-only lock; the manual UI was
  hidden but forked in.)
- M2 — Learning loop, acceptance stats, and telemetry in place; full test
  suite (golden, contract, invariants, pipeline, junction, meaning,
  evidence, learning, autosave).
- M2.5 — Manual Mode handoff (ADR 0008): after Apply the app switches to
  Manual so the TD corrects the applied lines in place; visible Manual/Auto
  toggle; projects with applied lines reopen in Manual; offline Copy Image.
  The auto pipeline, determinism, and offline invariant are unchanged.
- M2.6 — **Spec output.** Tier-0 library suggestions (ADR 0009), per-POM grade
  rules and the graded size run, the offline `.xlsx` Measurement Spec export
  with the board PNG embedded, hidden-POM exclusion (ADR 0010), and custom
  POMs as project-local extensions (ADR 0018).
- M2.7 — **Contract widened to 18.** Neckline length (17) and armhole curve
  length (18) became first-class auto-detected POMs, with custom numbering
  moved to 19+ (ADR 0032); cup / neckline / armhole POMs now measure on a
  front-inner view when the board has one, including three-panel single-photo
  boards (ADRs 0034, 0035).
- M2.8 — **Detection recovery tiers.** POM 6 junction / crest / projection
  tiers and POM 7 guide / arc tiers, each review-flagged and barred from
  feeding the shared cup model — no anchor left unrecoverable in the labelled
  corpus (ADRs 0021, 0022, 0023).

**Next**

- M3 — **Ground truth, both kinds.** (a) Grow TD-labelled *anchor* ground truth
  beyond the demo set so `accuracy` is meaningful per POM and per view, and
  label 171 / 172 / 181 / 182 on several demos — POMs 17 and 18 are currently
  scored on one image whose labels are marked `pendingRefinement`. (b) Produce
  the first `td_confirmed` *measurement* ground truth so
  `measurement-accuracy` can score at all. **(b) blocks M5.**
- M4 — **Calibrate tolerances.** Set the tight/loose bands from real TD-drag
  residuals rather than the current provisional 0.02 / 0.04 defaults.
- M5 — **Turn on sketch-derived values.** Promote Mode B POM by POM as each
  one beats library-only on TD-confirmed ground truth (ADR 0033), and condition
  the library prior on detected construction type so a pooled median stops
  standing in for styles it does not describe (see §9).
- M6 — **Raise the hard POMs.** Close the gap on the anchors that are missing
  their declared tier — shoulder strap (POM 14, low by contract) plus back
  panel / back strap (POMs 13, 15) and the right cup apex (POM 16), all
  currently 2–2.5× past the tight tolerance.
- M7 — **Rollout & feedback.** Put the tool in front of TDs, watch
  correction rate and Detect-to-POM time, and feed corrections back through
  the learning loop.

## 9. Risks & mitigations

- **Detection quality on real production sketches** (vs. clean demos) — line
  weight, labels, and multi-view layouts vary. _Mitigation:_ grow the
  ground-truth corpus (M3), keep the offline ink-mask fallback deterministic,
  and lean on manual correction as the guaranteed backstop.
- **Straps and back-view POMs stay unreliable** — inherently hard to detect.
  _Mitigation:_ confidence tiers flag them for review first; the learning
  loop targets them; POM 14 is documented as always-verify.
- **Learning loop overfits or drifts** — a bad correction corpus could bias
  seeds the wrong way. _Mitigation:_ optional / measurable / resettable by
  design, median (not mean) bias, and it never touches the rule JSON.
- **A pooled library median stands in for a style it does not describe** — the
  Tier-0 suggestion is one median per POM across all closures and
  constructions, and it is shown before an image is even added. Back centre
  length (POM 12) is 3.0–3.75 in on structured back-closure styles but 5.5–8.0
  on soft / full-back ones; the pooled prior is 3.75 with a 2–7.24 range, which
  describes neither. _Mitigation:_ the value is badged "library" with its
  sample count and range, and is never persisted — but the real fix is
  conditioning the prior on detected construction type (M5). See
  [`docs/notes/measurement logic.md`](docs/notes/measurement%20logic.md).
- **The value gate cannot fail** — `measurement-accuracy` is fully built but
  has no `td_confirmed` ground truth, so no regression in a numeric value can
  be caught, and Mode B cannot be promoted because its promotion criterion
  depends on that suite. _Mitigation:_ M3(b) is the unblock, and Mode B stays
  flag-off until it exists rather than shipping unvalidated.
- **A permanently-red gate stops being a gate** — golden, contract and accuracy
  can sit red on newly-labelled-but-unbaselined images, training everyone to
  ignore them. _Mitigation:_ triage genuine failures and re-seed baselines with
  `--update` in one reviewed change, rather than letting red accumulate.
- **Fork drift from the reference app** — shared engine could diverge.
  _Mitigation:_ the Auto-first / Manual-handoff mode contract is localized to
  a documented short list of files (see `ARCHITECTURE.md` §5 and decision
  0008); contract and invariant tests guard the boundary.
- **Manual Mode scope creep** — reintroducing the manual toolset invites
  treating the app as a drawing tool. _Mitigation:_ Manual is scoped as the
  post-Apply correction step; auto stays the entry point and the priority
  (§6), and the app never boots into Manual on a fresh sketch.
- **Single build artifact discipline** — editing `app.js` directly would
  silently diverge from `src/`. _Mitigation:_ documented build step and
  `npm run check` wiring verification.
- **Fixed 18-POM contract vs. evolving needs** — a future style may need a
  different measurement. _Mitigation:_ treat the POM set as a versioned
  contract (`version.json`); styles needing fewer use the hidden-POM toggle
  (ADR 0010), styles needing more use custom POMs 19+ (ADR 0018), and widening
  the core range is a decision with a full ripple map (ADR 0032) — never ad hoc.

## 10. Guiding principles

Offline by default; the TD corrects, the tool never overrides; **suggest, never
assign** — and show the evidence behind every number; refuse rather than guess,
so a POM with no basis is flagged for review instead of given a plausible value;
rules are fixed and auditable while learning only nudges; every measurement
change is a versioned contract change; and correctness is proven against human
ground truth, not against the tool's own output.
