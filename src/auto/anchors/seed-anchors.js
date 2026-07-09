// Seed anchors from a detection result: walk the ANCHOR_SCHEMA and
// place each anchor in its normalized [0, 1] position on the source
// image. Source part for app.js. Run `npm run build` after editing.
//
// Anchors live between detection and POM generation: Detect Sketch seeds
// them, the TD drags any wrong ones, the POM generator reads them. The
// schema-driven layout means a new anchor name does not require new
// seeding code, only a row in auto_mode_rules/anchor-schema.json.

  // -------- Anchor layer (Phase 2 of the offline engine) --------
  //
  // Anchors live between detection and POM generation. Detect Sketch seeds
  // them with rough positions; the TD drags any wrong ones; the POM
  // generator then reads anchor positions to lay down 16 draft lines.
  // Anchors x/y are normalized [0, 1] in the source image's pixel space, so
  // they travel with the image (pan / zoom / resize / save).

  function seedAnchorsFromDetection(detection, sourceImage, options) {
    if (!detection || !detection.bbox || !sourceImage) return [];

    const views = Array.isArray(detection.views) && detection.views.length
      ? detection.views
      : (Array.isArray(detection.viewBoxes) ? detection.viewBoxes : []);
    // Prefer the explicit front/back classification produced by detection.
    // Older detection blobs (no classifier output) fall back to "primary view
    // is front, largest non-primary is back" so saved projects still load.
    const frontIdx = Number.isFinite(detection.frontViewIndex) && detection.frontViewIndex >= 0
      ? detection.frontViewIndex
      : (Number.isFinite(detection.primaryViewIndex) ? detection.primaryViewIndex : 0);
    const frontView = views[frontIdx] || detection.bbox;
    const frontInnerView = findDetectionViewByRole(detection, 'front_inner');
    let backView = null;
    if (Number.isFinite(detection.backViewIndex) && detection.backViewIndex >= 0) {
      backView = views[detection.backViewIndex] || null;
    } else if (views.length > 1) {
      const fallback = views
        .map((view, index) => ({ view, index }))
        .filter(item => item.index !== frontIdx)
        .sort((a, b) => (b.view.count || 0) - (a.view.count || 0))[0];
      backView = fallback ? fallback.view : null;
    }
    const inView = (view, rx, ry) => ({
      x: clamp01(view.x + view.width * rx),
      y: clamp01(view.y + view.height * ry),
    });
    const roleByKind = Object.create(null);
    for (const schema of ANCHOR_SCHEMA) {
      roleByKind[schema.kind] = defaultViewRoleForAnchorKind(schema.kind);
    }

    const bb = detection.bbox;
    const left  = bb.x;
    const right = bb.x + bb.width;
    const top   = bb.y;
    const halfW = bb.width / 2;
    const ax    = detection.axisX;
    const band  = detection.bandY;
    // Chest fallback: 30% down from bbox top if detection didn't surface one.
    const chest = detection.chestY != null
      ? detection.chestY
      : top + bb.height * 0.30;
    // Cup-bottom (cradle) fallback: midpoint between chest and band.
    const cradle = detection.cradleY != null
      ? detection.cradleY
      : chest + (band - chest) * 0.85;
    // Mid-cup y for inner-cup-width placement.
    const cupMid = chest + (band - chest) * 0.55;

    // Side seams: prefer detected columns; fall back to bbox edges with a
    // small inset so the seed doesn't sit literally on the bbox line.
    const sideL = detection.sideLeftX  != null ? detection.sideLeftX  : clamp01(left  + bb.width * 0.02);
    const sideR = detection.sideRightX != null ? detection.sideRightX : clamp01(right - bb.width * 0.02);

    const det = detection.confidence || {};

    // Inner cup sits on the side with the stronger local cup signal. Default
    // to the left cup because the bundled reference sketch shows it clearly.
    const icSide = (det.apexRight || 0) > (det.apexLeft || 0) + 0.08 ? +1 : -1;
    const icX    = ax + icSide * halfW * 0.12;
    const icHalf = halfW * 0.18;
    // POM 14 (shoulder-strap length) is a curved front-to-back strap path:
    // apex-left = front cup/strap join, strap-bottom = back strap end. The back
    // end seeds only inside the back-view branch below; a front-only sketch has
    // no back end, so POM 14 → REVIEW_ONLY.

    // POM 6 rescue: when the direct CF-seam detector missed (no cradleCfTop)
    // but the bottom-cup cradle seam WAS found (cradleCupTop — the POM 7 top),
    // extend that detected seam horizontally to the CF axis as an APPROXIMATE
    // POM 6 top. It seeds low-confidence + reviewRequired (see confByKind /
    // sourceByKind below) so the TD still verifies; this only replaces a hard
    // REVIEW_ONLY demotion with a reviewable starting line, and degrades
    // gracefully — POM 6 stays REVIEW_ONLY when cradleCupTop is also missing.
    // No rule-JSON change: cf-bottom still derives onto the band line via the
    // existing anchor-schema drop_to_line rule.
    const cradleCfFromCupSeam = !detection.cradleCfTop && !!detection.cradleCupTop;

    // Gore bottom (POM 6/8 cradle-cf-top refinement). detection.cradleCfTop pins
    // to the global cradle ROW (the strongest horizontal band), which sits a
    // touch BELOW the true cup↔cradle seam at CF. detection.contours (traced by
    // seed time) outlines that seam as a short horizontal contour crossing the
    // CF axis; snap cradle-cf-top's y UP to it so POM 8 (cup-at-CF) ends and
    // POM 6 (cradle-at-CF) starts at the real gore bottom. Returns y or null.
    const goreBottomYFromContours = () => {
      const C = detection.contours;
      if (!C || !Array.isArray(C.paths) || detection.axisX == null) return null;
      const axisX = detection.axisX;
      const ubY = detection.underbustY != null ? detection.underbustY
        : (detection.chestY != null ? detection.chestY : 0);
      const bY = detection.bandY != null ? detection.bandY : 1;
      if (!(bY > ubY)) return null;
      const lo = ubY + (bY - ubY) * 0.15;   // clearly below the underbust seam
      const hi = bY - (bY - ubY) * 0.05;    // clearly above the band
      let best = null;
      for (const p of C.paths) {
        const b = p && p.bbox; if (!b) continue;
        const minX = b.x, maxX = b.x + b.width, midY = b.y + b.height / 2;
        if (!(minX < axisX - 0.01 && maxX > axisX + 0.01)) continue; // straddles CF
        if (b.height > 0.12 || b.width < 0.03) continue;             // horizontal seam
        if (midY < lo || midY > hi) continue;                        // cradle region
        if (!best || midY < best) best = midY;                       // topmost = gore bottom
      }
      return best != null ? clamp01(best) : null;
    };
    const detCradleCfY = detection.cradleCfTop ? detection.cradleCfTop.y : null;
    const goreBottomY = goreBottomYFromContours();
    // Only snap UP to the seam (never below the detected cradle row).
    const cradleCfTopY = (detCradleCfY != null && goreBottomY != null && goreBottomY < detCradleCfY)
      ? goreBottomY
      : detCradleCfY;

    let seeds = {
      'cf-top':         { x: ax, y: clamp01(top + bb.height * 0.04) },
      'cf-bottom':      { x: ax, y: clamp01(band) },
      // cradle-cf-top: seeded from direct CF-seam detection when present;
      // otherwise from the POM 7 cradle seam projected to the CF axis (the
      // cradleCfFromCupSeam rescue). Missing BOTH means POM 6 stays REVIEW_ONLY.
      ...(detection.cradleCfTop
        ? { 'cradle-cf-top': {
            x: clamp01(detection.cradleCfTop.x),
            y: clamp01(cradleCfTopY != null ? cradleCfTopY : detection.cradleCfTop.y),
          } }
        : (cradleCfFromCupSeam
          ? { 'cradle-cf-top': {
              x: clamp01(ax),
              y: clamp01(detection.cradleCupTop.y),
            } }
          : {})),
      // cradle-cup-top / -bottom: seeded ONLY when the bottom-cup detector
      // found ink support both at the cradle row and the band row (away from
      // CF and side seam). No horizontal-ratio fallback — missing means POM 7
      // demotes to REVIEW_ONLY via the missing-anchor guard.
      ...(detection.cradleCupTop && detection.cradleCupBottom
        ? {
            'cradle-cup-top': {
              x: clamp01(detection.cradleCupTop.x),
              y: clamp01(detection.cradleCupTop.y),
            },
            'cradle-cup-bottom': {
              x: clamp01(detection.cradleCupBottom.x),
              y: clamp01(detection.cradleCupBottom.y),
            },
          }
        : {}),
      'band-left':      { x: clamp01(left),  y: clamp01(band) },
      'band-right':     { x: clamp01(right), y: clamp01(band) },
      'chest-left':     { x: clamp01(left),  y: clamp01(chest) },
      'chest-right':    { x: clamp01(right), y: clamp01(chest) },
      'inner-cup-top':    { x: clamp01(icX), y: clamp01(chest + (band - chest) * 0.10) },
      'inner-cup-bottom': { x: clamp01(icX + icSide * halfW * 0.02), y: clamp01(cradle) },
      'inner-cup-left':   { x: clamp01(icX - icHalf), y: clamp01(cupMid) },
      'inner-cup-right':  { x: clamp01(icX + icHalf), y: clamp01(cupMid) },
      'side-top':       { x: clamp01(sideR), y: clamp01(chest) },
      'side-bottom':    { x: clamp01(sideR), y: clamp01(band) },
      'back-top':       { x: clamp01(sideL), y: clamp01(chest) },
      'back-bottom':    { x: clamp01(sideL), y: clamp01(band) },
    };

    // Prefer ink-derived inner-cup top / side-top from the audit-driven
    // detectors. Each helper returns null when the signal is too weak, so
    // formula-based fallbacks below still apply.
    //
    // Per rule.md POM 9/10: the inner-cup anchors must come from the shared
    // cupModel (one side, one view, derived from real structure) — NOT from
    // a "topmost dark pixel" snap. cupModel is preferred wherever it is
    // present and not 'hidden'. The legacy innerCupTopInk is kept only as a
    // last-resort fallback for sketches where the cupModel can't be built
    // (e.g. apex + cradle-cup both missing) AND the front_inner view branch
    // below isn't used either.
    const cupModel = detection.cupModel || null;
    const cupModelUsable = !!(cupModel && cupModel.visibility !== 'hidden'
      && cupModel.topPoint && cupModel.bottomPoint
      && cupModel.innerEdge && cupModel.outerEdgeNearArmhole);
    const innerCupTopInk = detection.innerCupTop || null;
    const sideTopRightInk = detection.sideTopRight || null;
    const sideTopLeftInk  = detection.sideTopLeft  || null;
    const backPanelInk = detection.backPanel || null;
    const backPanelHeightInk = detection.backPanelHeight || null;

    // POM 9/10 inner-cup endpoints from the shared cupModel, in source-image
    // [0,1] space. Returns null when the model isn't usable (hidden or missing
    // an endpoint) so callers fall back to their own heuristics. inner-cup-left
    // always gets the smaller x so canvas geometry stays "left → right"
    // regardless of which cup side the model picked. Single source of truth for
    // both the frontView and frontInnerView branches below.
    const innerCupFromCupModel = (cm) => {
      if (!(cm && cm.visibility !== 'hidden'
            && cm.topPoint && cm.bottomPoint
            && cm.innerEdge && cm.outerEdgeNearArmhole)) {
        return null;
      }
      const a = cm.innerEdge;
      const b = cm.outerEdgeNearArmhole;
      const leftPt  = a.x <= b.x ? a : b;
      const rightPt = a.x <= b.x ? b : a;
      return {
        top:    { x: clamp01(cm.topPoint.x),    y: clamp01(cm.topPoint.y) },
        bottom: { x: clamp01(cm.bottomPoint.x), y: clamp01(cm.bottomPoint.y) },
        left:   { x: clamp01(leftPt.x),  y: clamp01(leftPt.y) },
        right:  { x: clamp01(rightPt.x), y: clamp01(rightPt.y) },
      };
    };

    // Contour-based cup INNER seam (POM 10 width). buildCupModel runs BEFORE the
    // vector trace, so its innerEdge is a pixel guess that a solid center-gore
    // detail (CF seam, bow) can pull toward the CF axis — leaving the endpoint
    // floating in the gore instead of on the cup. detection.contours is traced
    // by the time we seed, so use the cup panel's outline: its edge nearest the
    // axis is the true inner seam. Returns the seam x (normalized) or null.
    const cupInnerSeamFromContours = (cm) => {
      const C = detection.contours;
      if (!C || !Array.isArray(C.paths) || !cm) return null;
      const side = cm.side;
      const axisX = detection.axisX;
      if (axisX == null) return null;
      const rowY = cm.innerEdge ? cm.innerEdge.y : (cm.centerPoint ? cm.centerPoint.y : null);
      if (rowY == null) return null;
      const cupCenterX = cm.centerPoint ? cm.centerPoint.x
        : (cm.outerEdgeNearArmhole ? (axisX + cm.outerEdgeNearArmhole.x) / 2 : null);
      if (cupCenterX == null) return null;
      const fv = frontView;
      const viewW = fv ? fv.width : 1;
      const viewH = fv ? fv.height : 1;
      // Pick the largest cup-side panel contour that spans the width row.
      let best = null;
      for (const p of C.paths) {
        const b = p && p.bbox; if (!b) continue;
        const bMinX = b.x, bMaxX = b.x + b.width, bMinY = b.y, bMaxY = b.y + b.height;
        const cx = (bMinX + bMaxX) / 2;
        if (side < 0 ? cx >= axisX : cx <= axisX) continue;        // cup side only
        if (b.width > viewW * 0.6) continue;                       // not the whole outline
        if (b.height < viewH * 0.20) continue;                     // a real cup panel
        if (rowY < bMinY - 0.02 || rowY > bMaxY + 0.02) continue;  // spans the width row
        const area = b.width * b.height;
        if (!best || area > best.area) best = { area, path: p };
      }
      if (!best) return null;
      // Sample the panel outline and take where it ACTUALLY crosses y = rowY.
      // The bbox horizontal extreme (bMaxX/bMinX) sits at the panel's widest
      // row — the apex, not rowY — so using it floated the endpoint ~17px
      // off-ink and inflated cup width (~+7.5% on demo5). The inner seam is the
      // crossing nearest the CF axis, on the cup side, off-axis. A crossing at
      // rowY is by construction on the traced ink, so this doubles as the
      // "must lie on ink at rowY" gate: no valid crossing → null → fall back.
      const samples = samplePathPoints(best.path);
      const n = samples.length;
      if (n < 2) return null;
      let innerX = null;
      for (let i = 0; i < n; i += 1) {
        const a = samples[i];
        const c = samples[(i + 1) % n];         // closed contour: wrap to start
        const da = a.y - rowY, dc = c.y - rowY;
        if ((da > 0 && dc > 0) || (da < 0 && dc < 0)) continue;  // no crossing
        if (a.y === c.y) continue;                               // horizontal seg
        const t = da / (a.y - c.y);             // = (rowY - a.y) / (c.y - a.y)
        const x = a.x + t * (c.x - a.x);
        // Keep only crossings between the cup center and just inside the axis.
        const ok = side < 0
          ? (x > cupCenterX && x < axisX - 0.005)
          : (x < cupCenterX && x > axisX + 0.005);
        if (!ok) continue;
        // Inner seam = the crossing nearest the CF axis on the cup side.
        if (innerX == null) innerX = x;
        else innerX = side < 0 ? Math.max(innerX, x) : Math.min(innerX, x);
      }
      return innerX == null ? null : clamp01(innerX);
    };

    // Pull POM 10's inner endpoint onto the contour-detected cup inner seam,
    // then re-clamp the POM 9 bottom to stay between the endpoints (A5).
    // The cup-panel contour edge IS the cup↔gore inner seam, so trust it over
    // the cupModel's pre-trace pixel guess in EITHER direction: the guess can
    // land too close to the CF axis (a solid gore detail pulling it in) OR too
    // far INTO the cup (a fixed gore inset that falls short of the real seam,
    // e.g. a molded/seamed bra with a distinct cup panel). The only constraint
    // is that the inner endpoint stays ordered against the outer endpoint;
    // cupInnerSeamFromContours already keeps seamX between the cup center and
    // just inside the CF axis, so it can't collide with the gore or cross over.
    const applyContourInnerSeam = (pts, cm) => {
      if (!pts || !cm) return pts;
      const seamX = cupInnerSeamFromContours(cm);
      if (seamX == null) return pts;
      let { top, bottom, left, right } = pts;
      if (cm.side < 0) {
        // left cup: inner endpoint = right (nearer the CF axis)
        if (seamX > left.x) right = { x: clamp01(seamX), y: right.y };
      } else {
        // right cup: inner endpoint = left (nearer the CF axis)
        if (seamX < right.x) left = { x: clamp01(seamX), y: left.y };
      }
      const lo = Math.min(left.x, right.x), hi = Math.max(left.x, right.x);
      bottom = { x: clamp01(Math.max(lo, Math.min(hi, bottom.x))), y: bottom.y };
      return { top, bottom, left, right };
    };

    if (frontView && frontView.width > 0 && frontView.height > 0) {
      const f = frontView;
      // Prefer ink-derived endpoints (chest L/R, band L/R, CF top) from the
      // detection pass; fall back to view-box ratios when the walker didn't
      // find ink. Ratios come from bra technical-sketch geometry — they map
      // a fitted view box to landmarks a TD usually expects.
      // In a typical flat technical sketch the POM 3 "chest line" is drawn at
      // the cup-bottom seam (underbust ridge), not at the strap-zigzag row.
      // The underbust seam is detected separately via longest-run scoring so
      // dense lace bands don't beat it. Prefer it whenever the detector found
      // a confident seam; fall back to the upper chest row otherwise.
      const chestSeedY = detection.underbustY != null
        ? detection.underbustY
        : (detection.chestY != null ? detection.chestY : (f.y + f.height * 0.615));
      const chestSeedLeftX = detection.underbustLeftX != null
        ? detection.underbustLeftX
        : (detection.chestLeftX != null ? detection.chestLeftX : null);
      const chestSeedRightX = detection.underbustRightX != null
        ? detection.underbustRightX
        : (detection.chestRightX != null ? detection.chestRightX : null);
      const bandYf  = detection.bandY  != null ? detection.bandY  : (f.y + f.height * 0.978);
      const useChestL = chestSeedLeftX  != null ? { x: chestSeedLeftX,  y: chestSeedY } : inView(f, 0.004, 0.615);
      const useChestR = chestSeedRightX != null ? { x: chestSeedRightX, y: chestSeedY } : inView(f, 0.990, 0.605);
      const useBandL  = detection.bandLeftX   != null ? { x: detection.bandLeftX,   y: bandYf  } : inView(f, 0.063, 0.978);
      const useBandR  = detection.bandRightX  != null ? { x: detection.bandRightX,  y: bandYf  } : inView(f, 0.936, 0.978);
      const useCfTop  = detection.cfTopY      != null ? { x: detection.axisX,       y: detection.cfTopY }
                                                      : inView(f, 0.505, 0.485);
      // POM 9 / POM 10 inner-cup anchors. Rule.md requires both to belong to
      // ONE cup model — same side, same view, real structure evidence (apex
      // + cup-bottom seam). The cupModel built upstream encodes that decision.
      // Source order:
      //   1. cupModel.topPoint / bottomPoint / innerEdge / outerEdge — when
      //      the cup model is usable (direct or inferred visibility).
      //   2. legacy innerCupTopInk only as a last resort. This path is a
      //      first-dark-pixel snap and rule.md says to replace it; we keep it
      //      so styles where no apex/seam fires but ink still suggests a cup
      //      arc don't lose the row entirely.
      //   3. view-box ratio fallback as the final fallback.
      // When the cupModel is 'hidden' AND no innerCupTopInk fires, we leave
      // the seed at the top-level formula default so the requiredAnchors
      // guard demotes POM 9/10 to REVIEW_ONLY (POM 9/10 anchors will then
      // pass the check, but the line itself would be a ratio guess — the
      // guard runs in auto-drafts.js on missing anchors only).
      // Note: when the cupModel uses the RIGHT cup, innerEdge sits to the
      // right of the CF axis and outerEdgeNearArmhole sits to the left of
      // the right side seam. We always assign inner-cup-left = the SMALLER x
      // of the two endpoints so the geometry stays "left horizontal end →
      // right horizontal end" in canvas space, regardless of which cup side
      // the model picked.
      // Adaptive best-guess for the fallbacks: when the cupModel can't be
      // built, POM 10 width must still track the real sketch, not a constant
      // fraction of the view box. The CF axis (axisX → gore/inner edge) and the
      // detected side seams (sideL/sideR → outer edge) are per-sketch signals,
      // so span the chosen cup between them. This replaces the old fixed
      // inView(f, 0.022/0.496, …) ratios that produced the same wrong width on
      // every sketch. inner-cup-left always takes the smaller x so canvas
      // geometry stays "left → right" regardless of the picked cup side.
      const axSafe = (ax != null && Number.isFinite(ax)) ? ax : clamp01(left + halfW);
      const landmarkInnerCupWidth = (cupIsLeft, widthY) => {
        const seamX = cupIsLeft ? sideL : sideR;
        const axisPad = Math.max(0.005, halfW * 0.03); // keep off the CF gore
        const seamPad = Math.max(0.004, halfW * 0.02); // keep off the side seam
        const innerX = cupIsLeft ? clamp01(axSafe - axisPad) : clamp01(axSafe + axisPad);
        const outerX = cupIsLeft ? clamp01(seamX + seamPad) : clamp01(seamX - seamPad);
        return {
          left:  { x: Math.min(innerX, outerX), y: clamp01(widthY) },
          right: { x: Math.max(innerX, outerX), y: clamp01(widthY) },
          centerX: clamp01((axSafe + seamX) / 2),
        };
      };
      let useIcTop, useIcBottomFromCup, useIcLeft, useIcRight;
      const frontCupPts = applyContourInnerSeam(innerCupFromCupModel(cupModel), cupModel);
      if (frontCupPts) {
        // POM 9/10 endpoints from the shared cup model — see
        // innerCupFromCupModel. POM 10 cup width spans the cup's FULL
        // horizontal extent (innerEdge just inside CF gore ↔ outerEdge just
        // inside the side seam); inner-cup-left always takes the smaller x so
        // canvas geometry stays "left → right" regardless of the picked side.
        useIcTop = frontCupPts.top;
        useIcBottomFromCup = frontCupPts.bottom;
        useIcLeft = frontCupPts.left;
        useIcRight = frontCupPts.right;
      } else if (innerCupTopInk) {
        // Legacy fallback — cupModel could not be built but ink suggests a cup
        // top. Anchor POM 9 on the detected ink top (x shared top→bottom so the
        // height reads vertical, bottom on the detected cradle row) and derive
        // POM 10 width from the CF axis + side seam on the ink-top's cup side.
        const inkX = clamp01(innerCupTopInk.x);
        const cupIsLeft = inkX <= axSafe;
        const widthY = clamp01(innerCupTopInk.y + Math.max(0.05, (band - innerCupTopInk.y) * 0.45));
        const w = landmarkInnerCupWidth(cupIsLeft, widthY);
        useIcTop = { x: inkX, y: clamp01(innerCupTopInk.y) };
        useIcLeft  = w.left;
        useIcRight = w.right;
        useIcBottomFromCup = { x: inkX, y: clamp01(cradle) };
      } else {
        // Pure fallback — no cupModel and no ink top. Still avoid fixed view
        // ratios: estimate the cup from detected landmarks (CF axis, side
        // seams, chest/cradle) on the default cup side so the guess shifts per
        // sketch. This seed is usually deleted (REVIEW_ONLY) for a lone front
        // view or overwritten by the front_inner branch; kept adaptive for the
        // remaining cases and older detections without a cupModel field.
        const cupIsLeft = icSide < 0;
        const midY = clamp01((chest + cradle) / 2);
        const w = landmarkInnerCupWidth(cupIsLeft, midY);
        useIcTop = { x: w.centerX, y: clamp01(chest) };
        useIcLeft  = w.left;
        useIcRight = w.right;
        useIcBottomFromCup = { x: w.centerX, y: clamp01(cradle) };
      }
      // Side-top: underarm notch detected by walking up from the side-seam
      // column. Falls back to chest-line height on the side seam.
      const useSideTop = sideTopRightInk
        ? { x: clamp01(sideTopRightInk.x), y: clamp01(sideTopRightInk.y) }
        : { x: clamp01(sideR), y: clamp01(chest) };
      const useSideBot = detection.sideBottomRight
        ? { x: clamp01(detection.sideBottomRight.x), y: clamp01(detection.sideBottomRight.y) }
        : { x: clamp01(sideR), y: clamp01(band) };
      // POM 16 = apex distance across the cup/front-strap joining seams,
      // measured inner-edge to inner-edge — prefer the inner-edge points,
      // falling back to the join center when the detector only has that.
      const apexLsrc = detection.apexLeftInner || detection.apexLeft;
      const apexRsrc = detection.apexRightInner || detection.apexRight;
      const useApexL = apexLsrc
        ? { x: clamp01(apexLsrc.x), y: clamp01(apexLsrc.y) }
        : null;
      const useApexR = apexRsrc
        ? { x: clamp01(apexRsrc.x), y: clamp01(apexRsrc.y) }
        : null;
      // CF-bottom: bandY is the highest-confidence horizontal signal in the
      // pipeline. Prefer (axisX, bandY) over the view-box fraction so POMs 5
      // and 6 land on the actual band ink.
      const useCfBottom = (detection.bandY != null && detection.axisX != null)
        ? { x: clamp01(detection.axisX), y: clamp01(detection.bandY) }
        : inView(f, 0.505, 0.985);
      // Inner-cup-bottom: cradleY is the clean horizontal contour between
      // chest and band. When the cupModel is usable, its bottomPoint already
      // sits on the selected cup side at the cup-bottom seam — share x with
      // POM 9 (cupModel.topPoint or seam x), not the CF axis. Falls back to
      // (axisX, cradleY) when the cupModel is hidden so existing dependents
      // (POM 6 cup-bottom projection) keep their behavior.
      const useIcBottom = useIcBottomFromCup
        ? useIcBottomFromCup
        : ((detection.cradleY != null && detection.axisX != null)
          ? { x: clamp01(detection.axisX), y: clamp01(detection.cradleY) }
          : inView(f, 0.227, 0.888));
      seeds = {
        ...seeds,
        'cf-top':          useCfTop,
        'cf-bottom':       useCfBottom,
        'band-left':       useBandL,
        'band-right':      useBandR,
        'chest-left':      useChestL,
        'chest-right':     useChestR,
        'inner-cup-top':   useIcTop,
        'inner-cup-bottom':useIcBottom,
        'inner-cup-left':  useIcLeft,
        'inner-cup-right': useIcRight,
        'side-top':        useSideTop,
        'side-bottom':     useSideBot,
      };
      if (useApexL && useApexR) {
        seeds['apex-left'] = useApexL;
        seeds['apex-right'] = useApexR;
      }
      // A4: side-top/side-bottom default to viewRole 'back', and the back branch
      // re-seeds them from back-view coordinates and leaves that role correct.
      // But on a FRONT-ONLY sketch the back branch never runs, so these anchors
      // carry the FRONT coordinates seeded just above while still labelled
      // 'back' — which mislabels their view (POM 11) and, worse, files their
      // learning residuals in the side-*|back bucket where they collide with
      // genuine back-view corrections. Tag them to the view they came from.
      if (!backView) {
        roleByKind['side-top'] = 'front_outer';
        roleByKind['side-bottom'] = 'front_outer';
      }
    }

    if (frontInnerView && frontInnerView.width > 0 && frontInnerView.height > 0) {
      const i = frontInnerView;
      const innerBandY = i.y + i.height * 0.92;
      const innerChestY = i.y + i.height * 0.22;
      const innerCupMidY = i.y + i.height * 0.54;
      // Front-inner view is the cup model's preferred source per rule.md
      // ("Prefer front_inner view if it exists and the cup is clearly
      // visible"). When a front_inner view exists buildCupModel classifies
      // visibility as 'direct' and produces ink-derived endpoints — those track
      // the actual cup and differ per sketch, so we MUST prefer them over the
      // view-box ratios (which depend only on the view box and are constant
      // across sketches). Precedence: cupModel > innerCupTopInk (kept as-is
      // from the frontView branch — do not clobber) > view-box ratio fallback.
      // Computed here rather than reused from the frontView branch because a
      // sketch can have a front_inner view without a front_outer view, so that
      // branch may not have run. The role override below tells the rest of the
      // pipeline these anchors belong to the front_inner view regardless of
      // which source produced their coordinates.
      const innerCupPts = applyContourInnerSeam(innerCupFromCupModel(cupModel), cupModel);
      if (innerCupPts) {
        seeds = {
          ...seeds,
          'inner-cup-top':    innerCupPts.top,
          'inner-cup-bottom': innerCupPts.bottom,
          'inner-cup-left':   innerCupPts.left,
          'inner-cup-right':  innerCupPts.right,
        };
      } else if (!innerCupTopInk) {
        // No usable cup model and no ink heuristic — fall back to view-box
        // ratios. The view box isolates the inner cup, so these still land on
        // cup structure (a legitimate direct-view guess, not fabrication).
        seeds = {
          ...seeds,
          'inner-cup-top':    inView(i, 0.50, 0.18),
          'inner-cup-bottom': inView(i, 0.50, 0.82),
          'inner-cup-left':   inView(i, 0.20, 0.53),
          'inner-cup-right':  inView(i, 0.80, 0.53),
        };
      }
      // else: innerCupTopInk fired but the cupModel is hidden — keep the
      // innerCupTopInk-derived seeds the frontView branch already set (rule.md
      // legacy heuristic); do not overwrite them with view-box ratios.
      roleByKind['inner-cup-top'] = 'front_inner';
      roleByKind['inner-cup-bottom'] = 'front_inner';
      roleByKind['inner-cup-left'] = 'front_inner';
      roleByKind['inner-cup-right'] = 'front_inner';
      if (!detection.innerCupTop) {
        detection.innerCupTop = { x: i.x + i.width * 0.50, y: innerChestY };
      }
      if (detection.cradleY == null) detection.cradleY = innerBandY;
      if (detection.underbustY == null) detection.underbustY = innerCupMidY;
    }

    // Demote POM 9 / POM 10 to REVIEW_ONLY when no coherent cup model could
    // be built. The requiredAnchors guard in auto-drafts.js promotes a row to
    // REVIEW_ONLY when ANY required anchor is missing from the seed list, so
    // we remove the inner-cup-* seeds entirely in the "hidden + no fallback"
    // case (per rule.md "If REVIEW_ONLY, do not fabricate start/end from
    // fixed ratios"). When the front_inner view fires the seeds above are
    // direct evidence (not ratio fabrication) and we keep them. When the
    // legacy innerCupTopInk fires we keep them too — that's a heuristic but
    // it carries some structure information, and the existing flow has shown
    // it usable on a number of sketches.
    const hasFrontInnerSeedView = !!(frontInnerView && frontInnerView.width > 0 && frontInnerView.height > 0);
    const anchorGateWillDelete = !!(cupModel && cupModel.visibility === 'hidden' && !innerCupTopInk && !hasFrontInnerSeedView);
    // Anchor-gate diagnostic — which source path POM 9/10 ended up using.
    // Surfaced via detection.debug.cupAnchorGate so debug consumers (rule.md
    // 'why was this row demoted?' question) can see the gate decision without
    // re-running detection.
    const cupAnchorGate = {
      cupModelPresent: !!cupModel,
      cupModelVisibility: cupModel ? cupModel.visibility : null,
      cupModelUsable,
      innerCupTopInkPresent: !!innerCupTopInk,
      hasFrontInnerView: hasFrontInnerSeedView,
      pathTaken: anchorGateWillDelete
        ? 'deleted (POM 9/10 → REVIEW_ONLY)'
        : (cupModelUsable
          ? 'cupModel'
          : (innerCupTopInk
            ? 'innerCupTopInk fallback'
            : (hasFrontInnerSeedView ? 'front_inner view ratios' : 'view-box ratio fallback'))),
      cupModelReason: cupModel ? cupModel.reason : null,
    };
    if (detection && detection.debug && typeof detection.debug === 'object') {
      detection.debug.cupAnchorGate = cupAnchorGate;
    }
    if (anchorGateWillDelete) {
      delete seeds['inner-cup-top'];
      delete seeds['inner-cup-bottom'];
      delete seeds['inner-cup-left'];
      delete seeds['inner-cup-right'];
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Auto Mode] inner-cup-* anchors deleted → POM 9/10 demoted', cupAnchorGate);
      }
    }

    if (backView && backView.width > 0 && backView.height > 0) {
      const b = backView;
      // POM 12 (back center length) is a VERTICAL line down the center-back
      // axis. detection.back is the ink-based center pass on the back view.
      //   * bottom — the band row at center (detected). Correct as-is.
      //   * top    — the TOP of the center-back structure. Use the center-strip
      //              "topmost ink" landmark (backCenter.top.y): it sits ON solid
      //              center-back fabric (closure panel / mesh seam), so it never
      //              floats in an open racerback/scoop cut-out. (An earlier pass
      //              lifted this to chestY, but on open-center backs that row is
      //              empty and the anchor floated above the garment.)
      // Both endpoints share the axis x, so the line is always vertical.
      const backCenter = detection.back || null;
      const bfx = detection.backFeatures || null;
      const backBottom = backCenter && backCenter.bottom
        ? backCenter.bottom
        : inView(b, 0.505, 1.000);
      const backCenterAxisX = (backCenter && backCenter.axisX != null)
        ? backCenter.axisX
        : (bfx && bfx.axisX != null ? bfx.axisX : backBottom.x);
      const backTopY = (backCenter && backCenter.top && backCenter.top.y != null)
        ? backCenter.top.y
        : (bfx && bfx.chestY != null ? bfx.chestY : inView(b, 0.505, 0.769).y);
      const backTop = { x: backCenterAxisX, y: backTopY };
      const backBottomVert = { x: backCenterAxisX, y: backBottom.y };
      // Per-view back features — sideLeftX/RightX are the back's actual side
      // seams; chestY / chestLeftX / chestRightX trace the upper-back strap
      // line; bandY is the back's bottom band row.
      const bf = detection.backFeatures || null;
      const bChestY = bf && bf.chestY != null ? bf.chestY : (b.y + b.height * 0.42);
      const bBandY  = bf && bf.bandY  != null ? bf.bandY  : (b.y + b.height * 0.97);
      // The back-view "side seam" is the OUTLINE column of the back panel,
      // i.e. the left edge of the back view bbox. detectFeaturesInViewBox can
      // report an interior column with strong vertical ink (the panel-attach
      // seam) — that's wrong for POM 11. Use the back bbox left edge with a
      // tiny inset so the seam reads as snapped-to-ink rather than view-box.
      const bSideL  = b.x + b.width * 0.005;
      // POM 15 back-strap distance: prefer the ink-detected strap INNER edges.
      // Falls back to chestLeftX/chestRightX (panel OUTER corners) only when the
      // strap detector finds nothing, then to view-box ratios.
      const bStrapInner = detection.backStrapInner || null;
      const bStrapL = bStrapInner && bStrapInner.left
        ? { x: bStrapInner.left.x, y: bStrapInner.left.y }
        : (bf && bf.chestLeftX  != null ? { x: bf.chestLeftX,  y: bChestY } : inView(b, 0.276, 0.414));
      const bStrapR = bStrapInner && bStrapInner.right
        ? { x: bStrapInner.right.x, y: bStrapInner.right.y }
        : (bf && bf.chestRightX != null ? { x: bf.chestRightX, y: bChestY } : inView(b, 0.729, 0.426));
      // Back-panel top/bottom: prefer the ink-following detector. Falls back
      // to view-box ratios; the old inView(b, 0.232, 1.005) used to clamp the
      // bottom anchor off-image — keep the same fraction but clamp at 0.985
      // so the seed lives inside the box even on a partial back view.
      // POM 13 = strap-joining point → bottom band (vertical). Prefer the
      // dedicated height detector; fall back to the interior-seam-column edges,
      // then to view-box ratios.
      const usePanelTop = backPanelHeightInk && backPanelHeightInk.top
        ? { x: clamp01(backPanelHeightInk.top.x), y: clamp01(backPanelHeightInk.top.y) }
        : (backPanelInk && backPanelInk.top
          ? { x: clamp01(backPanelInk.top.x), y: clamp01(backPanelInk.top.y) }
          : inView(b, 0.225, 0.439));
      const usePanelBot = backPanelHeightInk && backPanelHeightInk.bottom
        ? { x: clamp01(backPanelHeightInk.bottom.x), y: clamp01(backPanelHeightInk.bottom.y) }
        : (backPanelInk && backPanelInk.bottom
          ? { x: clamp01(backPanelInk.bottom.x), y: clamp01(backPanelInk.bottom.y) }
          : inView(b, 0.232, 0.985));
      // Back strap helper landmarks. POM 14 uses strap-bottom as the back end;
      // its front start is apex-left, the cup/strap join. strap-top still marks
      // the top of the back strap for review/debugging.
      const useBackStrapTop = detection.backStrapTop
        ? { x: clamp01(detection.backStrapTop.x), y: clamp01(detection.backStrapTop.y) }
        : inView(b, 0.187, 0.405);
      const useBackStrapBottom = { x: usePanelTop.x, y: usePanelTop.y };
      // POM 11 side seam: follow the back panel's outer outline with ink.
      // side-top is the topmost edge ink; side-bottom follows that seam DOWN to
      // the hem. Real seams slant inward, so the old code (both pinned to the
      // bbox left edge at chest/band rows) drew a vertical line off the seam.
      const backSide = detection.backSide || null;
      const useBackSideTop = backSide && backSide.top
        ? { x: clamp01(backSide.top.x), y: clamp01(backSide.top.y) }
        : (detection.backSideTop
          ? { x: clamp01(detection.backSideTop.x), y: clamp01(detection.backSideTop.y) }
          : { x: clamp01(bSideL), y: clamp01(bChestY) });
      const useBackSideBottom = backSide && backSide.bottom
        ? { x: clamp01(backSide.bottom.x), y: clamp01(backSide.bottom.y) }
        : (detection.backSideBottom
          ? { x: clamp01(detection.backSideBottom.x), y: clamp01(detection.backSideBottom.y) }
          : { x: clamp01(bSideL), y: clamp01(bBandY) });
      seeds = {
        ...seeds,
        'side-top':          useBackSideTop,
        'side-bottom':       useBackSideBottom,
        'back-top':          { x: clamp01(backTop.x),        y: clamp01(backTop.y) },
        'back-bottom':       { x: clamp01(backBottomVert.x), y: clamp01(backBottomVert.y) },
        'back-panel-top':    usePanelTop,
        'back-panel-bottom': usePanelBot,
        'back-strap-left':   { x: clamp01(bStrapL.x), y: clamp01(bStrapL.y) },
        'back-strap-right':  { x: clamp01(bStrapR.x), y: clamp01(bStrapR.y) },
        'strap-top':         useBackStrapTop,
        'strap-bottom':      useBackStrapBottom,
      };
      // Back strap helper anchors live on the back view.
      roleByKind['strap-top'] = 'back';
      roleByKind['strap-bottom'] = 'back';
    }

    // Anchor confidence flows from the underlying detection signal — strong
    // peaks → 'high', weak peaks → 'medium', geometry-only fallbacks → 'low'.
    // Old hardcoded buckets remain as the default when the new fields aren't
    // present (back-compat for any caller that synthesizes a detection).
    const tier = (score, fallback) => {
      if (score == null || score <= 0) return fallback;
      if (score >= 0.5) return 'high';
      if (score >= 0.2) return 'medium';
      return 'low';
    };
    // Inner-cup anchors: score-based tier, but an *inferred* cupModel (no
    // front_inner view — cup built from apex + cradle-cup seam) can never claim
    // 'high'. Capped at 'medium' so the TD isn't shown a confident green dot for
    // a seam we only inferred, even when the contour/seam blend scores well
    // (a high score is confidence in the trace, not proof the view was seen).
    // A 'direct' cupModel keeps the full score-based tier. The plain `tier`
    // fallback can't express this: it only fires when score <= 0, so a strong
    // score bypasses the visibility ceiling entirely.
    const cupTier = (score, cm) => {
      const direct = cm && cm.visibility === 'direct';
      const t = tier(score, direct ? 'high' : 'medium');
      return (!direct && t === 'high') ? 'medium' : t;
    };
    const confByKind = {
      'cf-top':            tier(det.axis, 'medium'),
      'cf-bottom':         tier(det.band, 'high'),
      'cradle-cf-top':     (cradleCfFromCupSeam || detection.cradleCfTopDipProjected)
                             ? 'low'
                             : tier(det.cradleCfTop, 'medium'),
      'cradle-cup-top':    tier(det.cradleCupTop, 'medium'),
      'cradle-cup-bottom': tier(det.cradleCupBottom, 'medium'),
      'band-left':         tier(det.band, 'high'),
      'band-right':        tier(det.band, 'high'),
      'chest-left':        tier(det.chest, 'medium'),
      'chest-right':       tier(det.chest, 'medium'),
      // Inner-cup anchors: 'high' when the cupModel has direct visibility
      // (front_inner view fired), 'medium' when inferred from apex + seam,
      // 'low' on legacy heuristic fallback. The tier function returns the
      // first non-null bucket — we feed it a score derived from cupModel
      // confidences so all four anchors agree on the same tier.
      'inner-cup-top':     (cupModelUsable
                              ? cupTier((cupModel.contourConfidence || 0) * 0.6 + (cupModel.seamConfidence || 0) * 0.4, cupModel)
                              : (innerCupTopInk ? tier(det.innerCupTop, 'medium') : tier(det.chest, 'medium'))),
      'inner-cup-bottom':  (cupModelUsable
                              ? cupTier((cupModel.seamConfidence || 0) * 0.7 + (cupModel.contourConfidence || 0) * 0.3, cupModel)
                              : tier(det.cradle, 'medium')),
      'inner-cup-left':    (cupModelUsable
                              ? cupTier((cupModel.contourConfidence || 0) * 0.5 + (cupModel.seamConfidence || 0) * 0.5, cupModel)
                              : (innerCupTopInk ? tier(det.innerCupTop, 'medium') : 'medium')),
      'inner-cup-right':   (cupModelUsable
                              ? cupTier((cupModel.contourConfidence || 0) * 0.5 + (cupModel.seamConfidence || 0) * 0.5, cupModel)
                              : (innerCupTopInk ? tier(det.innerCupTop, 'medium') : 'medium')),
      'side-top':          sideTopRightInk ? tier(det.sideTopRight, 'medium') : tier(det.sideRight, 'medium'),
      'side-bottom':       tier(det.sideRight, 'medium'),
      'apex-left':         tier(det.apexLeft, 'medium'),
      'apex-right':        tier(det.apexRight, 'medium'),
      // POM 14 is the only contractually-low POM (always verify by hand); floor
      // both strap ends to 'low' so reviewRequired is guaranteed (ADR 0012).
      'strap-top':         'low',
      'strap-bottom':      'low',
      'back-top':          tier(det.back, 'low'),
      'back-bottom':       tier(det.back, 'low'),
      'back-panel-top':    (backPanelHeightInk || backPanelInk) ? tier(det.backPanel, 'medium') : (backView ? 'medium' : 'low'),
      'back-panel-bottom': (backPanelHeightInk || backPanelInk) ? tier(det.backPanel, 'medium') : (backView ? 'medium' : 'low'),
      'back-strap-left':   backView ? 'medium' : 'low',
      'back-strap-right':  backView ? 'medium' : 'low',
    };

    // Per-anchor provenance. 'seam' = direct seam ink (POM 6/7/8 endpoints
    // that pass rule.md L3 evidence). 'silhouette' = mask-derived (axis,
    // band, chest, side seam). 'cupModel' / 'frontInnerView' /
    // 'innerCupTopInkFallback' / 'cupRatioFallback' = which inner-cup path
    // ran (mirrors cupAnchorGate.pathTaken). 'apexJoin' = strap-cup join
    // seam (POM 16, never strap-ring hardware). 'ratio' = view-box ratio
    // fallback. Tests assert 'apex-*' source !== 'strap-ring' and
    // 'inner-cup-*' carries the cup-model path used.
    const cupPath = cupAnchorGate.pathTaken;
    // Cup-model anchors that came from 'inferred' visibility (no front_inner
    // view; cup built from apex + cradle-cup seam) carry lower confidence
    // than 'direct'. Distinguish the two so contract tests can assert
    // "POM 9/10 fell back to front_outer" with reviewRequired=true.
    const cupModelInferred = cupModel && cupModel.visibility === 'inferred';
    const cupSource = cupPath === 'cupModel'
      ? (cupModelInferred ? 'cupModelInferred' : 'cupModel')
      : (cupPath === 'front_inner view ratios'
        ? 'frontInnerView'
        : (cupPath === 'innerCupTopInk fallback'
          ? 'innerCupTopInkFallback'
          : 'cupRatioFallback'));
    const sourceByKind = {
      'cf-top':            detection.cfTopY != null ? 'ink' : 'ratio',
      'cf-bottom':         detection.bandY != null ? 'silhouette' : 'ratio',
      'cradle-cf-top':     cradleCfFromCupSeam
                             ? 'seamProjected'
                             : (detection.cradleCfTopDipProjected ? 'seamDip' : 'seam'),
      'cradle-cup-top':    'seam',
      'cradle-cup-bottom': 'seam',
      'band-left':         detection.bandLeftX != null ? 'ink' : 'silhouette',
      'band-right':        detection.bandRightX != null ? 'ink' : 'silhouette',
      'chest-left':        (detection.underbustLeftX != null || detection.chestLeftX != null) ? 'ink' : 'ratio',
      'chest-right':       (detection.underbustRightX != null || detection.chestRightX != null) ? 'ink' : 'ratio',
      'inner-cup-top':     cupSource,
      'inner-cup-bottom':  cupSource,
      'inner-cup-left':    cupSource,
      'inner-cup-right':   cupSource,
      'side-top':          sideTopRightInk ? 'ink' : 'silhouette',
      'side-bottom':       detection.sideBottomRight ? 'ink' : 'silhouette',
      'apex-left':         detection.apexLeft ? 'apexJoin' : 'ratio',
      'apex-right':        detection.apexRight ? 'apexJoin' : 'ratio',
      'strap-top':         detection.backStrapTop ? 'backStrapInk' : 'ratio',
      'strap-bottom':      (backPanelHeightInk || backPanelInk) ? 'backPanelJoin' : 'ratio',
      'back-top':          (detection.back && detection.back.top) ? 'ink' : 'ratio',
      'back-bottom':       (detection.back && detection.back.bottom) ? 'ink' : 'ratio',
      'back-panel-top':    (backPanelHeightInk || backPanelInk) ? 'ink' : 'ratio',
      'back-panel-bottom': (backPanelHeightInk || backPanelInk) ? 'ink' : 'ratio',
      'back-strap-left':   (detection.backStrapInner && detection.backStrapInner.left)  ? 'ink' : (backView ? 'silhouette' : 'ratio'),
      'back-strap-right':  (detection.backStrapInner && detection.backStrapInner.right) ? 'ink' : (backView ? 'silhouette' : 'ratio'),
    };
    // reviewRequired = the seed is ratio-only OR confidence tier is 'low'.
    // The drafter still respects requiredAnchors for hard-gating; this flag
    // lets the spec panel (and contract tests) mark a drawn line as needing
    // a second look without forcing REVIEW_ONLY.
    const cupId = (detection.cupModel && detection.cupModel.id) || null;

    const list = [];
    for (const schema of ANCHOR_SCHEMA) {
      const seed = seeds[schema.kind];
      if (!seed) continue;
      const source = sourceByKind[schema.kind] || 'unknown';
      const confTier = confByKind[schema.kind] || 'medium';
      // reviewRequired = the seed is ratio-only OR confidence tier is 'low' OR a
      // genuinely-inferred cup anchor is weak (below). The drafter still respects
      // requiredAnchors for hard-gating; this flag lets the spec panel (and contract
      // tests) mark a drawn line as needing a second look without forcing
      // REVIEW_ONLY. A DIRECT cup (source 'cupModel' — real apex + real cup-bottom,
      // or a front_inner cutaway) is trusted at full confidence per the 2026-07-09
      // TD correction; it is no longer down-flagged by a blunt contour+seam
      // threshold (that reintroduced the "penalize a well-drawn front cup" churn).
      // A genuinely INFERRED cup (endpoints placeable but one is only extrapolated
      // — a flat-cradle bottom or a missing apex) is not blanket-flagged. Instead
      // each inner-cup anchor is judged on the structure it actually rests on,
      // so a strong apex + high-contour cup keeps its correct top / left /
      // right trusted (POM 9 start, POM 10 width) and only the anchor whose
      // evidence is genuinely missing is flagged:
      //   - contour poorly traced (no validated apex) → all inner-cup anchors,
      //   - no real cup bottom → inner-cup-bottom only (POM 9 end). The bottom
      //     is real when POM 7 committed a seam (bottomFromSeam) OR a coherent
      //     underwire arc was traced from the ink (bottomFromInk); a bare
      //     flat-cradle-row guess still flags for review.
      //   - top not anchored on a real apex → inner-cup-top only (POM 9 start).
      const cupInferredWeakAnchor = source === 'cupModelInferred'
        && cupModel
        && (
          (cupModel.contourConfidence || 0) < 0.5
          || (schema.kind === 'inner-cup-bottom' && !cupModel.bottomFromSeam && !cupModel.bottomFromInk)
          || (schema.kind === 'inner-cup-top' && !cupModel.topFromApex)
        );
      const reviewRequired = confTier === 'low'
        || source === 'ratio'
        || source === 'seamProjected'
        || source === 'seamDip'
        || source === 'cupRatioFallback'
        || source === 'innerCupTopInkFallback'
        || cupInferredWeakAnchor;
      const record = {
        id: createUniqueAnnotationId(),
        kind: schema.kind,
        name: schema.name,
        group: schema.group,
        x: seed.x,
        y: seed.y,
        sourceImageId: sourceImage.id,
        viewRole: roleByKind[schema.kind] || defaultViewRoleForAnchorKind(schema.kind),
        confidence: confTier,
        autoFilled: true,
        source,
        reviewRequired,
      };
      // Attach the shared cupModel id to inner-cup-* anchors so contract
      // tests can prove POM 9 and POM 10 read from the SAME cup model.
      if (cupId && schema.kind.indexOf('inner-cup-') === 0) {
        record.cupModelId = cupId;
      }
      list.push(record);
    }
    // Learning-loop hook: when enabled, nudge each seeded anchor by the
    // median (detected → corrected) residual recorded from past TD drags.
    // No-op when learning is off or a bucket has fewer than the minimum
    // samples. The geometric rules above are not changed.
    //
    // Phase 2 shadow runs pass { skipLearning: true } so the residual is
    // computed against the unbiased prediction, never against an already-
    // biased one (which would compound the error and make the median drift).
    if (options && options.skipLearning) return list;
    return applyLearningBiasToAnchors(list);
  }

  function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }

  function findDetectionViewByRole(detection, role) {
    const views = Array.isArray(detection && detection.views) && detection.views.length
      ? detection.views
      : (Array.isArray(detection && detection.viewBoxes) ? detection.viewBoxes : []);
    return views.find(v => v && (v.viewRole === role || v.role === role)) || null;
  }

  function defaultViewRoleForAnchorKind(kind) {
    if (/^back-|^back$/.test(kind)) return 'back';
    if (kind === 'side-top' || kind === 'side-bottom') return 'back';
    if (kind === 'strap-top' || kind === 'strap-bottom') return 'back';
    if (kind.indexOf('inner-cup-') === 0) return 'front_outer';
    return 'front_outer';
  }

  function resetAnchorsToDetection() {
    const detection = state.autoMode.detection;
    if (!detection) {
      showToast('Run Detect Sketch first.');
      return;
    }
    const sourceImage = getImageById(detection.sourceImageId) || pickAutoSourceImage();
    if (!sourceImage) {
      showToast('No source image for the current detection.');
      return;
    }
    state.autoMode.anchors = seedAnchorsFromDetection(detection, sourceImage);
    state.autoMode.anchorSelectedId = null;
    state.autoMode.anchorsHidden = false;
    pushHistoryIfChanged();
    updateUI();
    requestRender();
    showToast('Anchors reset from detection.');
  }
