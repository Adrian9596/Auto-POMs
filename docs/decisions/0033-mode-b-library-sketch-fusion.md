# 0033 Mode B measurement = library × sketch fusion (shrinkage, not blend)

Date: 2026-07-18

## Status

Accepted

## Context

ADR 0009 shipped Tier-0 (library median, suggest-not-assign) and deferred Mode B
(sketch-derived measurement) until it could be validated per-POM. ADR 0026 fixed
the measurement-evidence contract (view-local scale; `ESTIMATED_SUGGESTION` vs
`Sketch Measurement`). US-039 Stage 0 added the view-local auto-scale resolver
(`resolveViewScales`) and the line-level accuracy gate.

The open question for Stage 1+: **how to combine the two evidence sources we
have — the sketch's own pixels and the library corpus — for the most accurate
per-POM value.** A naive blend (`average(sketch, library)`) is wrong: it is
statistically unjustified and, worse, it **regresses atypical styles toward the
population mean** — degrading accuracy exactly for the small/large styles where
a measured value matters most.

Two facts drive the design:

1. **A technical flat has no ruler.** Absolute size cannot be recovered from
   pixels alone; the sketch reliably yields **proportions between POMs**, not
   absolute inches. So a value = `pixel × scale`, and *scale* is the hard,
   shared unknown per view.
2. **The library is a population prior, not this style.** Its median is unbiased
   for the population but **biased for a specific style** that systematically
   differs. Its between-style spread says how strong a predictor it is.

So the sources are complementary: **library anchors absolute size; the sketch
supplies this style's shape/deviation.** Combining them is an estimation
problem, not an averaging one.

## Decision

Mode B produces each POM value by a **precision-weighted shrinkage** of the
sketch measurement toward a **partial-pooled** library expectation — never a
blind average — with conflict surfaced, not smoothed.

**1. Scale (the real fusion).** Fit **one view-local scale** from the
sketch-reliable POMs against their library medians (robust/weighted), or pin it
from an independent reference when available. Precedence by *independence*:
`TD calibration > construction reference (H&E rows = 3.00 in) > multi-POM
library-inferred > none`. Front and back scales are never shared (ADR 0026).
The **dispersion** of the per-POM scale candidates is the in-distribution
signal: tight ⇒ trust; scattered ⇒ abstain (REVIEW), do not emit.

**2. Per-POM value — shrinkage toward a style-adjusted prior.**

```
styleExpected = prior · (1 + styleOffset)          # partial pooling
fused         = styleExpected + k · (sketch − styleExpected)
k             = σL² / (σL² + σs²)          ∈ [0,1]
```

- `styleOffset` = robust median over the view's POMs of `sketch/prior − 1` — the
  **coherent style-wide deviation**. It is *kept*, not shrunk away, so a
  uniformly small/large style is not dragged to the mean.
- `σL` = library **between-style** spread (from corpus values), `σs` = sketch
  noise (grows with weaker scale independence, candidate/ratio anchors, and
  short POMs). `k → 1` trusts the sketch; `k → 0` falls back to the
  style-adjusted library.

**3. Only sketch-reliable POMs, only confirmed anchors.** Eligible POMs are the
corpus `sketchReliable` set **5–13** (POM 1–4 are schematic; 15/16/17/18 have no
corpus; **14 is excluded** — front-to-back cannot be measured from separated
views, ADR 0026). A fused value is emitted only for **ink/OpenCV-confirmed**
anchor pairs; ratio-hypothesis anchors stay library prior.

**4. Conflict is diagnosed, never averaged.** From per-POM residual
`r = sketch/prior − 1 − styleOffset` and the view dispersion:

| Signal | Cause | Action |
| --- | --- | --- |
| one POM's \|r\| large, others fit | anchor error on that POM | down-weight / REVIEW that POM |
| many POMs deviate, same sign | genuine style offset | keep sketch (styleOffset carries it) |
| residuals scattered | bad scale / detection | REVIEW the whole view, emit no value |

**5. Honest labels.** Tier-A (independent scale) fused values may be
`SKETCH_MEASUREMENT`; Tier-B (library-anchored scale) are `ESTIMATED_SUGGESTION`
capped at medium — a library value never masquerades as an independent
measurement. The evidence trace exposes `sketch`, `prior`, `styleOffset`, `k`,
`residual`, and `fused`.

**6. The blend is validated, not asserted.** `k`'s inputs (`σs` tiers) are
provisional; `npm run measurement-accuracy` (US-039 S0.1) tunes them per-POM
against TD ground truth. A POM stays library-only until fusion measurably beats
library-only on the corpus.

## Alternatives Considered

1. **Blind average** `(sketch + library)/2`. Rejected: unjustified; biases
   atypical styles toward the mean; hides conflict.
2. **Sketch-only when scale exists.** Rejected: with a library-inferred scale
   the sketch value is already library-anchored (near-circular) and noisy on
   short POMs; ignoring the prior throws away real variance reduction.
3. **Library-only (stay Tier-0).** Rejected: never captures a style's real
   deviation — the entire point of measuring the sketch.
4. **Fixed shrinkage weight.** Rejected: the right weight differs by POM
   (anchor length, prior tightness) and must be data-tuned via the accuracy gate.

## Consequences

Positive:

- Accuracy is **≥ library-only by construction**: a weak or inconsistent sketch ⇒
  `k → 0` ⇒ falls back to the (style-adjusted) prior; a strong consistent sketch ⇒
  `k → 1` ⇒ captures the real value. Best gains on atypical styles.
- The fitted scale + residuals **self-diagnose** anchor error vs style deviation
  vs bad scale — a capability neither source has alone.
- Fully compatible with ADR 0009 (suggest-not-assign) and ADR 0026 (view-local,
  evidence trace, estimated-vs-measured).

Tradeoffs:

- `σs`/`σL` estimates start heuristic; until the GT corpus grows, fused values on
  Tier-B remain `ESTIMATED_SUGGESTION` for TD review.
- Partial pooling needs ≥2 measurable POMs per view for a style offset; with
  fewer, it degrades to per-POM shrinkage toward the raw median.

## Follow-Up

- Prototype in the lab (`test/engine.js` `fuseWithLibrary` / `fusePomValue`),
  visible in the evidence trace; validate on demo3/demo5.
- Tune `k` inputs with `npm run measurement-accuracy` once TD ground truth
  (`scripts/groundtruth/measurements/*`) is `td_confirmed`.
- Port to production Mode B per-POM (Stage 2), enabling only POMs that beat
  library-only on the accuracy gate.
- Backfill the durable decision row via `harness-cli decision add` (same as 0009).
