# Ground-truth corpus (accuracy harness)

`scripts/groundtruth/<image-basename>.json` holds **TD-corrected anchor
positions** for each `demo/` image. This is the only thing that turns
*"detection is stable"* (`npm run golden`) into *"detection is correct"*
(`npm run accuracy`): the detector's seeded anchors are scored by euclidean
distance against these human-placed positions.

- `expectations.json` is **not** ground truth — it's per-image semantic
  expectations for `npm run contract`. Leave it alone.
- Until at least one `<image>.json` exists here, `npm run accuracy` exits 0
  with "nothing to score" (non-blocking, by design).

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

## Suggested labeling order (highest value first)

1. **Cradle-weak** (validate POM 6/7/8 fixes): `demo4.jpg`, `demo5.jpg`,
   `demo7.png`, `demo1.jpg`, plus `demo3.jpg` as a passing control.
2. **POM 9/10 examples**: `correct example POM 9 and 10.png`,
   `fail example POM 9 and 10.png`, `2. correct example POM 9 and 10.png`,
   `2. fail example POM 9 and 10.png`.
3. **Passing controls** (regression guard): `1.jpg`, `demo2.jpg`, `demo 8.png`.
