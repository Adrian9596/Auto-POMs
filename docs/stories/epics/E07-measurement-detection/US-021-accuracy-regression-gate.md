# US-021 Accuracy regression gate

## Status

implemented

## Lane

normal

## Product Contract

`npm run accuracy` must not only *report* how far detector seeds are from TD
ground truth — it must **fail** when a change makes those numbers worse than
the committed baseline, and pass (with a ratchet hint) when they improve. This
turns "the tool gives the most accurate numbers" from a manual judgment into a
mechanical check, symmetric with `golden --update` on the stability side.

## Relevant Product Docs

- `TESTING.md` (accuracy row + stability-vs-correctness section)
- `scripts/groundtruth/README.md`
- `PROJECT_CHARTER.md` milestones M3 (grow GT corpus) / M4 (calibrate bands)

## Acceptance Criteria

- A full `npm run accuracy` run compares against
  `scripts/groundtruth/accuracy-baseline.json` and exits non-zero when any
  labeled image's mean or max error, any anchor kind's mean error, the overall
  mean, or the per-image count of unseeded ground-truth anchors regresses
  beyond a small epsilon (env-overridable:
  `ACCURACY_GATE_MEAN_EPS`=0.001, `ACCURACY_GATE_MAX_EPS`=0.005,
  `ACCURACY_GATE_KIND_EPS`=0.005).
- Improvements never fail; the run prints which images improved and suggests
  `--update` to ratchet the baseline.
- `--update` re-seeds the baseline from the current run; a newly labeled image
  fails the gate until explicitly baselined (label → baseline are two
  reviewable steps).
- `--only` (partial corpus) skips the gate; a missing baseline file leaves the
  suite report-only with a seeding hint (first-run friendly).
- Stale-read guard (root-cause fix for this suite): Chrome's cache is disabled
  via CDP and captureOnce() SHA-256-verifies the served `app.js` against the
  on-disk copy before every detection, re-navigating (up to 5×, backoff) until
  they match. Rationale: on this Google Drive checkout the first read after
  file churn can serve a **stale app.js**, which Chrome would otherwise cache
  for the whole process — observed live as the fragile cradle junction/crest
  anchors silently missing on demo4/demo5/demo7 (112–114 scored anchors vs
  the true 118), i.e. the pre-US-015 detector being measured by mistake.
- Second belt: an image whose ground-truth anchors still go unseeded is
  re-detected once before scoring. A real regression is deterministic and
  fails both passes, so neither guard can mask one.

## Design Notes

- Commands: `node scripts/accuracy-tests.mjs [--update]`
- Baseline: `scripts/groundtruth/accuracy-baseline.json` (per-image
  mean/p90/max/scored/missing, per-kind mean/n, overall) — committed, reviewed
  like golden baselines.
- Domain rules: gate is one-sided (worse fails, better passes) because
  accuracy error has a true zero; golden remains the two-sided drift alarm.
- No `src/` change — harness-only; `app.js` untouched.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a (script-level) |
| Integration | `npm run accuracy` green vs committed baseline (5 images, 118 anchors, overall mean 0.0051); tampered-baseline run exits 1 with per-image/per-kind/overall GATE FAIL lines |
| E2E | n/a |
| Platform | n/a |
| Release | run full suite set before shipping detection changes |

## Harness Delta

- `TESTING.md` accuracy row documents the gate; stability-vs-correctness
  section explains the `golden --update` / `accuracy --update` mirror.
- `scripts/groundtruth/README.md` documents `accuracy-baseline.json`.

## Evidence

- Green: `node scripts/accuracy-tests.mjs` → `OK — no image, anchor kind, or
  overall regression`, exit 0 (4 consecutive clean runs).
- Red: baseline tampered to pretend-better numbers → 3 GATE FAIL lines
  (image mean, anchor-kind mean, overall mean), exit 1.
- Flake guard motivated by three live occurrences of unseeded cradle anchors
  on first-run-after-write (demo4/demo5/demo7; one survived a same-process
  retry, proving the stale copy was cached — hence cache-off + hash check).
  3 consecutive clean runs (118/118 anchors, gate OK) after the guard landed,
  under the same run-right-after-write conditions that previously flaked.

## Known gaps / next steps (accuracy roadmap)

1. **Corpus**: 14 demo images still unlabeled; highest value first per
   `scripts/groundtruth/README.md` (POM 9/10 correct/fail pairs, then
   passing controls). Current 5 GT files are Claude-audited drafts pending TD
   spot-check.
2. **Band calibration (M4)**: tight/loose (0.02/0.04) are provisional until
   real TD-drag residuals exist.
3. **Line-level accuracy**: the gate scores anchor seeds; the exported POM
   *measurements* derive from draft lines. A future GT format capturing
   TD-corrected line endpoints (the style-evidence records already store
   these after Apply + TD edit) would let the harness score measurements
   directly.
4. **Stale-app.js serving affects the other CDP suites too**: golden /
   invariants / contract / smoke have no served-hash guard and can silently
   measure an old build right after file churn (false green or false red).
   Port the cache-off + SHA-256 check from `accuracy-tests.mjs` (candidate
   home: `scripts/static-server.mjs` helper or shared CDP lib).
