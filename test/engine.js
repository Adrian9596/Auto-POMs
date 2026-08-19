(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MeasurementTestEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const POM_NAMES = {
    "1": "1/2 Bottom band - Relax", "2": "1/2 Bottom band - Extend",
    "3": "1/2 chest - Measure straight", "4": "1/2 chest - Extend",
    "5": "Center front height", "6": "Cradle height at center front",
    "7": "Cradle height at bottom cup", "8": "Cup height at center front",
    "9": "Cup height", "10": "Cup width", "11": "Side seam length",
    "12": "Back center length", "13": "Back panel height",
    "14": "Shoulder strap length", "15": "Back strap distances",
    "16": "Front apex distance"
  };
  const POM_VIEW_ROLES = {
    "1":"front_outer", "2":"front_outer", "3":"front_outer", "4":"front_outer",
    "5":"front_outer", "6":"front_outer", "7":"front_outer", "8":"front_outer",
    "9":"front_outer", "10":"front_outer", "11":"back", "12":"back",
    "13":"back", "14":"front_to_back", "15":"back", "16":"front_outer"
  };
  const POM_ANCHORS = {
    "1":["band-left-relax","band-right-relax"], "2":["band-left-extend","band-right-extend"],
    "3":["chest-left","chest-right"], "4":["chest-left-extend","chest-right-extend"],
    "5":["cf-top","cf-bottom"], "6":["cradle-cf-top","cradle-cf-bottom"],
    "7":["bottom-cup-top","bottom-cup-bottom"], "8":["cup-cf-top","cup-cf-bottom"],
    "9":["cup-height-top","cup-height-bottom"], "10":["cup-width-inner","cup-width-outer"],
    "11":["side-top","side-bottom"], "12":["back-cf-top","back-cf-bottom"],
    "13":["back-panel-top","back-panel-bottom"], "14":["front-strap-join","back-strap-join"],
    "15":["back-strap-left","back-strap-right"], "16":["apex-left","apex-right"]
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function round(value, digits) {
    if (!Number.isFinite(value)) return null;
    const m = 10 ** (digits == null ? 3 : digits);
    return Math.round(value * m) / m;
  }
  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  function fractionToNumber(raw) {
    if (raw == null) return null;
    const text = String(raw).trim().replace(/\s+/g,' ');
    const mixed = text.match(/^(\d+)[ -]+(\d+)\/(\d+)$/);
    if (mixed) {
      const denominator = Number(mixed[3]);
      return denominator > 0 ? Number(mixed[1]) + Number(mixed[2]) / denominator : null;
    }
    const fraction = text.match(/^(\d+)\/(\d+)$/);
    if (fraction) return Number(fraction[2]) > 0 ? Number(fraction[1]) / Number(fraction[2]) : null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  }
  function detectRegularRowCount(points) {
    const candidates=(points||[]).map(point=>({x:Number(point.x),y:Number(point.y)}))
      .filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=.38&&point.x<=.62&&point.y>=.55&&point.y<=1);
    if(candidates.length<3)return 0;
    const tracks=[];
    for(const point of candidates.slice().sort((a,b)=>a.x-b.x)){
      let track=tracks.find(row=>Math.abs(row.meanX-point.x)<=.025);
      if(!track){track={meanX:point.x,points:[]};tracks.push(track);}
      track.points.push(point);track.meanX=track.points.reduce((sum,row)=>sum+row.x,0)/track.points.length;
    }
    let best=0;
    for(const track of tracks){
      const groups=[];
      for(const y of track.points.map(point=>point.y).sort((a,b)=>a-b)){
        let group=groups[groups.length-1];
        if(!group||Math.abs(y-group.reduce((sum,value)=>sum+value,0)/group.length)>.018){group=[];groups.push(group);}
        group.push(y);
      }
      const centers=groups.map(group=>group.reduce((sum,value)=>sum+value,0)/group.length);
      if(centers.length<3||centers.length>6)continue;
      const gaps=centers.slice(1).map((value,index)=>value-centers[index]);
      const smallest=Math.min(...gaps),largest=Math.max(...gaps);
      if(smallest>=.025&&largest<=.12&&largest/smallest<=1.8)best=Math.max(best,centers.length);
    }
    return best;
  }
  function cohortById(fixture, id) {
    return fixture && fixture.cohorts ? fixture.cohorts.find(row => row.id === id) || null : null;
  }
  function cohortSummary(fixture) {
    return (fixture.cohorts || []).map(cohort => ({
      id: cohort.id,
      label: cohort.label,
      catalog_style_count: cohort.styles.length,
      synthetic_measurement_peer_count: cohort.styles.filter(style => style.measurements).length,
      approved_production_peer_count: 0,
      eligible: cohort.styles.filter(style => style.measurements).length >= fixture.minimum_peer_count
    }));
  }
  function cohortPomStats(fixture, cohortId, pom) {
    const cohort = cohortById(fixture, cohortId);
    if (!cohort) return { status: 'NO_COHORT', count: 0, median: null, values: [], peers: [] };
    const peers = cohort.styles.map(style => ({
      id:style.id,name:style.name,evidence:style.evidence,
      construction_confidence:style.construction_confidence,
      data_kind:'synthetic_test_data',
      value_in:style.measurements && Number(style.measurements[String(pom)])
    })).filter(peer => Number.isFinite(peer.value_in));
    const values = peers.map(peer => peer.value_in);
    const enough = values.length >= fixture.minimum_peer_count;
    return {
      status: enough ? 'ELIGIBLE' : 'INSUFFICIENT_PEERS',
      count: values.length,
      minimum: fixture.minimum_peer_count,
      median: enough ? round(median(values), 3) : null,
      values,peers
    };
  }
  function hookEyePom12Reference(fixture, construction, rowCount) {
    const rows=Math.round(Number(rowCount)||0);
    if(construction!=='back_hook_and_eye'||rows!==3)return {status:'NO_RULE',pom:'12',row_count:rows,value_in:null,peers:[]};
    const value=3;
    const cohort=cohortById(fixture,'back_hook_and_eye');
    const peers=(cohort&&cohort.styles||[]).filter(style=>style.measurements&&Number(style.measurements['12'])===value).map(style=>({
      id:style.id,name:style.name,evidence:style.evidence,data_kind:'synthetic_test_data',value_in:value
    }));
    return {status:'SUPPORTED',pom:'12',row_count:rows,value_in:value,matched_peer_count:peers.length,peers,source:'opencv_hook_eye_row_rule'};
  }

  function deriveViewRegionsFromColumns(columnInk, width, height) {
    const threshold = Math.max(2, Math.round(height * 0.006));
    const active = Array.from({ length: width }, (_, x) => Number(columnInk[x]) >= threshold);
    const fillGap = Math.max(3, Math.round(width * 0.012));
    let gapStart = -1;
    for (let x = 0; x <= width; x += 1) {
      if (x < width && !active[x]) {
        if (gapStart < 0) gapStart = x;
      } else if (gapStart >= 0) {
        const gapWidth = x - gapStart;
        if (gapStart > 0 && x < width && gapWidth <= fillGap) {
          for (let gx = gapStart; gx < x; gx += 1) active[gx] = true;
        }
        gapStart = -1;
      }
    }
    const runs = [];
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      if (x < width && active[x]) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        if (x - start >= width * 0.12) runs.push({ start, end: x - 1 });
        start = -1;
      }
    }
    const roles = runs.length === 2
      ? ['front_outer', 'back']
      : (runs.length === 3 ? ['front_outer', 'front_inner', 'back'] : runs.map(() => 'unknown'));
    const confidence = runs.length === 2 ? 'high' : (runs.length === 3 ? 'medium' : 'low');
    return runs.map((run, index) => ({
      id: `view_${index + 1}`,
      role: roles[index],
      roleSource: runs.length === 2 || runs.length === 3 ? 'left_to_right_layout_rule' : 'unresolved_layout',
      confidence,
      bbox: { x: run.start, y: 0, width: run.end - run.start + 1, height }
    }));
  }

  function classifyConstruction(signals) {
    const centerRail = clamp(Number(signals.centerRail) || 0, 0, 1);
    const parallelRails = clamp(Number(signals.parallelRails) || 0, 0, 1);
    const centerRepeats = clamp(Number(signals.centerRepeats) || 0, 0, 1);
    const edgeRepeats = clamp(Number(signals.edgeRepeats) || 0, 0, 1);
    const backCenterRail = clamp(Number(signals.backCenterRail) || 0, 0, 1);
    const backParallelRails = clamp(Number(signals.backParallelRails) || 0, 0, 1);
    const backCenterRepeats = clamp(Number(signals.backCenterRepeats) || 0, 0, 1);
    const backHookEyeRowCount = Math.round(Number(signals.backHookEyeRowCount) || 0);
    const discreteRowSupport = backHookEyeRowCount>=3&&backHookEyeRowCount<=6 ? .92 : 0;
    const backClosureShapeSupport = 0.42 * backCenterRail + 0.23 * backParallelRails + 0.35 * backCenterRepeats;
    const backClosurePanelSupport = backCenterRail>=.55&&backParallelRails>=.35
      ? Math.min(.67,0.55*backCenterRail+0.35*backParallelRails+0.10*backCenterRepeats)
      : 0;
    // Rails and repeated seam detail can look closure-like, but they do not
    // prove hook-and-eye construction. Only a discrete regular row sequence
    // may select the back H&E class automatically.
    const backHookSupport = discreteRowSupport;
    const scores = {
      front_zipper: 0.42 * centerRail + 0.35 * parallelRails + 0.23 * centerRepeats,
      front_closure_placket: 0.68 * centerRail + 0.18 * (1 - parallelRails) + 0.14 * (1 - centerRepeats),
      front_hook_and_eye: 0.55 * edgeRepeats + 0.25 * centerRepeats + 0.20 * (1 - parallelRails),
      back_hook_and_eye: backHookSupport,
      none_pull_on: (0.55 * (1 - centerRail) + 0.25 * (1 - centerRepeats) + 0.20 * (1 - edgeRepeats)) * (1 - 0.72 * backHookSupport)
    };
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const winner = ranked[0];
    const margin = winner[1] - ranked[1][1];
    const accepted = winner[1] >= 0.58 && margin >= 0.10;
    return {
      construction: accepted ? winner[0] : 'unknown',
      confidence: winner[1] >= 0.78 && margin >= 0.18 ? 'high' : (accepted ? 'medium' : 'low'),
      score: round(winner[1], 3),
      margin: round(margin, 3),
      scores: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, round(value, 3)])),
      backHookEyeRowCount,
      backClosureShapeSupport:round(backClosureShapeSupport,3),
      backClosurePanelSupport:round(backClosurePanelSupport,3),
      reason: accepted
        ? (winner[0]==='back_hook_and_eye'&&discreteRowSupport?`${backHookEyeRowCount} regular back hook-and-eye rows detected`:'positive signals and class margin pass')
        : 'weak or conflicting construction evidence'
    };
  }

  function deriveCandidatePaths(input) {
    let regions = Array.isArray(input) ? input : null;
    if (!regions) {
      const bbox = input;
      const half = bbox.width * 0.46;
      regions = [
        { id:'view_1', role:'front_outer', confidence:'low', bbox:{ x:bbox.x, y:bbox.y, width:half, height:bbox.height } },
        { id:'view_2', role:'back', confidence:'low', bbox:{ x:bbox.x + bbox.width - half, y:bbox.y, width:half, height:bbox.height } }
      ];
    }
    const regionFor = role => regions.find(region => region.role === role) || null;
    const line = (pom, role, ax, ay, bx, by, confidence) => {
      const region = regionFor(role);
      if (!region) return {
        pom:String(pom), name:POM_NAMES[String(pom)], viewRole:role, confidence:'very_low',
        start:null, end:null, pixelLength:null, anchorStatus:'NO_VIEW_EVIDENCE',
        anchors:POM_ANCHORS[String(pom)]
      };
      const { x, y, width:w, height:h } = region.bbox;
      const startPoint = { x:x + ax*w, y:y + ay*h };
      const endPoint = { x:x + bx*w, y:y + by*h };
      return {
        pom:String(pom), name:POM_NAMES[String(pom)], viewRole:role, viewId:region.id,
        viewBox:Object.assign({},region.bbox), viewConfidence:region.confidence, confidence, start:startPoint, end:endPoint,
        pixelLength:round(Math.hypot(endPoint.x-startPoint.x,endPoint.y-startPoint.y),3),
        anchorStatus:'HYPOTHESIS', anchorSource:'view_ratio_anchor_hypothesis',
        anchors:POM_ANCHORS[String(pom)]
      };
    };
    const crossView = () => {
      const front = regionFor('front_outer'), back = regionFor('back');
      if (!front || !back) return line(14,'front_to_back',0,0,0,0,'very_low');
      const startPoint = { x:front.bbox.x + .78*front.bbox.width, y:front.bbox.y + .24*front.bbox.height };
      const endPoint = { x:back.bbox.x + .24*back.bbox.width, y:back.bbox.y + .28*back.bbox.height };
      return {
        pom:'14', name:POM_NAMES['14'], viewRole:'front_to_back', viewId:`${front.id}+${back.id}`,
        viewBox:null, confidence:'low', start:startPoint, end:endPoint,
        pixelLength:round(Math.hypot(endPoint.x-startPoint.x,endPoint.y-startPoint.y),3),
        anchorStatus:'HYPOTHESIS', anchorSource:'separated_view_anchor_hypotheses',
        anchors:POM_ANCHORS['14']
      };
    };
    return [
      line(1,'front_outer',.28,.90,.72,.90,'high'), line(2,'front_outer',.20,.94,.80,.94,'medium'),
      line(3,'front_outer',.23,.55,.77,.55,'medium'), line(4,'front_outer',.15,.58,.85,.58,'medium'),
      line(5,'front_outer',.50,.43,.50,.77,'high'), line(6,'front_outer',.50,.64,.50,.77,'medium'),
      line(7,'front_outer',.67,.62,.67,.72,'medium'), line(8,'front_outer',.52,.48,.52,.67,'medium'),
      line(9,'front_outer',.64,.40,.64,.68,'medium'), line(10,'front_outer',.54,.55,.74,.55,'medium'),
      line(11,'back',.18,.58,.18,.83,'medium'), line(12,'back',.50,.58,.50,.78,'medium'),
      line(13,'back',.82,.48,.82,.83,'medium'), crossView(),
      line(15,'back',.30,.31,.70,.31,'medium'), line(16,'front_outer',.36,.43,.64,.43,'medium')
    ];
  }

  // ---- Bridge: real production anchors -> POM paths (US-039 Stage 1) ------
  // Each POM's start/end anchor pair, taken from the production rule template
  // (auto_mode_rules/pom-template.json requiredAnchors). Used to convert the
  // production detector's real, ink-confirmed anchors into the same path shape
  // deriveCandidatePaths produces — so the scale + fusion engine measures over
  // DETECTED geometry instead of ratio hypotheses. POM 17/18 have no corpus.
  const PRODUCTION_POM_ANCHORS = {
    '1':['band-left','band-right'], '2':['band-left','band-right'],
    '3':['chest-left','chest-right'], '4':['chest-left','chest-right'],
    '5':['cf-top','cf-bottom'], '6':['cradle-cf-top','cf-bottom'],
    '7':['cradle-cup-top','cradle-cup-bottom'], '8':['cf-top','cradle-cf-top'],
    '9':['inner-cup-top','inner-cup-bottom'], '10':['inner-cup-left','inner-cup-right'],
    '11':['side-top','side-bottom'], '12':['back-top','back-bottom'], '13':['back-top','back-bottom'],
    '14':['strap-top','strap-bottom'], '15':['back-strap-left','back-strap-right'], '16':['apex-left','apex-right'],
  };
  const CONF_RANK = { high:3, medium:2, low:1, very_low:0 };

  // anchors: { kind: { x, y (normalized 0..1), viewRole, confidence, source, reviewRequired } }
  // options: { width, height } — canvas px to denormalize into (defaults to 1 = normalized units).
  //          { viewRegions } — optional detected view regions; when absent, a view
  //          box is derived from the bounding box of that view's own anchors.
  //
  // Every path carries viewId/viewBox: the five-layer proof's Visual Understanding
  // layer keys on viewId, so omitting it made every row read as "view missing" and
  // scored INSUFFICIENT even though the view was detected.
  function pathsFromDetectedAnchors(anchors, options) {
    anchors = anchors || {};
    const W = Number(options && options.width) || 1;
    const H = Number(options && options.height) || 1;
    const tier = c => (c in CONF_RANK ? c : 'low');

    // Real detected regions win; otherwise derive one box per view from the
    // anchors that live in it (they are, by definition, inside that view).
    const providedRegions = Array.isArray(options && options.viewRegions) ? options.viewRegions : [];
    const derivedRegions = {};
    for (const [kind, a] of Object.entries(anchors)) {
      if (!a || !Number.isFinite(Number(a.x)) || !a.viewRole) continue;
      const px = Number(a.x) * W, py = Number(a.y) * H;
      const box = derivedRegions[a.viewRole] || (derivedRegions[a.viewRole] = { minX: px, maxX: px, minY: py, maxY: py, n: 0 });
      box.minX = Math.min(box.minX, px); box.maxX = Math.max(box.maxX, px);
      box.minY = Math.min(box.minY, py); box.maxY = Math.max(box.maxY, py);
      box.n += 1;
    }
    const regionFor = role => {
      const hit = providedRegions.find(r => r && r.role === role);
      if (hit) return { id: hit.id || ('view_' + role), bbox: Object.assign({}, hit.bbox), confidence: hit.confidence || 'medium' };
      const d = derivedRegions[role];
      if (!d || d.n < 2) return null;
      return {
        id: 'anchors_' + role, confidence: 'medium',
        bbox: { x: round(d.minX, 1), y: round(d.minY, 1), width: round(d.maxX - d.minX, 1), height: round(d.maxY - d.minY, 1) },
      };
    };
    return Object.keys(PRODUCTION_POM_ANCHORS).map(pom => {
      const pair = PRODUCTION_POM_ANCHORS[pom];
      const viewRole = POM_VIEW_ROLES[pom];
      const a = anchors[pair[0]], b = anchors[pair[1]];
      // POM 14 spans two views (front_to_back); use the anchors' own views.
      const region = regionFor(viewRole) || (a && regionFor(a.viewRole)) || null;
      const base = {
        pom, name: POM_NAMES[pom], viewRole, anchors: pair.slice(),
        viewId: region ? region.id : null,
        viewBox: region ? Object.assign({}, region.bbox) : null,
        viewConfidence: region ? region.confidence : null,
      };
      if (!a || !b || !Number.isFinite(Number(a.x)) || !Number.isFinite(Number(b.x))) {
        return Object.assign(base, { start:null, end:null, pixelLength:null, confidence:'very_low', anchorStatus:'NO_ANCHOR_EVIDENCE', anchorSource:'production_detected_missing' });
      }
      const start = { x: Number(a.x) * W, y: Number(a.y) * H };
      const end = { x: Number(b.x) * W, y: Number(b.y) * H };
      const inkSourced = s => /ink|silhouette|opencv/i.test(String(s || ''));
      const confirmed = !a.reviewRequired && !b.reviewRequired && inkSourced(a.source) && inkSourced(b.source);
      const conf = CONF_RANK[tier(a.confidence)] <= CONF_RANK[tier(b.confidence)] ? tier(a.confidence) : tier(b.confidence);
      return Object.assign(base, {
        start, end,
        pixelLength: round(Math.hypot(end.x - start.x, end.y - start.y), 3),
        confidence: conf,
        anchorStatus: confirmed ? 'ink_detected' : 'review_detected',
        anchorSource: confirmed ? 'production_detected_ink' : 'production_detected_review',
        reviewRequired: !!(a.reviewRequired || b.reviewRequired),
        detectedConfidence: { [pair[0]]: a.confidence || null, [pair[1]]: b.confidence || null },
      });
    });
  }

  // ---- Similar-style retrieval (US-016, prototype) -----------------------
  // "Refer the library, let the tool find the logic from the sketch": given the
  // features the sketch/anchors can supply, rank real library styles by feature
  // similarity and return the nearest one. Its REAL measurements become a
  // style-specific prior — far more specific than the flat population median.
  // Honest ceiling: this is the best PREDICTION, not a measurement; quality is
  // bounded by library coverage and how many features the sketch can supply.
  function retrieveSimilarStyle(sketchFeatures, styles, options) {
    options = options || {};
    const weights = options.weights || {
      cradle_closure_location: 0.40, cup_coverage_silhouette: 0.25,
      back_coverage_tier: 0.15, cup_molded: 0.10, band_width_tier: 0.10,
    };
    styles = Array.isArray(styles) ? styles : [];
    sketchFeatures = sketchFeatures || {};
    const scored = styles.map(s => {
      const feats = s.features || {};
      let num = 0, den = 0; const matched = [];
      for (const f of Object.keys(weights)) {
        const sv = sketchFeatures[f];
        if (sv == null || sv === 'unknown') continue;         // only score features the sketch supplies
        den += weights[f];
        if (String(feats[f]) === String(sv)) { num += weights[f]; matched.push(f); }
      }
      return { id: s.id, score: den > 0 ? round(num / den, 3) : 0, matchedFeatures: matched, features: feats, measurements: s.measurements || {} };
    }).sort((a, b) => b.score - a.score);
    const assessed = Object.keys(weights).filter(f => sketchFeatures[f] != null && sketchFeatures[f] !== 'unknown');
    return { nearest: scored[0] || null, ranked: scored, assessedFeatures: assessed };
  }

  // ---- Learning loop: TD corrections -> self-improving suggestions --------
  // The charter's "self-improving" goal, applied to Mode B. TD overrides are
  // captured as (suggested -> corrected) residuals; a robust per-POM offset is
  // learned and gently nudges FUTURE suggestions. It only biases suggestions
  // (never mutates rule JSON), and is optional, measurable, and resettable.
  //
  // records: [{ pom, suggested, corrected }]  (optionally { cohort } to scope)
  function learnCorrections(records) {
    const byPom = {};
    for (const r of (records || [])) {
      const pom = String(r.pom);
      const s = Number(r.suggested), c = Number(r.corrected);
      if (!Number.isFinite(s) || !Number.isFinite(c) || !(s > 0)) continue;
      (byPom[pom] = byPom[pom] || []).push({ residual: c - s, ratio: c / s });
    }
    const learned = {};
    for (const [pom, rs] of Object.entries(byPom)) {
      const residuals = rs.map(x => x.residual);
      learned[pom] = {
        n: rs.length,
        offset: round(median(residuals), 3),                 // additive systematic bias
        factor: round(median(rs.map(x => x.ratio)), 4),      // multiplicative alternative
        absMedianResidual: round(median(residuals.map(Math.abs)), 3),
      };
    }
    return learned;
  }

  // Nudge one suggested value by the learned offset. Gated by minSamples (don't
  // overfit to one correction) and n-weighted (more corrections -> more trust),
  // so it converges gradually rather than jumping on the first override.
  function applyLearnedCorrection(pom, value, learned, options) {
    options = options || {};
    const minSamples = options.minSamples == null ? 3 : options.minSamples;
    const l = learned && learned[String(pom)];
    const v = Number(value);
    if (!l || l.n < minSamples || !Number.isFinite(v)) return { value: v, applied: false };
    const w = clamp(l.n / (l.n + 4), 0, 1);                  // 3->0.43, 8->0.67, 20->0.83
    return { value: round(v + w * l.offset, 3), applied: true, offset: l.offset, weight: round(w, 2), n: l.n };
  }

  // ---- Anchor -> construction corroboration (prototype) ------------------
  // The OpenCV detector classifies construction from ink/rails/rows (texture),
  // NOT from anchors. This layer uses the real detected anchor GEOMETRY as an
  // INDEPENDENT second opinion: it corroborates or challenges that call and
  // nudges its confidence — never overrides it (mirrors ADR 0033 for structure).
  //
  // Honest per-axis strength:
  //  - structure axis (cup box, cradle arc, apex symmetry): anchors are STRONG.
  //  - closure axis (zipper/placket vs H&E): anchors are WEAK — a back-centre
  //    column hints at a closure band but CANNOT count H&E rows, and rails/gaps
  //    are texture the anchors can't see. So front closures are not assessable.
  function corroborateConstruction(anchors, dims, detection) {
    anchors = anchors || {};
    const W = Number(dims && dims.width) || 1, H = Number(dims && dims.height) || 1;
    const g = kind => { const a = anchors[kind]; return a && Number.isFinite(Number(a.x)) ? a : null; };
    const dist = (a, b) => (a && b) ? Math.hypot((a.x - b.x) * W, (a.y - b.y) * H) : null;
    const span = Math.max(W, H);

    // Structure: inner-cup box present + reasonably sized -> structured cup.
    const icL = g('inner-cup-left'), icR = g('inner-cup-right'), icT = g('inner-cup-top'), icB = g('inner-cup-bottom');
    const cupBox = (icL && icR && icT && icB) ? { present: true, wpx: round(dist(icL, icR), 1), hpx: round(dist(icT, icB), 1) } : { present: false };
    const cupBoxSupport = cupBox.present && cupBox.wpx > 0 && cupBox.hpx > 0
      ? clamp(0.55 + 0.45 * clamp(Math.min(cupBox.wpx, cupBox.hpx) / (0.12 * span), 0, 1), 0, 1) : 0;

    // Structure: cradle-cf-top with a cup anchor sitting outward + at/below it
    // traces a cradle arc -> cradle/underwire.
    const ccf = g('cradle-cf-top'), cup = g('cradle-cup-bottom') || g('cradle-cup-top');
    let cradle = { present: false }, cradleSupport = 0;
    if (ccf && cup) {
      const lateral = Math.abs(cup.x - ccf.x), drop = cup.y - ccf.y;
      cradle = { present: true, lateral: round(lateral, 3), drop: round(drop, 3) };
      cradleSupport = clamp((lateral > 0.03 ? 0.6 : 0.25) + (drop >= -0.02 ? 0.4 : 0), 0, 1);
    }

    // Structure: apex pair roughly level -> symmetric, well-formed cup pair.
    const apL = g('apex-left'), apR = g('apex-right');
    const apexSym = (apL && apR) ? { present: true, level: round(1 - clamp(Math.abs(apL.y - apR.y) / 0.08, 0, 1), 2) } : { present: false, level: 0 };

    // Closure (weak): back-centre vertical column. A short low column hints at a
    // closure band; a tall one reads as a full back panel. Rows are NOT counted.
    const bt = g('back-top'), bb = g('back-bottom');
    const backCol = (bt && bb) ? { present: true, spanNorm: round(Math.abs(bt.y - bb.y), 3), centered: bt.x > 0.4 } : { present: false };
    const backClosureSupport = backCol.present && backCol.centered
      ? clamp(0.35 + (backCol.spanNorm > 0 && backCol.spanNorm < 0.35 ? 0.25 : 0), 0, 1) : 0;

    const axes = {
      structured_cup:   { anchorSupport: round(cupBoxSupport, 2), assessable: true, from: 'inner-cup box' },
      underwire_cradle: { anchorSupport: round(cradleSupport, 2), assessable: true, from: 'cradle arc' },
      apex_symmetry:    { anchorSupport: round(apexSym.level, 2), assessable: true, from: 'apex pair level' },
      back_closure:     { anchorSupport: round(backClosureSupport, 2), assessable: true, weak: true, from: 'back-centre column (rows NOT counted)' },
      front_closure:    { anchorSupport: 0, assessable: false, from: 'rails/gap are texture; anchors cannot see them' },
    };

    // Which axis judges the OpenCV-called construction, and how strong is it.
    const construction = detection && detection.construction || 'unknown';
    const opencvScore = Number(detection && detection.score);
    let axisKey = null, note = '';
    if (construction === 'back_hook_and_eye') { axisKey = 'back_closure'; note = 'anchors see a back-centre column but cannot count H&E rows — OpenCV rows remain the decider.'; }
    else if (construction === 'front_zipper' || construction === 'front_closure_placket' || construction === 'front_hook_and_eye') { axisKey = 'front_closure'; note = 'anchors cannot judge a front closure type.'; }
    else if (construction === 'none_pull_on') { axisKey = 'back_closure'; note = 'a strong back-centre closure column would challenge a pull-on reading.'; }

    const axis = axisKey ? axes[axisKey] : null;
    let verdict, anchorSupport = axis ? axis.anchorSupport : null, adjustedScore = Number.isFinite(opencvScore) ? opencvScore : null;
    if (!axis || !axis.assessable) {
      verdict = 'not_assessable';
    } else if (construction === 'none_pull_on') {
      // Inverted: high closure support challenges pull-on.
      verdict = anchorSupport >= 0.6 ? 'contradicted' : (anchorSupport <= 0.4 ? 'corroborated' : 'weak');
      if (Number.isFinite(opencvScore)) adjustedScore = clamp(opencvScore * (1 + 0.2 * (0.5 - anchorSupport) * 2), 0, 1);
    } else {
      verdict = anchorSupport >= 0.6 ? 'corroborated' : (anchorSupport < 0.3 ? 'contradicted' : 'weak');
      if (Number.isFinite(opencvScore)) adjustedScore = clamp(opencvScore * (1 + 0.2 * (anchorSupport - 0.5) * 2), 0, 1);
    }

    return {
      construction, opencvScore: Number.isFinite(opencvScore) ? round(opencvScore, 3) : null,
      axisJudged: axisKey, anchorSupport, verdict,
      adjustedScore: adjustedScore == null ? null : round(adjustedScore, 3),
      note, axes, features: { cupBox, cradle, apexSym, backCol },
    };
  }

  function viewScaleFromCalibration(paths, calibration) {
    const viewRole = calibration && calibration.viewRole;
    const pom = calibration && String(calibration.pom);
    const knownLength = Number(calibration && calibration.knownLength);
    const path = paths.find(row => row.pom === pom && row.viewRole === viewRole);
    if (!path) return { viewRole, status:'CALIBRATION_PATH_MISSING', scale:null, source:'none' };
    if (!(knownLength > 0) || !(path.pixelLength > 0)) return { viewRole, status:'INVALID_CALIBRATION', scale:null, source:'none' };
    return {
      viewRole, status:'VALID', scale:knownLength/path.pixelLength,
      source:'td_explicit_calibration', calibrationPom:pom,
      knownLength:round(knownLength,3), calibrationPixels:path.pixelLength,
      reason:`POM ${pom}: ${round(knownLength,3)} in / ${path.pixelLength} px`
    };
  }

  function buildExplicitViewScales(paths, calibrations) {
    return Object.fromEntries((calibrations || []).map(calibration => {
      const result = viewScaleFromCalibration(paths, calibration);
      return [calibration.viewRole, result];
    }));
  }

  function inferScale(fixture, cohortId, paths, viewRole) {
    const candidates = [];
    for (const pom of ['1', '5']) {
      const stats = cohortPomStats(fixture, cohortId, pom);
      const path = paths.find(row => row.pom === pom && (!viewRole || row.viewRole === viewRole));
      if (stats.status === 'ELIGIBLE' && path && path.pixelLength > 0) {
        candidates.push({ pom, scale: stats.median / path.pixelLength });
      }
    }
    if (candidates.length < 2) return { status: 'INSUFFICIENT_SCALE_EVIDENCE', scale: null, candidates };
    const scale = median(candidates.map(row => row.scale));
    const maxDeviation = Math.max(...candidates.map(row => Math.abs(row.scale - scale) / scale));
    if (maxDeviation > 0.12) return { status: 'SCALE_DISAGREEMENT', scale: null, candidates, maxDeviation: round(maxDeviation, 3) };
    return { status: 'VALID', scale, candidates, maxDeviation: round(maxDeviation, 3) };
  }

  // Evidence-ranked, view-local auto-scale resolver (US-039 / Stage 0).
  // Picks one scale per view by a fixed precedence instead of a UI mode toggle:
  //   4 td_explicit_calibration   — a TD-entered known length for a POM in that view
  //   3 construction_reference     — OpenCV back H&E rows → POM 12 = 3.00 in (back only)
  //   2 multi_anchor_inferred      — robust POM 1/5 library median scale (inferScale)
  //   1 library_prior_hypothesis   — single back POM 12 library median ÷ pixels (back only)
  //   0 none                       — PRIOR_ONLY / NO_SCALE_EVIDENCE
  // A front scale is NEVER borrowed for the back view or vice versa (ADR 0026):
  // each view is resolved from its own candidates only.
  function resolveViewScales(args) {
    const fixture = args.fixture, cohortId = args.cohortId, paths = args.paths || [];
    const hookEyeReference = args.hookEyeReference || null;
    const calibrations = args.calibrations || [];
    const explicitFor = viewRole => {
      const cal = calibrations.find(c => c && c.viewRole === viewRole && Number(c.knownLength) > 0);
      if (!cal) return null;
      const s = viewScaleFromCalibration(paths, cal);
      return s.status === 'VALID'
        ? Object.assign({}, s, { precedence: 'td_explicit_calibration', rank: 4, confidence: 'high' })
        : null;
    };

    // FRONT: td_explicit > multi_anchor_inferred > none
    let front = explicitFor('front_outer');
    if (!front) {
      const inf = inferScale(fixture, cohortId, paths, 'front_outer');
      front = inf.status === 'VALID'
        ? { viewRole:'front_outer', status:'VALID', scale:inf.scale, source:'library_multi_anchor_inference',
            precedence:'multi_anchor_inferred', rank:2, confidence:'medium', candidates:inf.candidates,
            reason:`Robust median from POM ${inf.candidates.map(c => c.pom).join(' and POM ')}.` }
        : { viewRole:'front_outer', status:'PRIOR_ONLY', scale:null, source:'none', precedence:'none', rank:0,
            reason: inf.status === 'SCALE_DISAGREEMENT' ? 'POM 1/5 scale candidates disagree beyond 12%.' : 'No two independent front-view scale candidates.' };
    }

    // BACK: td_explicit > construction_reference (H&E rows) > library_prior_hypothesis > none
    let back = explicitFor('back');
    if (!back && hookEyeReference && hookEyeReference.status === 'SUPPORTED') {
      const s = viewScaleFromCalibration(paths, { viewRole:'back', pom:'12', knownLength:hookEyeReference.value_in });
      if (s.status === 'VALID') back = Object.assign({}, s, {
        source:'opencv_hook_eye_rows_reference', precedence:'construction_reference', rank:3, confidence:'medium',
        reason:`OpenCV detected ${hookEyeReference.row_count} regular back H&E rows: POM 12 = ${hookEyeReference.value_in.toFixed(2)} in. Seeds the back view only.`
      });
    }
    if (!back) {
      const backPath = paths.find(p => p.pom === '12' && p.viewRole === 'back');
      const backStats = cohortPomStats(fixture, cohortId, '12');
      back = (backPath && backPath.pixelLength > 0 && backStats.status === 'ELIGIBLE')
        ? { viewRole:'back', status:'VALID', scale:backStats.median / backPath.pixelLength, source:'library_hook_eye_hypothesis',
            precedence:'library_prior_hypothesis', rank:1, confidence:'low',
            reason:`Back POM 12 hypothesis: ${backStats.median} in / ${backPath.pixelLength} px. Not TD calibrated.` }
        : { viewRole:'back', status:'NO_SCALE_EVIDENCE', scale:null, source:'none', precedence:'none', rank:0,
            reason:'No back-view scale evidence.' };
    }

    return { front_outer:front, back };
  }

  function confidenceWeight(value) {
    return ({ high: 0.94, medium: 0.78, low: 0.56, very_low: 0.22 })[value] || 0;
  }

  function deriveConstructionTags(signals, detection, views) {
    const hasFront = (views || []).some(view => view.role === 'front_outer');
    const hasBack = (views || []).some(view => view.role === 'back');
    const detail = clamp(Number(signals.frontTextureScore) || 0, 0, 1);
    const lacePattern = clamp(Number(signals.frontLacePatternScore) || 0, 0, 1);
    const coverage = clamp(Number(signals.frontCoverageScore) || 0, 0, 1);
    const underwire = clamp(Number(signals.underwireScore) || 0, 0, 1);
    const hookRows = Math.round(Number(signals.backHookEyeRowCount || detection.backHookEyeRowCount) || 0);
    const hookRowSupport = hookRows >= 3 && hookRows <= 6 ? .92 : 0;
    const panelSupport = clamp(Number(detection.backClosurePanelSupport) || 0,0,.67);
    const hookSupport = Math.max(hookRowSupport,panelSupport);
    const scoreState = score => score >= 0.68 ? 'detected' : (score >= 0.40 ? 'uncertain' : 'not_detected');
    const rows = [
      { id:'wireless', label:'Wireless', score:hasFront ? clamp(0.68 - underwire * 0.42,0,1) : 0, evidence:'underwire absence heuristic' },
      { id:'full_cup', label:'Full cup', score:hasFront ? coverage : 0, evidence:'front coverage heuristic' },
      { id:'lace_overlay', label:'Lace overlay', score:hasFront ? lacePattern : 0, evidence:lacePattern ? 'distributed light-pattern evidence' : 'no distributed lace-pattern evidence' },
      { id:'back_hook_and_eye', label:'Back hook & eye', score:hasBack ? hookSupport : 0, evidence:hookRowSupport ? `${hookRows} regular closure rows` : (panelSupport ? 'paired center-back closure panel; fastening rows not visible' : 'no regular rows or paired closure panel') },
      { id:'molded', label:'Molded', score:hasFront ? clamp(0.68 - detail * 0.58,0,1) : 0, evidence:'low-detail cup heuristic' },
      { id:'underwire', label:'Underwire', score:hasFront ? underwire : 0, evidence:'cup-arc heuristic' },
      { id:'front_zipper', label:'Front zip', score:hasFront ? Number(detection.scores.front_zipper || 0) : 0, evidence:'front center rail and repeat evidence' }
    ];
    return rows.map(row => Object.assign(row,{ score:round(row.score,3),state:scoreState(row.score) }));
  }

  function measurementEvidenceOutcome(args) {
    const measurement = args.measurement || {};
    const path = args.path || {};
    const scale = args.scale || null;
    const gate = args.cohortGate || {};
    const detection = args.constructionDetection || {};
    const valueAvailable = Number.isFinite(Number(measurement.value_in)) && Number(measurement.value_in) > 0;
    const viewPass = Boolean(path.viewId);
    const anchorsPass = Boolean(path.start && path.end && Number(path.pixelLength) > 0);
    const libraryPrior = measurement.decision === 'LIBRARY_PRIOR' || measurement.source === 'construction_cohort_prior' || measurement.source === 'general_library_baseline';
    const generalLibraryBaseline = measurement.source === 'general_library_baseline';
    const constructionReference = measurement.source === 'opencv_hook_eye_row_rule';
    const independentProposal = libraryPrior || constructionReference;
    const scaleRequired = !independentProposal && String(path.pom) !== '14';
    const scalePass = !scaleRequired || Boolean(scale && scale.status === 'VALID' && Number(scale.scale) > 0);
    const libraryPass = generalLibraryBaseline ? true : (measurement.cohort
      ? measurement.cohort.status === 'ELIGIBLE'
      : gate.status === 'ELIGIBLE');
    const syntheticPeerCount = measurement.cohort && Number.isFinite(Number(measurement.cohort.count))
      ? Number(measurement.cohort.count)
      : Number(gate.synthetic_measurement_peer_count) || 0;
    const minimumPeers = Number(gate.minimum) || Number(args.minimumPeerCount) || 3;
    const approvedPeerCount = Number(gate.approved_production_peer_count) || 0;
    const approvedLibraryPass = libraryPass && approvedPeerCount >= minimumPeers;
    const constructionPass = args.effectiveConstruction && args.effectiveConstruction !== 'unknown';
    const viewStrong = viewPass && (Boolean(args.viewsConfirmed) || path.viewConfidence === 'high');
    const constructionStrong = constructionPass && (Boolean(args.constructionConfirmed) || detection.confidence === 'high');
    const contradictionPass = measurement.decision !== 'REVIEW_REQUIRED';
    const anchorSource = String(path.anchorSource || '');
    const landmarkApplicable = !independentProposal;
    const landmarkStrong = anchorsPass && (
      path.anchorStatus === 'CONFIRMED' ||
      anchorSource.includes('ink') || anchorSource.includes('opencv') || anchorSource.includes('td_confirmed')
    );
    const placementPoints = Math.round(confidenceWeight(path.confidence) * 25);
    const scalePoints = !scaleRequired ? 12 : (!scalePass ? 0 : (
      scale.source === 'td_explicit_calibration' ? 25 :
      scale.source === 'library_multi_anchor_inference' ? 18 : 13
    ));
    const constructionPoints = constructionPass
      ? (args.constructionConfirmed ? 10 : Math.round(confidenceWeight(detection.confidence || 'low') * 10))
      : 0;
    const score = clamp(
      (viewPass ? 20 : 0) + placementPoints + scalePoints +
      (approvedLibraryPass ? 20 : (libraryPass ? 12 : 0)) + constructionPoints -
      (contradictionPass ? 0 : 12),
      0, 100
    );
    const mandatoryPass = independentProposal
      ? valueAvailable && (generalLibraryBaseline || (constructionPass && (constructionReference || libraryPass)))
      : valueAvailable && viewPass && anchorsPass && scalePass;
    const autoPass = !independentProposal && mandatoryPass && viewStrong && constructionStrong && landmarkStrong && approvedLibraryPass && contradictionPass &&
      score >= 85 && (!scaleRequired || scale.source === 'td_explicit_calibration');
    const status = !mandatoryPass || (!independentProposal&&score<55) ? 'INSUFFICIENT' : (autoPass ? 'AUTO' : 'REVIEW');
    const confidenceCaps = [100];
    if (!viewStrong || !constructionStrong) confidenceCaps.push(69);
    if (landmarkApplicable&&!landmarkStrong) confidenceCaps.push(79);
    if (scaleRequired && scalePass && scale.source !== 'td_explicit_calibration') confidenceCaps.push(74);
    if (!approvedLibraryPass) confidenceCaps.push(84);
    if (!contradictionPass) confidenceCaps.push(54);
    if (libraryPrior) confidenceCaps.push(60);
    if (generalLibraryBaseline) confidenceCaps.push(50);
    if (constructionReference) confidenceCaps.push(79);
    const measurementConfidence = status === 'INSUFFICIENT' || !valueAvailable
      ? null
      : Math.min(Math.round(score),...confidenceCaps);
    const scaleLayerStatus = !scaleRequired ? 'NOT_APPLICABLE' : (!scalePass ? 'MISSING' : (scale.source === 'td_explicit_calibration' ? 'PASS' : 'WEAK'));
    const matchingReferencePeers=constructionReference&&measurement.construction_reference?Number(measurement.construction_reference.matched_peer_count)||0:0;
    const generalLibraryCount=generalLibraryBaseline?Number(measurement.library_prior_count)||0:0;
    const layers = [
      {
        id:'visual',label:'Visual Understanding',
        status:viewPass&&constructionPass&&(viewStrong&&constructionStrong)?'PASS':(viewPass||constructionPass?'WEAK':'MISSING'),
        detail:`${path.viewRole||'unknown'} view ${viewPass?'found':'missing'}${args.viewsConfirmed?' (TD confirmed)':''}; construction ${constructionPass?args.effectiveConstruction:'unresolved'}${args.constructionConfirmed?' (TD confirmed)':''}`
      },
      {
        id:'landmarks',label:'Landmark Geometry',
        status:!landmarkApplicable?'NOT_APPLICABLE':(!anchorsPass?'MISSING':(landmarkStrong?'PASS':'WEAK')),
        detail:!landmarkApplicable?(constructionReference?'POM value comes directly from the detected row rule':'Library proposal does not claim sketch geometry'):(!anchorsPass?'Anchor pair missing':`${round(Number(path.pixelLength),1)} px between anchor hypotheses; ${landmarkStrong?'ink/TD confirmed':path.anchorSource||'ratio hypothesis only'}`)
      },
      {
        id:'scale',label:'Physical Scale',status:scaleLayerStatus,
        detail:!scaleRequired?(constructionReference?'Direct construction reference; pixel scale is not needed for POM 12':(libraryPrior?'Library proposal; no pixel scale is claimed':'Numeric curve scale not applicable')):(!scalePass?`No ${path.viewRole} scale`:`${round(1/Number(scale.scale),1)} px/in; ${scale.source}`)
      },
      {
        id:'library',label:'Library Corroboration',
        status:approvedLibraryPass?'PASS':(libraryPass?'WEAK':'MISSING'),
        detail:generalLibraryBaseline?`${generalLibraryCount} general library records; construction filter pending`:(constructionReference&&matchingReferencePeers?`${matchingReferencePeers} synthetic peers match the 3-inch row rule; 0 approved`:(approvedLibraryPass?`${approvedPeerCount} approved peers`:(libraryPass?`${syntheticPeerCount} synthetic peers; 0 approved`:'No eligible compatible cohort')))
      },
      {
        id:'decision',label:'Trust Decision',status:status==='AUTO'?'PASS':(status==='REVIEW'?'WEAK':'MISSING'),
        detail:status
      }
    ];
    return {
      score:Math.round(score), measurementConfidence, status, valueAvailable, viewPass, anchorsPass, scalePass,
      scaleRequired, libraryPrior, generalLibraryBaseline, constructionReference, libraryPass, approvedLibraryPass, approvedPeerCount, viewStrong,constructionStrong,landmarkStrong, constructionPass, contradictionPass,layers,
      displayValueIn:status === 'INSUFFICIENT' ? null : Number(measurement.value_in),
      gateReason:status === 'AUTO'
        ? 'All mandatory evidence gates passed.'
        : (!valueAvailable ? 'No numeric proposal.'
          : (constructionReference ? 'Three detected back H&E rows provide a 3.00-inch POM 12 proposal for TD review.'
            : (generalLibraryBaseline ? 'General Library Baseline is available for TD review while construction remains unresolved.'
              : (libraryPrior ? 'Compatible library proposal is available for TD review; no sketch measurement is claimed.'
          : (!viewPass ? 'Required view is missing.'
            : (!anchorsPass ? 'Anchor pair is incomplete.'
              : (!scalePass ? 'Required view-local scale is missing.'
                : (!landmarkStrong ? 'Landmarks are geometry candidates, not ink-confirmed.'
                  : (!approvedLibraryPass ? 'No approved compatible library peers.'
                    : (!contradictionPass ? 'Sketch and library evidence disagree.'
                      : 'Evidence is usable but still requires TD review.'))))))))))
    };
  }

  function calculateEvidenceHealth(args) {
    const views = args.views || [];
    const paths = args.paths || [];
    const scales = args.scales || {};
    const gate = args.cohortGate || {};
    const detection = args.constructionDetection || {};
    const viewScore = views.length
      ? Math.round(views.reduce((sum,view) => sum + confidenceWeight(view.role === 'unknown' ? 'very_low' : view.confidence),0) / views.length * 100)
      : 0;
    const anchorScore = paths.length
      ? Math.round(paths.reduce((sum,path) => sum + (path.start && path.end ? confidenceWeight(path.confidence) : 0),0) / paths.length * 100)
      : 0;
    const scaleRows = ['front_outer','back'].map(role => scales[role]).filter(Boolean);
    const scaleScore = scaleRows.length ? Math.round(scaleRows.reduce((sum,row) => {
      if (row.status !== 'VALID' || !(row.scale > 0)) return sum;
      return sum + (row.source === 'td_explicit_calibration' ? 0.96 : (row.source === 'library_multi_anchor_inference' ? 0.68 : 0.55));
    },0) / scaleRows.length * 100) : 0;
    const peers = Number(gate.synthetic_measurement_peer_count) || 0;
    const minimum = Number(gate.minimum) || Number(args.minimumPeerCount) || 3;
    const approved = Number(gate.approved_production_peer_count) || 0;
    const libraryScore = gate.status === 'ELIGIBLE'
      ? Math.round(52 + 28 * clamp(peers / Math.max(minimum,1),0,1) + 20 * clamp(approved / Math.max(minimum,1),0,1))
      : Math.round(35 * clamp(peers / Math.max(minimum,1),0,1));
    return {
      viewDetection:clamp(viewScore,0,100),
      construction:clamp(Math.round((Number(detection.score)||0)*100*(detection.construction==='unknown'?.55:1)),0,100),
      anchors:clamp(anchorScore,0,100),
      absoluteScale:clamp(scaleScore,0,100),
      librarySupport:clamp(libraryScore,0,100)
    };
  }

  function fuseMeasurement(args) {
    const pom = String(args.pom);
    const path = args.path || null;
    const pixelLength = Number(args.pixelLength != null ? args.pixelLength : path && path.pixelLength);
    const viewRole = args.viewRole || (path && path.viewRole) || POM_VIEW_ROLES[pom];
    const viewScale = args.viewScale || null;
    if (!path || path.anchorStatus === 'NO_VIEW_EVIDENCE') return {
      pom, name:POM_NAMES[pom], viewRole, value_in:null, source:'none', confidence:'very_low',
      decision:'NO_VIEW_EVIDENCE', result_kind:'NO_DATA', reason:`Required ${viewRole} view was not detected.`,
      evidence:['required_view_missing']
    };
    if (!(pixelLength > 0) || !path.start || !path.end) return {
      pom, name:POM_NAMES[pom], viewRole, value_in:null, source:'none', confidence:'very_low',
      decision:'NO_ANCHOR_EVIDENCE', result_kind:'NO_DATA', reason:'A complete anchor pair was not detected.',
      evidence:['anchor_pair_missing']
    };
    const stats = cohortPomStats(args.fixture, args.cohortId, pom);
    const priorSnapshot = args.priors && args.priors.poms ? args.priors.poms[pom] : null;
    const cohortPrior = stats.median;
    const globalPrior = priorSnapshot && Number.isFinite(Number(priorSnapshot.median)) && Number(priorSnapshot.median) > 0
      ? Number(priorSnapshot.median)
      : null;
    if (pom === '14') {
      return stats.status === 'ELIGIBLE'
        ? { pom, name: POM_NAMES[pom], viewRole, value_in: cohortPrior, source: 'construction_cohort_prior', confidence: 'low', decision: 'LIBRARY_PRIOR', result_kind:'LIBRARY_PRIOR', reason:'Numeric value comes from the compatible cohort; the cross-view line is placement evidence only.', cohort: stats, evidence: ['placement_path_not_numeric_evidence'] }
        : (globalPrior
          ? { pom,name:POM_NAMES[pom],viewRole,value_in:globalPrior,source:'general_library_baseline',confidence:'low',decision:'LIBRARY_PRIOR',result_kind:'LIBRARY_PRIOR',reason:'Compatible construction cohort is insufficient; showing the General Library Baseline for TD review.',library_prior_count:Number(priorSnapshot.n)||0,cohort:stats,evidence:['construction_cohort_insufficient','general_library_baseline'] }
          : { pom, name:POM_NAMES[pom], viewRole, value_in: null, source: 'none', confidence:'very_low', decision:stats.status, result_kind:'NO_DATA', reason:'No eligible POM 14 cohort or general prior.', cohort:stats, evidence:['pom14_requires_eligible_library_prior'] });
    }
    if (pom === '15' || pom === '16') {
      const scale = Number(viewScale && viewScale.scale);
      if (!(scale > 0)) return stats.status === 'ELIGIBLE'
        ? { pom,name:POM_NAMES[pom],viewRole,value_in:cohortPrior,source:'construction_cohort_prior',confidence:'low',decision:'LIBRARY_PRIOR',result_kind:'LIBRARY_PRIOR',reason:`No valid ${viewRole} scale; showing the compatible cohort median for TD review.`,cohort:stats,evidence:['view_local_scale_missing','construction_compatible_library_prior'] }
        : { pom,name:POM_NAMES[pom],viewRole,value_in:null,source:'none',confidence:'very_low',decision:'NO_SCALE_EVIDENCE',result_kind:'NO_DATA',reason:`No valid ${viewRole} scale and no eligible compatible library prior.`,cohort:stats,evidence:['view_local_scale_missing'] };
      const value = pixelLength * scale;
      const explicit = viewScale.source === 'td_explicit_calibration';
      const placement = args.placementConfidence || path.confidence || 'low';
      const review = placement === 'low' || placement === 'very_low';
      return {
        pom, name:POM_NAMES[pom], viewRole, value_in:round(value,3),
        source:explicit ? 'sketch_explicit_calibration' : 'sketch_inferred_scale',
        confidence:review ? 'low' : (explicit ? 'medium' : 'low'),
        decision:review ? 'REVIEW_REQUIRED' : (explicit ? 'SKETCH_MEASUREMENT' : 'ESTIMATED_SUGGESTION'),
        result_kind:explicit ? 'SKETCH_MEASUREMENT' : 'ESTIMATED_SUGGESTION',
        reason:review ? 'Complete evidence with low placement confidence.' : 'Complete anchor pair and view-local scale.',
        formula:{ pixel_length:round(pixelLength,3), scale_in_per_px:round(scale,6), value_in:round(value,3) },
        scale_evidence:viewScale, cohort:stats,
        evidence:['required_view_detected','anchor_pair_candidate','view_local_scale']
      };
    }
    if (stats.status !== 'ELIGIBLE') {
      return globalPrior
        ? { pom,name:POM_NAMES[pom],viewRole,value_in:globalPrior,source:'general_library_baseline',confidence:'low',decision:'LIBRARY_PRIOR',result_kind:'LIBRARY_PRIOR',reason:'Compatible construction peers did not pass the cohort gate; showing the General Library Baseline for TD review.',library_prior_count:Number(priorSnapshot.n)||0,cohort:stats,evidence:['construction_gate_failed','general_library_baseline'] }
        : { pom,name:POM_NAMES[pom],viewRole,value_in:null,source:'none',confidence:'very_low',decision:stats.status,result_kind:'NO_DATA',reason:'Compatible construction peers did not pass the cohort gate and no general prior exists.',cohort:stats,evidence:['construction_gate_failed'] };
    }
    if (args.mode === 'prior') {
      return { pom, name: POM_NAMES[pom], viewRole, value_in: cohortPrior, source: 'construction_cohort_prior', confidence: 'low', decision: 'LIBRARY_PRIOR', result_kind:'LIBRARY_PRIOR', reason:'No view-local scale; value is the compatible cohort median.', cohort: stats, evidence: ['no_scale_evidence'] };
    }
    const scale = viewScale && viewScale.scale != null
      ? Number(viewScale.scale)
      : (args.mode === 'explicit' ? Number(args.explicitScale) : Number(args.inferredScale));
    if (!(scale > 0) || !(args.pixelLength > 0)) {
      return { pom, name: POM_NAMES[pom], viewRole, value_in: cohortPrior, source: 'construction_cohort_prior', confidence: 'low', decision: 'LIBRARY_PRIOR', result_kind:'LIBRARY_PRIOR', reason:'Invalid or missing view-local scale; value remains a compatible cohort median.', cohort: stats, evidence: ['invalid_or_missing_scale'] };
    }
    const sketchValue = args.pixelLength * scale;
    const tol = fractionToNumber(priorSnapshot && priorSnapshot.tol) || 0;
    const threshold = Math.max(tol, cohortPrior * 0.08);
    const difference = Math.abs(sketchValue - cohortPrior);
    const placement = args.placementConfidence || 'low';
    const agreement = difference <= threshold;
    const explicit = args.mode === 'explicit' || (viewScale && viewScale.source === 'td_explicit_calibration');
    const source = explicit ? 'sketch_explicit_calibration' : 'sketch_inferred_scale';
    const confidence = placement === 'low' ? 'low' : (args.mode === 'explicit' && placement === 'high' && agreement ? 'high' : 'medium');
    const decision = placement === 'low' || !agreement ? 'REVIEW_REQUIRED' : (explicit ? 'SKETCH_MEASUREMENT' : 'ESTIMATED_SUGGESTION');
    return {
      pom, name: POM_NAMES[pom], value_in: round(sketchValue, 3), source, confidence, decision,
      viewRole, result_kind:explicit ? 'SKETCH_MEASUREMENT' : 'ESTIMATED_SUGGESTION',
      library_prior_in: cohortPrior, difference_in: round(difference, 3), agreement_threshold_in: round(threshold, 3),
      formula:{ pixel_length:round(pixelLength,3), scale_in_per_px:round(scale,6), value_in:round(sketchValue,3) },
      scale_evidence:viewScale, cohort: stats, evidence: [args.mode + '_scale', 'candidate_pixel_path', 'construction_compatible_peers']
    };
  }

  // ---- Library × sketch fusion (ADR 0033) --------------------------------
  // Combine the two evidence sources for the most accurate per-POM value by a
  // precision-weighted SHRINKAGE toward a partial-pooled library expectation —
  // never a blind average. See docs/decisions/0033-mode-b-library-sketch-fusion.md.
  //
  // Only the corpus sketchReliable POMs are fusable (POM 1-4 schematic; 14 is
  // front-to-back and unmeasurable from separated views; 15/16 have no corpus).
  const SKETCH_MEASURABLE_POMS = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

  // Between-style spread as a fraction of the prior (σL/prior). Prefer the real
  // cohort value spread; fall back to a conservative 8%.
  function priorSpreadFrac(values, priorMedian) {
    if (Array.isArray(values) && values.length >= 2 && priorMedian > 0) {
      const m = values.reduce((s, x) => s + x, 0) / values.length;
      const variance = values.reduce((s, x) => s + (x - m) * (x - m), 0) / values.length;
      return Math.max(0.02, Math.sqrt(variance) / priorMedian);
    }
    return 0.08;
  }

  // Sketch noise as a fraction of the value (σs/value). Grows as the evidence
  // weakens: library-inferred scale > independent scale; candidate/ratio anchors
  // > ink/OpenCV-confirmed; short POMs (7/8) worst (relative error = err/length).
  function sketchSigmaFrac(args) {
    const base = args && args.scaleIndependent ? 0.03 : 0.08;
    const anchorFactor = args && args.anchorConfirmed ? 1.0 : 1.8;
    const shortFactor = args && args.shortPom ? 1.5 : 1.0;
    return base * anchorFactor * shortFactor;
  }

  // Coherent, view-wide style offset: robust median of (sketch/prior - 1). This
  // shared deviation is KEPT (partial pooling), so a uniformly small/large style
  // is not dragged back to the population mean. MAD is the in-distribution signal.
  function computeStyleOffset(pairs) {
    const ratios = (pairs || []).filter(p => p && p.prior > 0 && p.sketch > 0).map(p => p.sketch / p.prior - 1);
    if (ratios.length < 2) return { offset: 0, dispersion: null, n: ratios.length };
    const offset = median(ratios);
    const dispersion = median(ratios.map(r => Math.abs(r - offset)));
    return { offset: round(clamp(offset, -0.25, 0.25), 4), dispersion: round(dispersion, 4), n: ratios.length };
  }

  // Precision-weighted shrinkage of one POM toward its style-adjusted prior.
  //   styleExpected = prior · (1 + styleOffset)
  //   fused         = styleExpected + k · (sketch − styleExpected),  k = σL²/(σL²+σs²)
  function fusePomValue(args) {
    const sketch = Number(args.sketchValue), prior = Number(args.prior);
    const styleOffset = Number(args.styleOffset) || 0;
    const sL = Math.max(1e-6, Number(args.priorSpreadFrac) || 0.08);
    const sS = Math.max(1e-6, Number(args.sketchSigmaFrac) || 0.08);
    const k = (sL * sL) / (sL * sL + sS * sS);
    const styleExpected = prior * (1 + styleOffset);
    const fused = styleExpected + k * (sketch - styleExpected);
    const residual = prior > 0 ? (sketch / prior - 1 - styleOffset) : 0;
    return {
      fused: round(fused, 3), k: round(k, 3), styleExpected: round(styleExpected, 3),
      residual: round(residual, 4), sketch_value_in: round(sketch, 3), prior_in: round(prior, 3),
    };
  }

  // Classify a conflict from the per-POM residual and the view dispersion.
  function diagnoseFusion(args) {
    const residual = Math.abs(Number(args.residual) || 0);
    const dispersion = Number(args.dispersion);
    const outlierThreshold = Number(args.outlierThreshold) || 0.15;
    const scatterThreshold = Number(args.scatterThreshold) || 0.12;
    if (Number.isFinite(dispersion) && dispersion > scatterThreshold) return 'scale_suspect';
    if (residual > outlierThreshold) return 'anchor_outlier';
    return 'coherent';
  }

  function isFusableRow(row) {
    return !!row && SKETCH_MEASURABLE_POMS.includes(String(row.pom))
      && (row.result_kind === 'SKETCH_MEASUREMENT' || row.result_kind === 'ESTIMATED_SUGGESTION')
      && Number.isFinite(Number(row.value_in))
      && Number.isFinite(Number(row.library_prior_in)) && Number(row.library_prior_in) > 0;
  }

  // Orchestrate fusion across a whole analysis' measurement rows, view by view.
  // Mutates fusable rows in place (value_in -> fused, adds .fusion, downgrades a
  // conflicted row to REVIEW) and returns per-view fusion summaries.
  function fuseWithLibrary(measurements, options) {
    options = options || {};
    const byView = {};
    for (const row of (measurements || [])) {
      if (isFusableRow(row)) (byView[row.viewRole] = byView[row.viewRole] || []).push(row);
    }
    const viewFusion = {};
    for (const [viewRole, viewRows] of Object.entries(byView)) {
      const off = computeStyleOffset(viewRows.map(r => ({ pom: r.pom, sketch: Number(r.value_in), prior: Number(r.library_prior_in) })));
      viewFusion[viewRole] = off;
      for (const row of viewRows) {
        const scaleSource = (row.scale_evidence && (row.scale_evidence.source || row.scale_evidence.precedence)) || '';
        const scaleIndependent = /td_explicit_calibration|opencv_hook_eye_rows_reference|construction_reference/.test(scaleSource);
        const anchorConfirmed = typeof row.anchorStatus === 'string' && /ink|opencv|confirmed|td_/i.test(row.anchorStatus);
        const spreadFrac = priorSpreadFrac(row.cohort && row.cohort.values, Number(row.library_prior_in));
        const sigmaFrac = sketchSigmaFrac({ scaleIndependent, anchorConfirmed, shortPom: row.pom === '7' || row.pom === '8' });
        const f = fusePomValue({ sketchValue: Number(row.value_in), prior: Number(row.library_prior_in), priorSpreadFrac: spreadFrac, sketchSigmaFrac: sigmaFrac, styleOffset: off.offset });
        const diagnosis = diagnoseFusion({ residual: f.residual, dispersion: off.dispersion });
        row.pre_fusion_value_in = round(Number(row.value_in), 3);
        row.value_in = f.fused;
        row.fusion = Object.assign({}, f, {
          styleOffset: off.offset, dispersion: off.dispersion, diagnosis,
          sketchSigmaFrac: round(sigmaFrac, 3), priorSpreadFrac: round(spreadFrac, 3),
          scaleIndependent, anchorConfirmed,
        });
        if (diagnosis === 'anchor_outlier' || diagnosis === 'scale_suspect') {
          row.decision = 'REVIEW_REQUIRED';
          if (row.result_kind === 'SKETCH_MEASUREMENT') row.result_kind = 'ESTIMATED_SUGGESTION';
          row.confidence = 'low';
        } else if (!scaleIndependent && row.confidence === 'high') {
          row.confidence = 'medium';
        }
        row.source = String(row.source || '') + '+library_fusion';
      }
    }
    return { viewFusion };
  }

  function createFinalizationRows(measurements, analysisRun) {
    return (measurements || []).map(measurement => ({
      pom:String(measurement.pom), name:measurement.name,
      analysisRun:Number(analysisRun),
      suggestionValueIn:measurement.value_in != null && Number.isFinite(Number(measurement.value_in)) ? Number(measurement.value_in) : null,
      suggestionSource:measurement.source || 'none',
      suggestionConfidence:measurement.confidence || 'very_low',
      suggestionDecision:measurement.decision || 'NO_DATA',
      resultKind:measurement.result_kind || measurement.decision || 'NO_DATA',
      evidenceTrace:Array.isArray(measurement.evidence_trace) ? measurement.evidence_trace : [],
      layerProof:Array.isArray(measurement.layer_proof) ? measurement.layer_proof : [],
      tdAction:'unresolved', finalValueIn:null, inputText:'', status:'UNRESOLVED'
    }));
  }

  function resolveFinalRow(row, action, inputText) {
    const next = Object.assign({},row,{ tdAction:action || 'unresolved', inputText:inputText == null ? row.inputText || '' : String(inputText) });
    if (action === 'accept_suggestion') {
      if (Number.isFinite(row.suggestionValueIn) && row.suggestionValueIn > 0) return Object.assign(next,{ finalValueIn:round(row.suggestionValueIn,3),status:'RESOLVED' });
      return Object.assign(next,{ finalValueIn:null,status:'SUGGESTION_MISSING' });
    }
    if (action === 'td_override') {
      const value = fractionToNumber(next.inputText);
      return value > 0
        ? Object.assign(next,{ finalValueIn:round(value,3),status:'RESOLVED' })
        : Object.assign(next,{ finalValueIn:null,status:'INVALID_OVERRIDE' });
    }
    if (action === 'no_data' || action === 'not_applicable') return Object.assign(next,{ finalValueIn:null,status:'RESOLVED' });
    if (action === 'reject_suggestion') return Object.assign(next,{ finalValueIn:null,status:'REJECTED_NEEDS_RESOLUTION' });
    return Object.assign(next,{ tdAction:'unresolved',finalValueIn:null,status:'UNRESOLVED' });
  }

  function acceptHighConfidence(rows) {
    return (rows || []).map(row => (
      row.status === 'UNRESOLVED' && row.resultKind === 'SKETCH_MEASUREMENT' &&
      row.suggestionConfidence === 'high' && Number.isFinite(row.suggestionValueIn)
    ) ? resolveFinalRow(row,'accept_suggestion') : Object.assign({},row));
  }

  function markMissingNoData(rows) {
    return (rows || []).map(row => (
      row.status === 'UNRESOLVED' && !Number.isFinite(row.suggestionValueIn)
    ) ? resolveFinalRow(row,'no_data') : Object.assign({},row));
  }

  function finalizationSummary(rows, expectedCount) {
    const list = rows || [];
    const expected = expectedCount == null ? 16 : expectedCount;
    const resolved = list.filter(row=>row.status==='RESOLVED').length;
    const numeric = list.filter(row=>row.status==='RESOLVED'&&Number.isFinite(row.finalValueIn)).length;
    const noData = list.filter(row=>row.status==='RESOLVED'&&row.tdAction==='no_data').length;
    const notApplicable = list.filter(row=>row.status==='RESOLVED'&&row.tdAction==='not_applicable').length;
    const rejected = list.filter(row=>row.status==='REJECTED_NEEDS_RESOLUTION').length;
    const invalid = list.filter(row=>row.status==='INVALID_OVERRIDE'||row.status==='SUGGESTION_MISSING').length;
    return { expected,rows:list.length,resolved,unresolved:list.length-resolved,numeric,noData,notApplicable,rejected,invalid,canLock:list.length===expected&&resolved===expected };
  }

  function lockFinalization(rows, metadata) {
    const meta = metadata || {};
    const summary = finalizationSummary(rows,16);
    const stale = (rows || []).some(row=>Number(row.analysisRun)!==Number(meta.analysisRun));
    if (!summary.canLock || stale) return { ok:false,status:stale?'STALE_EVIDENCE':'BLOCKED',summary };
    return {
      ok:true,status:'LOCKED',
      payload:{
        schema_version:'final-size-l-set.v1',
        unit:'in', analysis_run:Number(meta.analysisRun), image:meta.image || null,
        construction:meta.construction || 'unknown',
        pilot:meta.pilot || null,
        summary,
        rows:(rows||[]).map(row=>({
          pom:row.pom,name:row.name,td_action:row.tdAction,final_value_in:row.finalValueIn,
          suggestion:{ value_in:row.suggestionValueIn,source:row.suggestionSource,confidence:row.suggestionConfidence,decision:row.suggestionDecision },
          workbench:{ status:row.workbenchStatus||null,measurement_confidence:row.confidenceScore==null?null:row.confidenceScore,evidence_coverage_score:row.evidenceCoverageScore==null?null:row.evidenceCoverageScore,gate_reason:row.gateReason||null,auto_accepted:Boolean(row.autoAccepted),layers:row.layerProof||[] },
          evidence_trace:row.evidenceTrace,analysis_run:row.analysisRun
        }))
      }
    };
  }

  return { POM_NAMES, POM_VIEW_ROLES, POM_ANCHORS, clamp, round, median, fractionToNumber, detectRegularRowCount, cohortById, cohortSummary, cohortPomStats, hookEyePom12Reference, classifyConstruction, deriveViewRegionsFromColumns, deriveCandidatePaths, pathsFromDetectedAnchors, corroborateConstruction, retrieveSimilarStyle, learnCorrections, applyLearnedCorrection, viewScaleFromCalibration, buildExplicitViewScales, inferScale, resolveViewScales, computeStyleOffset, fusePomValue, diagnoseFusion, fuseWithLibrary, priorSpreadFrac, sketchSigmaFrac, confidenceWeight, deriveConstructionTags, measurementEvidenceOutcome, calculateEvidenceHealth, fuseMeasurement, createFinalizationRows, resolveFinalRow, acceptHighConfidence, markMissingNoData, finalizationSummary, lockFinalization };
});
