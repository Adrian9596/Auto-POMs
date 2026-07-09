# Bra Auto Measure — Project Charter

_Status: Living document · Last updated 2026-07-07_

> The machine-readable source of truth for what the tool measures is
> [`auto_mode_rules/pom-template.json`](auto_mode_rules/pom-template.json);
> the operating manual is [`README.md`](README.md) and
> [`POMS_CONTRACT.md`](POMS_CONTRACT.md). This charter sits above them and
> answers _why the project exists and what "done" looks like_.

---

## 1. Vision

Turn a flat bra technical sketch into a complete, review-ready set of
point-of-measure (POM) lines in seconds, entirely on the technical
designer's own machine — no cloud, no manual line-drawing, no measurement
IP leaving the browser. The tool should feel like a fast, opinionated
first draft that a technical designer corrects rather than a blank canvas
they build from scratch.

## 2. Problem statement

Producing a measurement spec from a bra sketch is slow and manual. A
technical designer (TD) reads the flat, decides where each of the 16 POMs
belongs across the front-outer, front-inner, and back views, and draws
every line by hand. The work is repetitive, easy to do inconsistently
between people and styles, and hard to audit. Existing measurement tools
still centre on manual annotation, and cloud-based vision would put
proprietary sketch artwork on someone else's servers.

This project removes the blank-canvas step. It detects the sketch offline,
seeds the anchors that drive all 16 POMs, and generates the lines
automatically, leaving the TD to verify and nudge rather than draw. It is
a focused fork of the "How to measure1" Bra Measurement Assistant: the same
detection engine and drafting pipeline, boots **Auto-first**, and after the
16 lines are applied it hands off to a **Manual Mode** so the TD can make the
small fixes the auto pass can't get perfect (see
[`docs/decisions/0008-reenable-manual-mode.md`](docs/decisions/0008-reenable-manual-mode.md)).

**Auto Mode remains the priority.** The point of the tool is that the auto
pass gets so close the TD rarely has to touch a line; every roadmap
investment goes into making auto better (§8). Manual Mode is the bounded
correction step after auto — not a return to blank-canvas drawing — and the
app never boots into it on a fresh sketch.

## 3. Objectives

The project is judged against five objectives, in priority order:

1. **Correctness** — auto-seeded anchors land close enough to the true
   landmarks that a TD rarely has to move them.
2. **Speed** — get from "image added" to "16 lines applied" in one short,
   uninterrupted pass.
3. **Privacy** — all detection, learning, and storage stay on the local
   machine; no sketch or measurement data is transmitted.
4. **Consistency** — the same sketch yields the same lines every run, and
   different styles are measured by the same rules.
5. **Improvement over time** — the tool learns from each TD correction so
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
- **Generate drafts** — anchor positions are turned into 16 POM fixture
  rows and applied to the project in place, with no per-row approval step.
  Rows without a reliable line are dropped with a note.
- **Learn (optional)** — after each correction the tool records the
  detected→corrected residual per `(anchor kind × view role)` and applies
  the running median as a bias on future seeds. The loop is optional
  (toggle persisted locally), measurable (sample counts and medians are
  inspectable), and resettable (one-click clear). It never edits the rule
  JSON and nothing leaves the browser.
- **Hand off to Manual (correction)** — after the 16 lines are applied the
  app switches to Manual Mode so the TD can fix what auto didn't nail: drag /
  reshape / relabel / delete a line, copy/paste, reflect, and copy the whole
  board to the clipboard as a PNG. A visible Manual/Auto toggle returns to
  Auto (e.g. to re-detect). All offline; edits feed the learning loop.
- **Persist** — projects save/open as JSON; a project that already has applied
  lines reopens in Manual Mode, ready to edit. Autosave and
  acceptance/telemetry stats are captured locally.

Build model: source lives under `src/*` and is concatenated into `app.js`
by `npm run build` — `app.js` is never edited directly. Fixed POM, anchor,
and rule data live in `auto_mode_rules/*.json`.

## 6. Scope

**In scope**

- Offline detection, anchor seeding, and automatic generation of the fixed
  set of 16 POMs across the three defined views. **This is the priority** —
  the roadmap invests here so the auto pass needs less correction over time.
- Manual anchor correction (drag / reset) during the Auto pass.
- **Manual Mode as the post-Apply correction step** — after the 16 lines are
  applied, the TD can fix them in place (drag / reshape / relabel / delete),
  copy/paste, reflect, and copy the board as a PNG, with a visible Manual/Auto
  toggle. It exists to correct the auto output, not to draw specs from scratch.
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
- **Changing the measurement definition** — the 16 POMs and their anchor
  pairs are a fixed contract; the learning loop tunes seeds, not rules.
- **Grading / size-run generation, tech-pack assembly, or fit
  recommendation** — those are adjacent tools, not this one.
- **A general image annotator** — the tool is specific to bra sketches and
  this POM set.

## 7. Success metrics

Correctness and stability are measured separately, because "stable" and
"correct" are different questions:

- **Seed accuracy (correctness).** Scored by `npm run accuracy` against
  human-placed TD ground truth. Target: anchors land within the **tight**
  tolerance (≈2% of image dimension — "a TD would not bother touching it")
  for the high-confidence POMs, and within the **loose** tolerance (≈4% —
  "a small nudge fixes it") for medium-confidence POMs.
- **Correction rate.** Share of generated POM lines accepted without an
  edit, tracked by the local acceptance stats. Trend should rise as the
  learning loop accumulates samples.
- **Time to 16 lines.** Detect-to-POM session time from telemetry; the
  headline speed number, kept short and interruption-free.
- **Determinism (stability).** `npm run golden` shows zero unexpected drift
  vs. the self-seeded baseline; `npm run check`, `contract`, and
  `invariants` stay green on every change.
- **Privacy invariant.** No network calls carry sketch or measurement data;
  verified by design (offline engine) and code review.

## 8. Milestones

**Delivered**

- M0 — Offline detection engine, schema-driven anchors, and 16-POM
  generation working end to end (`npm run smoke` on demo images).
- M1 — Auto-first fork: fresh load boots Auto, Generate-Drafts auto-applies
  the 16 lines. (Originally shipped as an auto-only lock; the manual UI was
  hidden but forked in.)
- M2 — Learning loop, acceptance stats, and telemetry in place; full test
  suite (golden, contract, invariants, pipeline, junction, meaning,
  evidence, learning, autosave).
- M2.5 — Manual Mode handoff (decision 0008): after Apply the app switches to
  Manual so the TD corrects the applied lines in place; visible Manual/Auto
  toggle; projects with applied lines reopen in Manual; offline Copy Image.
  The auto pipeline, determinism, and offline invariant are unchanged.

**Next**

- M3 — **Accuracy corpus.** Grow TD-labelled ground truth beyond the demo
  set so `accuracy` scores are statistically meaningful per POM and per view.
- M4 — **Calibrate tolerances.** Set the tight/loose bands from real TD-drag
  residuals rather than the current provisional 0.02 / 0.04 defaults.
- M5 — **Raise the hard POMs.** Close the gap on low/medium-confidence
  anchors — shoulder strap (POM 14, the only low tier) and the non-front
  views (POMs 9–13, 15) that also depend on correct view classification.
- M6 — **Rollout & feedback.** Put the tool in front of TDs, watch
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
- **Fixed 16-POM contract vs. evolving needs** — a future style may need a
  different measurement. _Mitigation:_ treat the POM set as a versioned
  contract (`version.json`); changes are deliberate, not ad hoc.

## 10. Guiding principles

Offline by default; the TD corrects, the tool never overrides; rules are
fixed and auditable while learning only nudges; every measurement change is
a versioned contract change; and correctness is proven against human ground
truth, not against the tool's own output.
