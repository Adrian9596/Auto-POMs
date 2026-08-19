# Ground-truth corpus (accuracy harness)

`scripts/groundtruth/<image-basename>.json` holds **TD-corrected anchor
positions** for each `demo/` image. This is the only thing that turns
*"detection is stable"* (`npm run golden`) into *"detection is correct"*
(`npm run accuracy`): the detector's seeded anchors are scored by euclidean
distance against these human-placed positions.

- `expectations.json` is **not** ground truth — it's per-image semantic
  expectations for `npm run contract`. Leave it alone.
- `accuracy-baseline.json` is **not** ground truth either — it's the committed
  regression baseline the accuracy suite gates against (fails when a run
  scores worse than it; re-seed with `node scripts/accuracy-tests.mjs
  --update` and review the diff — every number should move down or hold).
- Until at least one `<image>.json` exists here, `npm run accuracy` exits 0
  with "nothing to score" (non-blocking, by design).
- Adding a new `<image>.json` makes the gate fail with "missing from
  baseline" until you lock it in with `--update` — labeling and baselining
  are deliberately two separate, reviewable steps.

## File format

Produced by the in-app labeler (below). The harness only reads `anchors`
(x/y, normalized `[0,1]` in the source image's native pixel space):

```json
{
  "image": "demo3.jpg",
  "labeledAt": "2026-07-08T…",
  "ruleVersion": "…",
  "anchorCount": 25,
  "viewCount": 2,
  "anchors": {
    "cradle-cf-top": { "x": 0.1856, "y": 0.7098, "viewRole": "front_outer" },
    "…": { "x": …, "y": … }
  }
}
```

## How to label (one image per URL)

1. `npm run serve` → note the printed base URL (e.g. `http://localhost:4173`).
2. Open **`<base>/index.html?label=1&image=demo/<name>`**. This auto-loads the
   image, runs Detect Sketch, and pre-fills the save filename. (Spaces in a name
   are fine — the loader encodes them.)
3. Click **Fit** so the sketch fills the board (accurate dragging matters).
4. **Drag only the anchors the detector got wrong** onto their true landmarks.
   Anchors it already nailed — leave them; the detector output is the start
   point, so you only fix mistakes.
5. Click **💾 Save Ground Truth** (bottom-left), accept the suggested filename
   (`<name>.json`), and move the downloaded file into `scripts/groundtruth/`.
6. Repeat per image. Then run `npm run accuracy` for the score + a
   worst-anchor-kinds leaderboard (where tuning pays off).

Notes:
- `?label=1` suppresses the view-role modal and autosave, matching how the
  accuracy harness runs detection — so GT is labeled under the same conditions
  it is scored under. The harness scores x/y only, not `viewRole`.
- Tolerances (normalized image units): tight `0.02`, loose `0.04`
  (`ACCURACY_TOL` / `ACCURACY_TOL_LOOSE` to override).

## Current corpus (2026-07-11) — drafts pending TD review

`demo1.jpg`, `demo3.jpg`, `demo4.jpg`, `demo5.jpg`, `demo7.png` were labeled by
a zoomed visual audit (Claude), not the in-app drag flow: detector output was
the start point and only anchors clearly off their schema-hint landmark were
corrected (each file's `notes` lists what was corrected/added/omitted). A TD
should spot-check via the `?label=1` flow — especially the corrected
strap/apex anchors on `demo1.jpg` and the added cradle anchors — and replace
these files with TD-dragged versions where they disagree. Conventions applied:
apex = strap–cup join at the ring-bottom hardware; `strap-top` = top seam of
the stitched strap section (per style); POM 15 = strap inner edges;
anchors with no defensible landmark on a style were omitted, not invented
(e.g. apex on the seamless `demo4.jpg` yoke).

## Line-level measurement ground truth (`measurements/`, S0.1 / US-039)

`scripts/groundtruth/measurements/<image>.json` holds per-POM **measurement
value** ground truth (inches), scored by `npm run measurement-accuracy` — the
value-level mirror of the anchor-seed accuracy gate above. This is the safety
net for Mode B (sketch-derived measurements): a POM's measured value is only
trusted once it can be scored against a TD number here.

Format:

```json
{
  "image": "demo3.jpg",
  "source": "draft_pending_td",
  "unit": "in",
  "measurements": {
    "5":  { "value_in": 5.5, "tol_in": 0.25 },
    "12": { "value_in": 3.0, "tol_in": 0.125 }
  }
}
```

- **`source` gates.** Only files marked `"td_confirmed"` are scored by the gate.
  `"draft_pending_td"` files are schema-checked and reported, **never gated** —
  so Claude-seeded drafts can land without failing CI (mirrors how the anchor
  gate stays inactive until GT exists).
- **Non-blocking until wired.** Scoring also needs a measured-value source
  (`--measured <file>`), which Stage 1 feeds from the measurement engine output.
  Until then `npm run measurement-accuracy` is report-only.
- **Baseline:** `scripts/groundtruth/measurement-accuracy-baseline.json`
  (one-sided ratchet; seed with `--measured=<run> --update`).
- **Prove the gate math any time (offline, browserless):**
  `npm run measurement-accuracy-selftest`.
- **Current corpus (drafts):** `demo1/3/5` seeded with library-median
  placeholders flagged `draft_pending_td`. A TD must measure each specific style
  and replace the values, then flip `source` to `td_confirmed`.

## Suggested labeling order (highest value first)

1. **Cradle-weak** (validate POM 6/7/8 fixes): `demo4.jpg`, `demo5.jpg`,
   `demo7.png`, `demo1.jpg`, plus `demo3.jpg` as a passing control.
2. **POM 9/10 examples**: `correct example POM 9 and 10.png`,
   `fail example POM 9 and 10.png`, `2. correct example POM 9 and 10.png`,
   `2. fail example POM 9 and 10.png`.
3. **Passing controls** (regression guard): `1.jpg`, `demo2.jpg`, `demo 8.png`.
