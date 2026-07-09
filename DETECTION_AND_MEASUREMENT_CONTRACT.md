# Detection & Measurement Logic Contract

_Status: normative + current-state audit · 2026-07-09 · builds on
[`POMS_CONTRACT.md`](POMS_CONTRACT.md), [`auto_mode_rules/anchor-schema.json`](auto_mode_rules/anchor-schema.json),
and [ADR 0009](docs/decisions/0009-measurement-suggestion-engine.md)._

## Why this file exists

Every anchor must have **its own logic** — a stated rule for where it goes and an
observable **evidence** signal that says it is right — and every measurement
number must have **its own story** — where the number comes from and the signal
that flags it when it is wrong. Nothing sits on the board "because the detector
put it there," and no number appears without a reason to trust it.

This is what stops the up/down churn. An anchor or a number changes only by
changing **its logic here** (and the test that guards it), never by a one-off
nudge that some other sketch then undoes. The fixed 16-POM contract and the
anchor schema are frozen; this file adds the *reasoning layer* on top of them.

Each entry is written as **target** (the logic and evidence it must satisfy) plus
a **Gap → close** line (where today's code already meets the target vs. what is
still reactive). The Gap lines together form the punch list in Part 3.

### How each entry reads

**Anchors** — `Is` (identity + view) · `Detect` (the deterministic rule) ·
`Evidence` (the signal + the test that gates it) · `Confidence` (tier / review
path) · `Gap → close`.

**POMs** — `Is` (name, view, anchor pair) · `Number` (how the value is produced) ·
`Story` (why the number is trustworthy) · `Watch` (the failure signal) ·
`Gap → close`.

Citations are `file:line` so any claim can be checked at the source.

---

## Shared model (read once)

### Detection substrate every anchor stands on

- **Ink mask + bbox.** `createInkMaskFromImage` → adaptive threshold (real OpenCV
  `opencv_real_api.js:133`, blockSize 15–45 / C=7; Otsu fallback
  `opencv_free_api.js:224`), `connectedComponentsWithStats` drops frame/specks,
  bbox padded ±1px (`auto-detection.js:596`).
- **Symmetry axis `axisX`.** Ink centroid refined by `refineAxisBySymmetry`
  (±5% bbox, maximizing mirror-fold match) (`auto-detection.js:610,4332`). Every
  CF / cup / back-center anchor hangs off this axis.
- **Band line `bandY`.** Strongest long-horizontal ink row in the bottom zone,
  snapped to the solid bottom edge (`auto-detection.js:636`). Highest-confidence
  horizontal signal; the drop target for derived anchors.
- **View roles.** `classifySketchViewRoles` / `scoreViewLayout`
  (`auto-detection.js:4117`) tag regions `front_outer` / `front_inner` / `back`;
  `front_inner` is only scored with ≥3 eligible views. This gate decides whether
  POMs 9/10 are `direct` or merely `inferred`, and whether the back POMs exist.

### Three states an anchor can be in

- **Detected** — placed on a real pixel signal (edge, seam, axis, extremum).
- **Derived** — computed from other anchors by an `anchor-schema.json`
  `derivation` (only `cf-bottom` and `cradle-cup-bottom`, both `drop_to_line`
  onto the band); re-projected by the cascade when a parent moves
  (`derive-anchors.js:110`). Dragging a derived anchor sets `derivedPinned` so the
  cascade stops overwriting it (`anchor-interaction.js:81`).
- **Seed-fallback / ratio** — no signal found, so a view-proportion guess is used
  (`inView(...)`). Every ratio/degraded seed is `reviewRequired`.

### Confidence & review (the consistency dial)

- Tier from signal strength: ≥0.5 `high`, ≥0.2 `medium`, >0 `low`
  (`seed-anchors.js:665`).
- `reviewRequired` = tier `low`, or source ∈ {`ratio`, `seamProjected`,
  `seamDip`, `cupRatioFallback`, `innerCupTopInkFallback`}, or a weak/inferred cup
  anchor (`seed-anchors.js:818`).
- **REVIEW_ONLY** (hard gate): a required anchor that cannot be seeded demotes its
  whole POM — the tool refuses to draw a line it cannot justify, rather than
  guessing. This is the rule that keeps a missing signal from becoming a
  confident-looking wrong line.

### How a number is produced today (Tier-0, "suggest — never assign")

Per [ADR 0009](docs/decisions/0009-measurement-suggestion-engine.md), the Size L
value shown/exported for a POM follows one ladder (`getPomSpec`,
`spec-panel.js:293`):

1. **TD override** — `state.pomSpecs[key].sizeL` if the TD typed one.
2. **Library median** — `POM_SUGGESTIONS[key].median` (POMs 1–14), from the
   corpus (`auto_mode_rules/sizeL-suggestions.json`, 225 style-versions).
3. **Blank** — POMs 15/16 (no corpus data).

An override that equals the suggestion is **not** saved (`spec-panel.js:328`), so
regenerating the corpus refreshes every untouched POM; only real TD edits persist.

The **measured-from-the-sketch** number is a *separate* column
(`measuredValueText`, `spec-panel.js:494`): drawn pixel length × board scale
(`state.calibration.unitsPerPx`), which the TD sets from one known line
(`scale-dialog.js:67`). Tier-0 never auto-sets the scale, so today the Size L
number is the **library median**, not the drawing — the sketch geometry only
feeds the tolerance check. (`sketch_reliable` per POM is stored but **unused** in
`src/` — it is the switch for Mode B, which is not shipped.)

### The failure signals a number can raise

- **`spec-delta` chip** (`spec-panel.js:517`) — needs a scale **and** a target.
  `measured − target` vs `±TOL`: green `✓ in`, red `✗ out`. The main "this number
  looks wrong" catch (drawn geometry vs library/override target).
- **`spec-conf` badge** (`spec-panel.js:380`) — `library · <confidence>` + tooltip
  "median of N samples · range min–max".
- **"no data" badge** — POMs 15/16.
- **Not yet live:** the `out_of_range` check (compare value to the library range)
  is **not implemented** — the range is tooltip text only (`spec-panel.js:399`).
  TOL type `min`/`max` is also ignored; the chip treats TOL as symmetric
  (`spec-panel.js:527`). Both are punch-list items.

### The two evidence layers already enforced by tests

Every anchor/number should map to at least one automated gate, so a regression is
caught by CI, not by a TD's eye:

- **`invariants`** (`scripts/invariant-tests.mjs`) — geometry A1–A6, cup bounds
  B1–B4, visibility D1–D3. Structural truths with no ground truth.
- **`contract`** (`scripts/pom-contract-tests.mjs`) — semantic per-POM checks
  (C6–C16) for the hard POMs, plus line-geometry checks (CLA.n) and level checks
  (HLN.n).
- **`golden`** (stability) and **`accuracy`** (correctness vs TD ground truth)
  bound drift and rightness across all demos.

The "Evidence" line of each entry names the gate that guards it. Entries whose
gate is "—" are the anchors/numbers with **no dedicated automated evidence yet**;
those are flagged in Part 3.

---

# Part 1 — Anchor logic (25 anchors)

## Axis group — CF column, front outer (drives POMs 5/6/7/8)

#### `cf-top` — CF top
- **Is:** top of the centre-front seam, on the symmetry axis. front_outer.
- **Detect:** topmost ink walking down the axis column, `findVerticalInkBound(dark, w, axisPx, halfColBand, …, +1)`, `halfColBand = max(2, 1.8%·bboxW)` (`auto-detection.js:824`); x pinned to `axisX`. Fallback `inView(f, 0.505, 0.485)` (`seed-anchors.js:317`).
- **Evidence:** on the symmetry axis at the highest CF-seam ink. Gate: `invariants` axis symmetry; POM 5 geometry.
- **Confidence:** `tier(det.axis, 'medium')` (`seed-anchors.js:685`).
- **Gap → close:** x is pinned to `axisX`, not to CF-seam ink x, so an asymmetric sketch drags the whole CF column sideways. Target: detect CF-seam x independently and only fall back to the axis. (`seed-anchors.js:316`)

#### `cf-bottom` — CF bottom
- **Is:** bottom of the CF seam, on the band. front_outer. **Derived.**
- **Detect:** schema `drop_to_line [cf-top, band-left, band-right]` (`anchor-schema.json:14`); cascade re-projects onto the band when cf-top or a band end moves (`derive-anchors.js:110`).
- **Evidence:** lies on the detected band line directly below cf-top. Gate: `invariants` (POM 5 vertical); derivation is exact by construction.
- **Confidence:** `tier(det.band, 'high')` (`seed-anchors.js:686`).
- **Gap → close:** if the band line is itself vertical the intersection is null and the anchor stays put (`derive-anchors.js:125`). Rare; document as a REVIEW_ONLY trigger.

#### `cradle-cf-top` — Cradle CF (POM 6 top, POM 8 end)
- **Is:** where the cradle/cup-bottom seam meets the CF axis. front_outer.
- **Detect:** horizontal cradle-seam run crossing the axis — `minBandRun 8` / `minSingleRun 5`, or `denseLocalInk ≥ 0.20 & run ≥ 3`, plus band-ink baseline ≥ 0.02 (`auto-detection.js:986`). Degraded paths: **seamDip** (symmetric gore bracket, `maxGorePx = 16%·bboxW`) and **seamProjected** (`cradleCfFromCupSeam`: project the POM 7 top onto the axis when no direct seam, `seed-anchors.js:93`).
- **Evidence:** real seam ink bridging the axis + band below. Gate: `contract` **C6.seam-source** (accepts `seamProjected`/`seamDip` **only** when `reviewRequired`), C6.start-on-axis.
- **Confidence:** `low` for seamProjected/seamDip else `tier(det.cradleCfTop,'medium')`, capped 0.19 (`seed-anchors.js:687`); degraded ⇒ `reviewRequired`.
- **Gap → close:** flaky on demo3/demo7 (`limitation.md:80`); missing both this and `cradle-cup-top` ⇒ POM 6/8 REVIEW_ONLY (no guess — correct).

#### `cradle-cup-top` — Cradle cup top (POM 7 top)
- **Is:** cup-bottom seam at the bottom-cup position, off-axis on the cup side. front_outer.
- **Detect:** per-side column sweep between `cfAxisBuffer = max(2·peakSep, 18%·bboxW)` and `sideBuffer = 3%·bboxW`; needs cradle-row ink (≥0.05) **and** band-row ink (≥0.05); rejects the side-seam impostor via `aboveMaxRatio 0.35` (`auto-detection.js:1050`). Seeded only if both cup-top and cup-bottom resolve.
- **Evidence:** cup-bottom seam ink with a band baseline beneath, on the cup side. Gate: `contract` **C7.seam-source** (`source:'seam'`, never ratio), C7.start-off-cf, C7.start-off-side-seam.
- **Confidence:** `tier(det.cradleCupTop, 'medium')` (`seed-anchors.js:690`).
- **Gap → close:** sparse dashed guides (dashGap ≥ 8) demote to REVIEW_ONLY (`pom7-limitations.mjs:147`); no horizontal-ratio fallback by design.

#### `cradle-cup-bottom` — Cradle cup btm (POM 7 bottom)
- **Is:** band baseline directly below the cup-bottom seam point. front_outer. **Derived.**
- **Detect:** schema `drop_to_line [cradle-cup-top, band-left, band-right]` (`anchor-schema.json:37`); seed comes from the same winner column at the band row (`auto-detection.js:1381`).
- **Evidence:** shares x with cradle-cup-top on the band row ⇒ POM 7 vertical. Gate: `contract` C7.vertical.
- **Confidence:** `tier(det.cradleCupBottom, 'medium')` (`seed-anchors.js:691`).
- **Gap → close:** no independent evidence — inherits the both-or-neither gate with cup-top. Acceptable (it is a projection).

## Band group — front outer (POMs 1/2)

#### `band-left` / `band-right` — Band L / R
- **Is:** the two ends of the underbust band line. front_outer.
- **Detect:** `findHorizontalInkBound` walking inward from each bbox edge along `bandEdgeRow`, `halfRowBand = max(2, 1.2%·bboxH)` (`auto-detection.js:820`). Fallback `inView(f, 0.063/0.936, 0.978)` (`seed-anchors.js:314`).
- **Evidence:** on the detected band line at its true ink end; band is the strongest horizontal signal. Gate: `invariants` (band level / POM 1 horizontal), `contract` CLA.1.
- **Confidence:** `tier(det.band, 'high')` (`seed-anchors.js:692`).
- **Gap → close:** falls to view-ratio when the walker finds no band-row ink; then `reviewRequired`. Fine as long as the ratio path is flagged (it is).

## Chest group — front outer (POMs 3/4)

#### `chest-left` / `chest-right` — Chest L / R
- **Is:** the two ends of the chest / underbust seam line. front_outer.
- **Detect:** prefer the **underbust seam** (widest solid-ink span row, `rowSpan ≥ max(20, 70%·bboxW)`, solidity `runFrac` beats fragmented lace) over the upper-chest row; endpoints via `findHorizontalInkBound` (`auto-detection.js:696`). Fallback `inView(f, 0.004/0.990, 0.615/0.605)`.
- **Evidence:** the POM 3 line is a solid seam, so solidity picks it over a wide lace band. Gate: `invariants` (level), `contract` CLA.3 + HLN.3.
- **Confidence:** `tier(det.chest, 'medium')` (`seed-anchors.js:694`).
- **Gap → close:** can latch the wrong horizontal row on lace-heavy fronts; then `reviewRequired`. Target: strengthen seam-vs-lace scoring (`auto-detection.js:706`).

## Cup group — cup height & width, measured on the front (outer) cup (POMs 9/10)

> **Corrected 2026-07-09 (TD).** POMs 9/10 are **cup height** and **cup width**,
> measured on the cup **as drawn on the front (outer) view**. Most sketches show
> only front + back — there is usually **no separate inner-cup view** — so the
> tool must **not** require or assume one. The legacy "inner cup" naming (anchor
> kinds `inner-cup-*`, group `inner-cup`, POM view `front_inner`) makes the
> detector hunt for an inner cutaway that isn't there and then flags its absence
> as a problem — exactly the confusion this removes. A `front_inner` cutaway,
> when a sketch does include one, is a *bonus* the detector may use, **never a
> precondition**.

All four are the cup's extreme points from one shared `cupModel` (`buildCupModel`,
`auto-detection.js:3389`) via `innerCupFromCupModel` (`seed-anchors.js:205`),
contour-refined by `applyContourInnerSeam`. Cup **side** = apex confidence → POM 7
seam side → default left; all four share a `cupModelId`. A genuinely undetectable
cup (`hidden`) legitimately demotes POM 9/10 to REVIEW_ONLY (invariant D1–D3) —
but a **missing `front_inner` view must not**, because that is the normal
front+back sketch and the cup is read from the front. *(Schema kinds are still
`inner-cup-*` — a legacy misnomer flagged in Part 3.)*

#### cup-top — POM 9 start *(schema kind `inner-cup-top`)*
- **Is:** top of the cup (the apex) on the front cup. Not dependent on a front_inner view.
- **Detect:** `cupModel.topPoint` — y = apex row, x = apex x when `topFromApex`, else cup-centre column (`auto-detection.js:3685`); fallbacks legacy `innerCupTopInk` → view-ratio.
- **Evidence:** on the detected apex. Gate: `invariants` **A1/A2** (POM 9 rise > run, top above bottom), **B1** (on the picked cup side).
- **Confidence:** `cupTier` (`seed-anchors.js:679`).
- **Gap → close:** it is flagged `reviewRequired` for **two** reasons — (a) no real apex (`!topFromApex`, `seed-anchors.js:816`), which is **legitimate, keep**; and (b) merely because a `front_inner` view is absent (cupModel `inferred` capped `medium`; test `C9.review-when-no-front-inner`), which is **wrong**. Target: a front cup with a real apex is full confidence with or without an inner cutaway.

#### cup-bottom — POM 9 end *(schema kind `inner-cup-bottom`)*
- **Is:** bottom of the cup, on the cup-bottom seam, on the front cup.
- **Detect:** `cupModel.bottomPoint` — y = POM 7 seam (same side) else traced underwire arc (`support ≥ 0.30`) else flat cradle row; x = apex-biased centre clamped between the width endpoints (`auto-detection.js:3456`).
- **Evidence:** on the cup-bottom seam. Gate: `invariants` **A5** (bottom x between POM 10 ends).
- **Confidence:** `cupTier` weighting seamConfidence 0.7 (`seed-anchors.js:704`).
- **Gap → close:** `reviewRequired` when the bottom is only a flat cradle row (no seam/ink) (`seed-anchors.js:815`) — legitimate, keep — but **not** merely for lack of a front_inner view.

#### cup-left / cup-right — POM 10 width *(schema kinds `inner-cup-left` / `-right`)*
- **Is:** the gore-side and armhole-side edges of the cup at mid-height, on the front cup. Smaller-x is always assigned **left**.
- **Detect:** `cupModel.innerEdge` (gore inset `max(axisPad, 0.8%·w)` extended out to `findCupInnerSilhouettePx`) and `outerEdgeNearArmhole` (side-seam inset extended out) (`auto-detection.js:3696`); inner endpoint snapped onto a traced panel contour by `applyContourInnerSeam` when valid.
- **Evidence:** span the cup's full width at mid-y. Gate: `invariants` **A3** (share row), **A4** (left < right), **B2/B3/B4** (inside cup half, clear of CF axis > 0.5%·w and side seam > 0.3%·w).
- **Confidence:** `cupTier` (contour+seam blend) (`seed-anchors.js:707`).
- **Gap → close (documented):** cup-right sticks at the gore inset on **line-only** cups with no closed panel contour and solid gore ink blocking the inward scan (`limitation.md:32`); contours run *after* `buildCupModel` (`limitation.md:114`). Independent of the inner-view issue.

## Apex group — front outer (POM 16)

#### `apex-left` / `apex-right` — Apex L / R
- **Is:** the strap→cup join seam on each side (top of the cup), **not** the bust/nipple point. front_outer.
- **Detect:** `findCupStrapJoinFromInk` per side (upper-outer run scan, `guard = max(4, 7.5%·bboxW)` off axis, `verticalSpan ≥ 40%·window` to reject bows, conf ≥ 0.32) → `validateCupApexPair` (right > left + 12%·bboxW, |Δy| ≤ 22%·bboxH, both conf ≥ 0.32) (`auto-detection.js:2753`). Seeded only if both sides pass.
- **Evidence:** a symmetric, bounded strap-join pair with cup body below. Gate: `contract` **C16.source-cup-curve** (`apexJoin`, never strap-ring hardware), C16.both-sides, C16.both-above-chest.
- **Confidence:** `tier(det.apex*, 'medium')` (`seed-anchors.js:715`).
- **Gap → close (by design):** apex = strap-join, shared with POM 9 top (`limitation.md:95`). Either side missing ⇒ POM 16 REVIEW_ONLY. Keep.

## Strap group — POM 14 shoulder-strap length (the only contractually low anchors)

> **Corrected 2026-07-09 (TD).** POM 14 is the shoulder-strap **length**, so its
> two ends are where the strap physically attaches: the **cup-top join** (front)
> and the **back-panel join** (back). The old "strap-top = where the strap meets
> the shoulder" was wrong — the shoulder is the mid-fold of the strap, not an
> attachment point, so it does not bound the strap length. See the ⚠️ cross-view
> note under POM 14 in Part 2.

#### `strap-top` — Strap top (strap ↔ back-panel join)
- **Is:** the **outer line where the shoulder strap joins the back panel**, on the **back** view — the far end of the strap-length measurement. **Not** the shoulder mid-fold.
- **Detect (target):** the strap→back-panel seam on the back view. The detector already has the right idea in `findBackStrapTopFromInk` (topmost ink in the back strap zone, `auto-detection.js:2970`), but it only runs when a **back view is classified** (`auto-detection.js:1451`); the default/front path still seeds the front shoulder point from `findStrapLandmarksFromInk` (`auto-detection.js:2919`; seed `seed-anchors.js:81`), which is the wrong landmark.
- **Evidence:** sits on the strap↔back-panel join seam on the back view. Gate: `contract` **pom14** (always seeds, never high confidence) — but **no check asserts it is the back-panel join** rather than the shoulder. Add one.
- **Confidence:** `low` / `reviewRequired` (`seed-anchors.js:717`).
- **Gap → close (P1 — wrong landmark):** three places still encode the old shoulder definition and must move to the back-panel join together — the `anchor-schema.json` `strap-top` hint ("Where the shoulder strap meets the shoulder", line 119), `pom-template.json` POM 14 `view: front_outer`, and the front default seed. A front-only sketch (no back view) then cannot source this end → REVIEW_ONLY. Resolve the cross-view question (POM 14) first.

#### `strap-bottom` — Strap btm (strap ↔ cup-top join)
- **Is:** where the strap meets the **cup top** (front) — the near end of POM 14. front_outer. *(Unchanged; the TD correction was about the top end only.)*
- **Detect:** `findStrapLandmarksFromInk.bottom` else `{axisX + 0.30·halfW, chest − 0.10·(chest−top)}` (`seed-anchors.js:82`).
- **Evidence:** bottommost strap-zone ink on the front. Gate: shares POM 14 contract with strap-top.
- **Confidence:** `tier(det.strap, 'medium')` (`seed-anchors.js:720`).
- **Gap → close:** ratio fallback common. With strap-top corrected, POM 14 runs cup-join (front) → back-panel-join (back) — see the ⚠️ note under POM 14.

## Side group — role back (POM 11)

#### `side-top` / `side-bottom` — Side top / btm
- **Is:** the underarm notch (top) and the band end of the side seam (bottom). Role `back`.
- **Detect:** front sketch → `findSideTopFromInk` / `findSideBottomFromInk` (edge-walk down, `maxGap 5%·bboxH`); **back branch overwrites** both with `findBackSideSeam` (armpit → least-squares seam fit → hem) (`auto-detection.js:3808`, `seed-anchors.js:636`).
- **Evidence:** underarm notch + seam followed to the hem. Gate: `invariants` (POM 11 present on back); no dedicated semantic contract (—).
- **Confidence:** `tier(det.sideRight / det.sideTopRight, 'medium')` (`seed-anchors.js:713`).
- **Gap → close:** **provenance mismatch** — confidence/source are always read from the **front** `det.side*` even when the back branch supplied the coordinates, and the role is `back` even on a front-only sketch (`seed-anchors.js:713,766`). Target: compute tier/source from whichever branch placed it.

## Back group — role back (POMs 12/13/15)

#### `back-top` — Back top (POM 12 top)
- **Is:** topmost solid centre-back ink, on the back symmetry axis. back.
- **Detect:** `findBackCenterLandmarks` (centroid → axis → topmost ink in a ±3.5%·bboxW centre strip); x forced to `backCenterAxisX` so POM 12 is vertical (`auto-detection.js:3074`, `seed-anchors.js:579`).
- **Evidence:** topmost solid centre-back ink (won't float in an open scoop). Gate: `invariants` (POM 12 vertical); viewrole. Semantic contract (—).
- **Confidence:** `tier(det.back, 'low')` (`seed-anchors.js:721`).
- **Gap → close:** on a mesh scoop, sub-threshold mesh ⇒ top lands at the first solid seam below the opening (`limitation.md:68`).

#### `back-bottom` — Back btm (POM 12 bottom)
- **Is:** centre-back band row; shares axis x with back-top. back.
- **Detect:** `backCenter.bottom` (band row at centre) else `inView(b, 0.505, 1.0)`; x = `backCenterAxisX` (`seed-anchors.js:576`).
- **Evidence:** centre-back band row ⇒ vertical POM 12. Gate: `invariants` (vertical).
- **Confidence:** `tier(det.back, 'low')` (`seed-anchors.js:722`).
- **Gap → close:** low tier by default; back-centre detection is fuzzy. Target: raise via a back-band evidence check.

#### `back-panel-top` / `back-panel-bottom` — Panel top / btm (POM 13)
- **Is:** vertical extent of the back panel. back. Optional anchors override back-top/bottom.
- **Detect:** `findBackPanelHeight` (strap-join x at chest row → drop to band) → `findBackPanelEdges` (strongest vertical-ink column, span ≥ 20%·bboxH) → `inView(b, …)` (`auto-detection.js:4011`, `seed-anchors.js:616`).
- **Evidence:** strap-join-to-band vertical drop. Gate: `invariants` (present on back). Semantic contract (—).
- **Confidence:** `tier(det.backPanel, 'medium')` when detected else `medium`(back) / `low` (`seed-anchors.js:723`).
- **Gap → close:** view-ratio fallback when neither detector fires. Target: an evidence check that the panel edges bracket real ink.

#### `back-strap-left` / `back-strap-right` — Back strap L / R (POM 15)
- **Is:** the two back-strap inner attachment edges. back.
- **Detect:** `findBackStrapInnerEdges` (per-column ink, `colThresh 40%·zoneH`, centre guard 2%·bboxW, neckline gap ≥ 5%·bboxW) → back-panel outer corners → `inView(b, …)` (`auto-detection.js:3015`, `seed-anchors.js:602`).
- **Evidence:** two near-vertical strap inner edges. Gate: `invariants` (present on back). Semantic contract (—).
- **Confidence:** `medium`(back) / `low`(front) (`seed-anchors.js:725`).
- **Gap → close (documented):** lace/angled straps have no coherent vertical column ⇒ falls back to panel outer corners (`limitation.md:55`). Also n=0 in the corpus (POM 15 number below).

---

# Part 2 — Measurement logic (16 numbers)

Numbers below are the **authoritative** corpus values from
`auto_mode_rules/sizeL-suggestions.json` (225 style-versions, 2950 rows). The
older §6 table in `MEASUREMENTS_FROM_SKETCH_AND_LIBRARY.md` is an illustrative
45-style snapshot and is **superseded** by the JSON. `sketch_reliable` is recorded
per POM but is **dormant** (0 references in `src/`) until Mode B ships, so every
1–14 number today is the library median.

## Library-only pair POMs (1–4) — a drawing cannot show relax-vs-extend

#### POM 1 — 1/2 bottom band, relax
- **Is:** front_outer, `band-left ↔ band-right`; primary of pair 1/2 (own row/value).
- **Number:** library median. Ladder: TD override → **14 in** → n/a. `sketch_reliable=false`, n=225.
- **Story:** median of 225 Size-L samples of `band_relax`; near-constant at Size L ⇒ an ideal library POM. Range 12.74–14.38, TOL 3/8.
- **Watch:** `spec-conf` **medium**; `spec-delta` if a scale+target is set; line gates CLA.1 + HLN.1.
- **Gap → close:** style-agnostic prior (same number for every style) — the intended Tier-0 behaviour, not a bug.

#### POM 2 — 1/2 bottom band, extend
- **Is:** front_outer, same anchors; secondary of pair (dashed +1/5 stub off band-right).
- **Number:** library median. Override → **19 in** → n/a. `sketch_reliable=false`, n=225.
- **Story:** median of 225 `band_extended`. Range 18–19.25, TOL 1/2 (`min` type).
- **Watch:** `spec-conf` medium; line gate CLA.2 (stub geometry).
- **Gap → close:** TOL is `min`-type but the chip treats it as symmetric `±|tol|` (`spec-panel.js:527`) — honour TOL type at runtime.

#### POM 3 — 1/2 chest, measure straight
- **Is:** front_outer, `chest-left ↔ chest-right`; primary of pair 3/4.
- **Number:** override → **17 in** → n/a. `sketch_reliable=false`, n=198.
- **Story:** median of 198 `chest_relax`. Range 15.5–17.5, TOL 3/8.
- **Watch:** `spec-conf` medium; CLA.3 + HLN.3.
- **Gap → close:** style-agnostic prior (intended).

#### POM 4 — 1/2 chest, extend
- **Is:** front_outer, same anchors; secondary (+1/5 stub off chest-right).
- **Number:** override → **22 in** → n/a. `sketch_reliable=false`, n=197.
- **Story:** median of 197 `chest_extended`; the 2/98 percentile trim guards a mis-keyed min (`generate-sizeL-suggestions.mjs:240`). Range 20–22.77, TOL 1/2 (`min`).
- **Watch:** `spec-conf` medium; CLA.4.
- **Gap → close:** `min`-type TOL not honoured (as POM 2).

## Sketch-derivable POMs (5–14) — median today, Mode-B candidates tomorrow

#### POM 5 — centre-front height
- **Is:** front_outer, `cf-top ↔ cf-bottom`.
- **Number:** override → **5.5 in** median. `sketch_reliable=true` (dormant), n=217.
- **Story:** median of 217 `cf_height`. Range **1.32–6.5** (wide, skewed-low min), TOL 1/4.
- **Watch:** `spec-conf` medium; `spec-delta`; CLA.5.
- **Gap → close:** min 1.32 makes the range near-useless as a sanity bound; prime Mode-B target (its own geometry should set this) but ships flat today.

#### POM 6 — cradle height at centre front
- **Is:** front_outer, `cradle-cf-top ↔ cf-bottom`.
- **Number:** override → **2.25 in**. `sketch_reliable=true`, n=163.
- **Story:** median of 163 `cradle_cf`. Range 1.31–3, TOL 1/8.
- **Watch:** richest line-evidence set — `contract` C6.vertical, C6.start-above-end, C6.start-on-axis, C6.seam-source, C6.shorter-than-pom5.
- **Gap → close:** **grading models disagree** — the Excel export zeroes POM 6's deltas (held flat, `export-xlsx.js:43`) while the size-run dialog gives it a 0.125 step (`size-run-dialog.js:24`). Pick one.

#### POM 7 — cradle height at bottom cup
- **Is:** front_outer, `cradle-cup-top ↔ cradle-cup-bottom`.
- **Number:** override → **1.75 in**. `sketch_reliable=true`, n=173.
- **Story:** median of 173 `cradle_under_cup`. Range 1.11–2.64, TOL 1/8.
- **Watch:** `contract` C7.anchor-presence, C7.start-off-cf, C7.start-off-side-seam, C7.vertical, C7.seam-source, C7.review-when-no-seam.
- **Gap → close:** shortest line ⇒ highest per-pixel error if Mode B ever scales it (evaluation §8); keep it library-only until Mode B is validated for short lines.

#### POM 8 — cup height at centre front
- **Is:** front_outer, `cf-top ↔ cradle-cf-top` (end shared with POM 6 start).
- **Number:** override → **3 in**. `sketch_reliable=true`, n=**113**.
- **Story:** median of 113 `cup_height_cf`. Range 1.75–4, TOL 1/4.
- **Watch:** `spec-conf` **low** (n=113 < 150 base-low, `generate-sizeL-suggestions.mjs:147`); `contract` C8.start-above-end, C8.end-not-band, C8.shorter-than-pom5, C8.end-equals-pom6-start.
- **Gap → close:** thinnest well-mapped POM ⇒ only `low`; the POM 6 seamProjected rescue also feeds this line.

#### POM 9 — cup height
- **Is:** **cup height** on the front cup, `cup-top ↔ cup-bottom` (schema kinds `inner-cup-top/bottom`). Measured on the front (outer) view; **no inner-cup view required** — see the corrected Cup group in Part 1.
- **Number:** override → **8 in**. `sketch_reliable=true`, n=237.
- **Story:** median of 237 `cup_height`. Range **5.805–9.5** (wide), TOL 1/4.
- **Watch:** `contract` C9.shares-cup-with-10, C9.view-role-coherent. ✅ `C9.no-false-review-without-front-inner` (2026-07-09, ADR 0011) asserts the corrected rule: a directly-read front cup is trusted (source `cupModel`, not `reviewRequired`, tier not `low`, DRAWABLE) with no `front_inner` view. Absence of an inner cutaway is normal, not a fault.
- **Gap → close:** one of the widest ranges ⇒ weak Mode-A prior (evaluation finding 9). Drop the front_inner dependency (**P1**) so a front+back sketch measures the cup at full confidence.

#### POM 10 — cup width
- **Is:** **cup width** on the front cup, `cup-left ↔ cup-right` (schema kinds `inner-cup-left/right`). Front (outer) view; **no inner-cup view required**.
- **Number:** override → **8 in**. `sketch_reliable=true`, n=221.
- **Story:** median of 221 `cup_width`. Range 6.6–9, TOL 1/4.
- **Watch:** `contract` C10.shares-cup-with-9 (shared `cupModelId`).
- **Gap → close:** the cup-right anchor limitation (Part 1) can widen the drawn line even when the number is fine; plus the front_inner dependency (**P1**).

#### POM 11 — side seam length
- **Is:** back, `side-top ↔ side-bottom`.
- **Number:** override → **5.5 in**. `sketch_reliable=true`, n=211.
- **Story:** median of 211 `sideseam_length`. Range 4.5–6 (**tight** ⇒ relatively trustworthy prior), TOL 1/4.
- **Watch:** `spec-conf` medium; CLA.11.
- **Gap → close:** back-view detection dependency; the side anchor provenance mismatch (Part 1).

#### POM 12 — back centre length
- **Is:** back, `back-top ↔ back-bottom`.
- **Number:** override → **3.75 in**. `sketch_reliable=true`, n=239.
- **Story:** median of 239 `cb_height`. Range **2–7.24** (very wide), TOL 1/8.
- **Watch:** `spec-conf` medium; CLA.12.
- **Gap → close:** tight 1/8 TOL against a very wide spread ⇒ weak prior; Mode-B candidate.

#### POM 13 — back panel height
- **Is:** back, `back-top ↔ back-bottom` (+ optional panel anchors).
- **Number:** override → **7.25 in**. `sketch_reliable=true`, n=181.
- **Story:** median of 181 `back_panel_height`. Range **3–12** (very wide), TOL 1/4.
- **Watch:** `spec-conf` medium; CLA.13.
- **Gap → close:** widest-but-one range ⇒ median weakly informative; Mode-B candidate.

#### POM 14 — shoulder strap length
- **Is:** the shoulder-strap length on the **back** view, `strap-top` (top of the back strap, crossover end) → `strap-bottom` (strap↔back-panel join). ✅ **Cross-view question RESOLVED 2026-07-09 (ADR 0012): model (a), back-only** — both ends on one view, satisfying the "every POM lives on exactly one view" invariant. `pom-template.json` POM 14 `view` is now `back`; a front-only sketch (no back view) demotes POM 14 to REVIEW_ONLY (refuse to guess). Options (b) two-segment sum and (c) front-only-redefine were rejected.
- **Number:** override → **8 in**. `sketch_reliable=true`, n=155.
- **Story:** median of 155 `strap_length`. Range **4–12** (widest), TOL 1/4.
- **Watch:** `spec-conf` **low** — n would give medium but `expected_confidence_tier='low'` floors it (`generate-sizeL-suggestions.mjs:149`). The only low-tier POM by design.
- **Gap → close:** **held in grading** (`hold:true`, flat across sizes); widest range + hardest anchor ⇒ the "always verify by hand" POM. Plus the strap-top landmark + cross-view model above (**P1**).

## No-corpus POMs (15–16) — the only numbers with no library value

#### POM 15 — back strap distances
- **Is:** back, `back-strap-left ↔ back-strap-right`.
- **Number:** **no library value** → Size L **blank** unless the TD types one. `source:"none"`, n=**0** (concept `back_straps_distance` mapped but no corpus rows). This is one of only two POMs whose exported number can come from the **measured line** (if a scale is set), since no median pre-empts it.
- **Story:** none yet — no data. `confidence: very_low`.
- **Watch:** **"no data" badge** (`spec-panel.js:388`); CLA.15 + HLN.15. No delta chip unless TD enters Size L + sets a scale.
- **Gap → close:** grow the corpus for this concept; held in grading meanwhile. Blank export is policy (ADR 0009).

#### POM 16 — front apex distance
- **Is:** front_outer, `apex-left ↔ apex-right`.
- **Number:** **no library value** — concept **unmapped** (`CONCEPT_BY_POM['16']=null`, `generate-sizeL-suggestions.mjs:62`). Blank unless TD/scale supplies one.
- **Story:** none yet — unmapped. `confidence: very_low`.
- **Watch:** **"no data" badge**; strong line-evidence set — `contract` C16.both-sides, C16.left-right-order, C16.both-above-chest, C16.source-cup-curve (`apexJoin`, never strap-ring), C16.not-strap-ring.
- **Gap → close:** map an apex-distance concept in the corpus so a value path exists; until then the line is well-guarded but the number is TD-only.

---

# Part 3 — Governance: how we stop fixing it up and down

### The rule

1. **No anchor without logic.** Every anchor entry above states one detection
   rule and one evidence signal. If a sketch defeats it, you change the *rule and
   its test* here — you do not hand-nudge one image and hope.
2. **No number without a story.** Every number is a named corpus median (with n
   and range) or a measured line under a stated scale, or it is blank with a "no
   data" badge. There are no unexplained values.
3. **A change is a contract change.** Editing detection or a value means updating
   the entry here + the guarding test (`invariants` / `contract`) + re-baselining
   `golden` **only** after `accuracy` confirms it is better (never to silence a
   regression). This is what makes the behaviour converge instead of oscillate.
4. **When the signal is absent, refuse — don't guess.** A missing required anchor
   is REVIEW_ONLY; an unmapped number is blank. Confidence tiers and
   `reviewRequired` carry the doubt to the TD instead of hiding it in a
   confident-looking line.

### Every item's evidence gate (the "easy to detect an issue" map)

- **Well-guarded (semantic contract):** POMs 6, 7, 8, 9, 10, 16 and their anchors
  (C6–C16); pair line geometry (CLA/HLN); cup bounds (A/B) for inner-cup anchors;
  POM 14 always-verify contract.
- **Structurally guarded only (`invariants`/`golden`, no semantic contract — `—`):**
  side anchors (11), back-centre (12), back-panel (13), back-strap (15). These are
  the back-view items most likely to drift silently. **Highest-value place to add
  evidence checks.**

### Punch list (consolidated gaps, by priority)

**P1 — correctness / consistency**
- **POM 14 `strap-top` is the wrong landmark.** ✅ **RESOLVED 2026-07-09 (ADR 0012 — model (a), back-only).** POM 14 is now measured on the **back** view: `strap-top` = top of the back strap (`findBackStrapTopFromInk`), `strap-bottom` = strap↔back-panel join (`findBackPanelHeight.top`); both seed only in the back branch of `seedAnchorsFromDetection`, `pom-template.json` POM 14 `view` is `back`, the two strap hints were reworded, and a front-only sketch demotes POM 14 to REVIEW_ONLY. Guarded by `contract` C14.* and the rewritten `pom14-limitations`.
- **POMs 9/10 must not require an inner-cup view.** ✅ **RESOLVED 2026-07-09 (ADR 0011).**
  `cupModel.visibility` is now `direct` when the cup rests on real structure — a
  validated apex **AND** a real cup-bottom (`bottomFromSeam || bottomFromInk`) — or
  a `front_inner` cutaway exists; so a front+back-only sketch reads the cup at full
  confidence (`cupTier` no longer caps it, the blunt `cupModelWeak` review term was
  removed). `pom-template.json` POM 9/10 `view` is `front_outer`, the `inner-cup-*`
  hints were reworded (kinds unchanged — rename deferred), and the dormant test was
  inverted to `C9.no-false-review-without-front-inner`. A genuinely undetectable cup
  (`hidden`) still ⇒ REVIEW_ONLY. Geometry-preserving (golden maxDrift 0.0000).
- Side anchors read confidence & source from **front** signals even when the back
  branch placed them; role is `back` on front-only sketches
  (`seed-anchors.js:713,766`). Compute tier/source from the placing branch.
- POM 6 grading disagreement: export holds it flat vs size-run dialog's 0.125 step
  (`export-xlsx.js:43` vs `size-run-dialog.js:24`). Reconcile to one model.
- `cf-top` x pinned to the symmetry axis, not CF-seam ink x — asymmetric fronts
  drift the whole CF column (`seed-anchors.js:316`).

**P2 — evidence coverage**
- Add semantic `contract` checks for the back-view group (POMs 11/12/13/15) so
  drift is caught by CI, not the TD's eye.
- Implement the `out_of_range` signal (compare value to `sug.min/max`); today the
  range is tooltip-only (`spec-panel.js:399`).
- Honour TOL `min`/`max` type in the tolerance chip (POMs 2, 4;
  `spec-panel.js:527`).

**P3 — detection hard cases (already documented in `limitation.md`)**
- IC-R sticks at the gore inset on line-only cups; trace the cup panel before
  fixing the model edge (contours run after `buildCupModel`, `limitation.md:114`).
- `cradle-cf-top` flaky on gore-heavy fronts (demo3/demo7, `limitation.md:80`).
- back-centre top on mesh scoops; back-strap on lace/angled straps
  (`limitation.md:55,68`).

**P4 — data**
- POMs 15 (mapped, n=0) and 16 (unmapped) have no library value. Grow/­map the
  corpus concepts; until then they stay blank by policy.
- Wide-range weak priors (POMs 14, 13, 12, 9): these are the POMs where a flat
  median helps least — the strongest case for shipping Mode B **per-POM**, gated
  on `accuracy` (see [ADR 0009](docs/decisions/0009-measurement-suggestion-engine.md)
  and `MEASUREMENTS_PLAN_EVALUATION.md`).

### What is deliberately not a gap

Library-only pair POMs (1–4) giving the same number for every style, apex =
strap-join (not bust point), and REVIEW_ONLY on absent signals are all
**intended** — they are logic, not omissions.
