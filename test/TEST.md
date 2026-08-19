# Independent Construction-Aware Measurement Test

## Purpose

This folder is a self-contained offline laboratory for testing measurement evidence independently from the production application. It answers five questions:

1. What closure/construction evidence can OpenCV observe in the sketch?
2. Which construction cohort is eligible, or should the detector abstain?
3. Can anchor-pair distances be converted to inches with explicit or inferred scale evidence?
4. Does each proposed value expose enough evidence for a TD to accept, correct, or reject it?
5. Can the TD reach a locked Size L set with fewer confirmations and less time?

It is not an accuracy benchmark and does not promote records into `library/`.

## Offline boundary

`index.html` loads only files inside this folder:

- `vendor/opencv.js` — copied OpenCV.js runtime with embedded WASM;
- `sketches/*` — copied demo sketches;
- `library/construction-cohorts.js` — isolated construction fixture;
- `library/measurement-priors.js` — snapshot of Tier-0 priors;
- `engine.js`, `app.js`, and `styles.css` — test implementation.

No fetch, API, CDN, model download, telemetry, or network request is allowed.

**OpenCV readiness trap:** never `await window.cv`. The vendored Emscripten
build's `Module.then` resolves with the Module itself, so awaiting it re-enters
thenable resolution forever — an infinite microtask loop that hard-freezes the
tab ("Page Unresponsive", fixed 2026-07-13). Poll `cv.Mat`/`cv.imread` on a
timer instead, exactly like the production `opencv_real_api.js`. The page runs
its first analysis on the pixel fallback immediately and re-analyzes in place
once the WASM runtime reports ready.

## Fixture truth boundary

The construction roster uses style names and closure evidence recorded in `LIBRARY_EVIDENCE_SOURCES.md` and `LIBRARY_WORKING_SET.md`.

The measurement profiles joined to those styles are `synthetic_test_data`. They exist only to exercise cohort filtering and must never be interpreted as TD-approved measurements or production accuracy evidence.

Counts are always separate:

- `catalog_style_count`: styles with construction evidence;
- `synthetic_measurement_peer_count`: test-only joined profiles;
- `approved_production_peer_count`: governed joined peers, currently zero in this fixture.

## Construction cohorts

| Cohort | Styles | Expected test behavior |
| --- | ---: | --- |
| `front_zipper` | 4 | Eligible synthetic cohort; zipper evidence may select it. |
| `front_closure_placket` | 3 | Eligible only after matching evidence or TD override. |
| `front_hook_and_eye` | 1 | Must return `INSUFFICIENT_PEERS` at minimum peer count 3. |
| `back_hook_and_eye` | 6 | Test-eligible pending cohort grounded by raw `Hook and eye width` terms at 3 or 3.75 inches; joined profiles remain synthetic. |
| `none_pull_on` | 4 | Eligible synthetic cohort when no closure evidence is present. |

Unknown or conflicting construction must not borrow a cohort automatically.

Construction chips expose `detected`, `candidate`, or `not detected` beside a
detector-support percentage. The percentage describes rule strength for the
active sketch and is not calibrated accuracy. Generic seam texture does not prove lace;
lace needs distributed light-pattern evidence across the front view. Generic
back-center rails or repeats do not prove hook-and-eye; automatic back H&E
requires a regular sequence of three to six closure rows. A paired center-back
closure panel without visible rows may produce a capped `candidate` percentage
for TD confirmation, but cannot select the construction automatically. The
evidence source and raw score remain available in the audit payload for diagnosis.

## Five-layer proof contract

One Analyze action evaluates five evidence layers for every POM. These are
engine gates, not five workflow screens:

1. **Visual Understanding** — required view and construction are identified.
2. **Landmark Geometry** — a complete anchor pair and pixel distance exist; a
   ratio-based anchor hypothesis stays `Weak` until ink/OpenCV or TD
   confirmation. The canvas never draws a measurement line from hypotheses.
3. **Physical Scale** — the POM has a valid scale for its own view; inferred
   scale stays `Weak`.
4. **Library Corroboration** — compatible peers are named and counted.
   Synthetic peers can support `Review` but never pass the production `Auto`
   gate.
5. **Trust Decision** — the combined result is `Auto`, `Review`, or
   `Insufficient`.

Each layer reports `PASS`, `WEAK`, `MISSING`, or `NOT_APPLICABLE` with a direct
reason. The full raw evidence trace remains available beside the compact proof.

`evidence_coverage_score` describes how much upstream evidence exists.
`measurement_confidence` describes a numeric measurement proposal. If no
numeric value exists, measurement confidence is `null` in JSON and `—` in the
workbench. Weak essential layers cap numeric confidence: inferred scale at 74,
candidate landmarks at 79, and synthetic-only library support at 84.

## Measurement fast lane

The TD stays on one page and confirms only high-leverage evidence:

- confirm the detected view roles;
- confirm the detected construction;
- for back hook-and-eye styles, confirm 3 or 3.75 inches as POM 12 Back Center
  Length. This creates a back-view scale only.

Those confirmations apply only to the active sketch and reset when another
demo or local file is loaded. Advanced calibration controls remain available
for diagnostic use but are not the default workflow.

The lab records offline pilot metrics for the active sketch: analysis time, TD
actions, distinct POM overrides, unresolved Review rows, and time to lock.
These measure workflow effort, not detector accuracy.

## Evidence hierarchy

```text
explicit TD calibration
  > direct construction reference
  > robust multi-anchor inferred scale
  > construction-compatible library prior
  > general library prior
  > NO_DATA / TD input required
```

The three sources corroborate one another; they are not averaged blindly.

### Explicit calibration

The TD chooses a POM candidate and enters its known length for that candidate's
view. The scale is `known inches / detected pixels`. A front scale never applies
to a back view automatically. A zero, missing, or non-finite input is invalid.

### Multi-anchor inferred scale

The test engine uses eligible cohort medians for POM 1 and POM 5 as scale candidates. It takes a robust median only when at least two candidates agree within 12%. Confidence is capped at `medium`.

### Construction-aware prior

The median of compatible peers is displayed as `LIBRARY PRIOR`. It is not described as detected from the sketch. Fewer than three compatible peers causes abstention.

When construction is unresolved or its compatible cohort is insufficient, an
available general-library median may remain visible as a low-confidence Review
baseline. This does not select a construction cohort. The baseline is replaced
when stronger construction-specific evidence becomes available.

### Hook-and-eye row reference

OpenCV preserves a discrete count when it finds a regular vertical sequence at
the back closure. Exactly three detected rows plus back hook-and-eye
construction maps directly to POM 12 Back Center Length = 3.00 inches. Three
matching 3-inch fixture peers corroborate the rule. The result stays Review and
may seed only the back-view scale; other row-count mappings are undefined.

## Per-POM rules

- POM 1–4: may seed inferred scale; confidence is capped at `medium`.
- POM 5–13: may produce a hybrid sketch measurement when scale and placement evidence are usable.
- POM 12: exactly three detected back H&E rows produce the direct 3.00-inch
  construction-reference proposal.
- POM 14: detected curve is placement evidence only; numeric value remains a compatible cohort prior.
- POM 15: requires detected back view, two back strap anchors, and back-view scale.
- POM 16: requires detected front outer view, two apex anchors, and front-view scale.
- Complete low-confidence evidence keeps the numeric proposal but returns
  `REVIEW_REQUIRED`; missing view, anchors, or scale returns no value.

## Visible evidence contract

The page must prove analysis rather than only display a result. For every POM it
shows:

- detected view role and view bounding box;
- start and end anchor hypotheses;
- pixel distance between those hypotheses;
- view-local calibration or inferred scale source;
- the `pixels × scale = inches` calculation when numeric;
- named construction cohort peers, their values/data kind, confidence, and
  decision reason;
- the five-layer proof receipt.

The canvas draws detected view boxes and labelled POM anchor hypotheses. It
does not connect them with inferred measurement lines. The JSON payload is a
machine-readable copy of the same visible trace, not the only place where
evidence exists.

The primary workbench keeps three surfaces visible together:

- Construction: detected views, tri-state construction chips, Evidence Health,
  and separate front/back Scale Hypothesis values;
- Sketch evidence: source sketch, view boxes, and anchor hypotheses;
- Size L measurements: all 16 POMs with editable value, numeric confidence,
  status, and an expandable evidence trace.

Evidence Health percentages are derived from the active analysis. They are not
fixed demo values and are not an accuracy score.

## Size L finalization contract

The evidence table is not final output. Each row in the Size L workbench is
classified before finalization:

- `Auto`: evidence score at least 85 plus strong view/construction evidence,
  ink/OpenCV/TD-confirmed landmarks, explicit view-local scale, the minimum
  approved production peer count, and no contradiction; provisionally accepted
  without another click;
- `Review`: usable numeric proposal scoring 55–84 or otherwise missing the
  strict Auto gate; TD must accept or override it;
- `Insufficient`: score below 55 or missing a required view, anchor pair, or
  view-local scale; no generated value is presented as final.

Direct value editing creates a `TD Confirmed` decision and preserves the
original suggestion. The remaining resolution actions are:

- `Accept suggestion` copies the visible current proposal into the final row;
- `TD override` accepts decimal, fraction, or mixed-fraction inches;
- `No data` and `Not applicable` resolve the row without a numeric value;
- `Reject suggestion` records rejection but remains unresolved.

Auto rows are accepted provisionally as soon as their strict gates pass. A
Final Size L Set still locks only when all 16 rows are resolved against the
current analysis run. Re-analysis clears an unlocked draft; a locked set blocks
re-analysis until the TD unlocks it.

The locked JSON preserves each row's suggestion, source, confidence, evidence
trace, TD action, and final value.

## Agreement and review

Sketch and cohort values agree when the absolute difference is within the larger of:

- the POM tolerance; or
- 8% of the cohort prior.

Outside that boundary, the tool shows both values and returns `REVIEW_REQUIRED`. It does not average them.

## Construction signal contract

OpenCV reports observations, then a rule evaluator chooses or abstains:

- center-front vertical rail support;
- paired parallel rail support;
- repeated small components near center front;
- repeated small components near outer/back edges;
- discrete, regularly spaced horizontal rows at the back closure;
- overall ink bounding box and edge density.

Location alone never proves a zipper. Weak or conflicting observations return `unknown`.

## Hypothetical scenarios

| ID | Scenario | Expected result |
| --- | --- | --- |
| H1 | Front zipper + explicit calibration + good placement | Sketch value is primary; cohort prior corroborates. |
| H2 | Front zipper + inferred scale with agreeing POM 1/5 candidates | Sketch value, confidence at most medium. |
| H3 | Front hook-and-eye with one compatible peer | `INSUFFICIENT_PEERS`; no construction prior. |
| H4 | Unknown construction | No automatic cohort; `TD_CONFIRM_CONSTRUCTION`. |
| H5 | Calibrated sketch differs from prior beyond TOL/8% | `REVIEW_REQUIRED`; do not average. |
| H6 | POM 14 has a drawable curve | Numeric source remains library prior. |
| H7 | POM 15 with back anchors and calibrated back scale | Numeric Sketch Measurement or `REVIEW_REQUIRED`. |
| H8 | POM 16 with front apex anchors and calibrated front scale | Numeric Sketch Measurement or `REVIEW_REQUIRED`. |
| H9 | POM 15/16 missing required view or local scale | No numeric value; explicit evidence reason. |
| H10 | Evidence-gated Auto | Only score >=85 rows with confirmed landmarks, explicit local scale, approved peers, and every mandatory gate resolve automatically. |
| H11 | Reject suggestion | Row remains unresolved and lock stays blocked. |
| H12 | All 16 rows resolved | Final Size L Set can lock with evidence snapshot. |
| H13 | Synthetic peers pass retrieval | Row remains `Review`; Library layer is `Weak`, never `Auto`. |
| H14 | No numeric proposal | Confidence renders `—` even when upstream evidence exists. |
| H15 | TD confirms back H&E 3/3.75 | Only the back-view scale changes; POM 12 calibration is recorded. |
| H16 | OpenCV detects exactly three back H&E rows | POM 12 = 3.00 inches, Review, with matching-peer evidence. |
| H17 | OpenCV is still initializing | POM 1–14 show general-library Review baselines instead of an empty table. |
| H18 | Compatible cohort exists but view scale is missing | Cohort median remains visible as Review, including POM 15/16. |

## Run

Double-click `index.html` for fully offline use, or serve the repository locally:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/test/`.

Run deterministic engine checks:

```bash
npm run construction-measurement-test
```

## Pass criteria

- All deterministic scenarios pass.
- Page resources contain no HTTP(S) dependency.
- Vendored OpenCV initializes locally.
- A demo sketch produces construction observations and anchor-pair distances.
- Every numeric output identifies its source and evidence.
- Synthetic peers are visibly marked and cannot be mistaken for approved data.
- Every POM exposes all five layer statuses.
- A row without a numeric value never displays a confidence percentage.
- New sketch input clears quick confirmations and pilot counters.
- Exactly three regular back H&E rows create the direct POM 12 evidence trace.
- The first offline pass shows available library baselines before OpenCV is
  ready; the OpenCV pass upgrades them without a network call.
