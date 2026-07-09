  // ===========================================================================
  // Curve geometry. All cubic Bézier math and curved-line construction live
  // here so future curve tweaks are in one place. The build concatenates every
  // src/*.js part into one shared scope, so these are callable from
  // manual-tools.js / rendering.js without any import wiring.
  //
  //   Data model: a curved annotation is one or two cubic Bézier segments.
  //   With a middle anchor (midPoint) + its two handles (midHandleIn/Out) it's
  //   two segments joined there; otherwise a single cubic via control1/control2.
  // ===========================================================================

  // A curved line is one or two cubic Bézier segments. With a middle anchor
  // (midPoint) plus its two handles it's two segments joined there; without
  // them (older lines, in-progress drafts) it's a single segment. Everything
  // that samples, draws, or measures a curve goes through here so both shapes
  // just work.
  function getCurveBeziers(ann) {
    if (!ann || ann.type !== 'curved') return [];
    if (ann.midPoint && ann.midHandleIn && ann.midHandleOut) {
      return [
        { p0: ann.start, p1: ann.control1, p2: ann.midHandleIn, p3: ann.midPoint },
        { p0: ann.midPoint, p1: ann.midHandleOut, p2: ann.control2, p3: ann.end },
      ];
    }
    return [{ p0: ann.start, p1: ann.control1, p2: ann.control2, p3: ann.end }];
  }

  // Split a single cubic (start,c1,c2,end) at t=0.5 via De Casteljau. The two
  // resulting segments trace the IDENTICAL curve, but now there is a real
  // middle anchor with its own in/out handles. Used to seed new curves and to
  // migrate old ones without changing how they look.
  function deriveMidAnchor(start, c1, c2, end) {
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const p01 = mid(start, c1);
    const p12 = mid(c1, c2);
    const p23 = mid(c2, end);
    const p012 = mid(p01, p12);
    const p123 = mid(p12, p23);
    const p0123 = mid(p012, p123);
    return { control1: p01, midHandleIn: p012, midPoint: p0123, midHandleOut: p123, control2: p23 };
  }

  // Build a smooth two-segment curve that PASSES THROUGH start, mid, end (the
  // three clicked points). Catmull-Rom with reflected endpoints: the tangent at
  // the middle is parallel to the start→end chord, so the joint stays smooth.
  function curveControlsThroughThreePoints(start, mid, end) {
    return {
      control1: { x: start.x + (mid.x - start.x) / 3, y: start.y + (mid.y - start.y) / 3 },
      midHandleIn: { x: mid.x - (end.x - start.x) / 6, y: mid.y - (end.y - start.y) / 6 },
      midPoint: { x: mid.x, y: mid.y },
      midHandleOut: { x: mid.x + (end.x - start.x) / 6, y: mid.y + (end.y - start.y) / 6 },
      control2: { x: end.x - (end.x - mid.x) / 3, y: end.y - (end.y - mid.y) / 3 },
    };
  }

  function bezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    const a = mt2 * mt;
    const b = 3 * mt2 * t;
    const c = 3 * mt * t2;
    const d = t * t2;
    return {
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
    };
  }

  function bezierTangent(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
      y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
    };
  }

  function createCurvedAnnotation(start, end, style, color = 'red', arrowType = 'double', lineWidth = DEFAULT_LINE_WIDTH, mid = null) {
    const id = state.idCounter++;
    // With an explicit middle point (3-click draw) build a smooth curve through
    // all three points; otherwise seed a default bow and split it at the middle
    // so the line still ships with a real center anchor + its two handles.
    let m;
    if (mid) {
      m = curveControlsThroughThreePoints(start, mid, end);
    } else {
      const midRaw = defaultCurveMidPoint(start, end);
      const single = controlsFromMidPoint(start, end, midRaw);
      m = deriveMidAnchor(start, single.control1, single.control2, end);
    }
    const label = computeDefaultLabelPosition({
      type: 'curved',
      start,
      end,
      control1: m.control1,
      control2: m.control2,
      midPoint: m.midPoint,
      midHandleIn: m.midHandleIn,
      midHandleOut: m.midHandleOut,
    });
    return {
      id,
      seq: state.nextSequence,
      type: 'curved',
      style,
      color,
      arrowType,
      lineWidth: normalizeLineWidth(lineWidth),
      start: clonePoint(start),
      end: clonePoint(end),
      midPoint: m.midPoint,
      midHandleIn: m.midHandleIn,
      midHandleOut: m.midHandleOut,
      control1: m.control1,
      control2: m.control2,
      label,
      labelManual: false,
      text: null,
      value: null,
    };
  }

  // Default bow when drawing a new curve — perpendicular offset matching the
  // pre-midPoint visual default, so new curves look identical.
  function defaultCurveMidPoint(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const offset = clamp(len * 0.16, 26 / state.zoom, 82 / state.zoom);
    return {
      x: (start.x + end.x) / 2 + nx * offset,
      y: (start.y + end.y) / 2 + ny * offset,
    };
  }

  // Derive cubic Bézier controls so the curve passes through `midPoint` at
  // t=0.5 with tangent parallel to the chord. Place controls symmetrically
  // at the t=1/3 and t=2/3 chord positions and lift by (4/3)·(midPoint −
  // chordMid). See B(0.5) = 0.125·S + 0.375·P1 + 0.375·P2 + 0.125·E.
  function controlsFromMidPoint(start, end, midPoint) {
    const cmx = (start.x + end.x) / 2;
    const cmy = (start.y + end.y) / 2;
    const px = (4 / 3) * (midPoint.x - cmx);
    const py = (4 / 3) * (midPoint.y - cmy);
    return {
      control1: {
        x: start.x + (end.x - start.x) / 3 + px,
        y: start.y + (end.y - start.y) / 3 + py,
      },
      control2: {
        x: start.x + 2 * (end.x - start.x) / 3 + px,
        y: start.y + 2 * (end.y - start.y) / 3 + py,
      },
    };
  }

  // Back-compat + upgrade: ensure every curved line has the two-segment anchor
  // set (midPoint + midHandleIn/Out). Older saves and auto-draft rows store
  // only control1/control2 (a single cubic); split that at t=0.5 so the middle
  // handle UI has something to grab, without changing the curve's shape.
  function ensureCurveMidPoint(ann) {
    if (!ann || ann.type !== 'curved' || !ann.start || !ann.end) return;
    const ready = ann.midPoint && ann.midHandleIn && ann.midHandleOut &&
      [ann.midPoint, ann.midHandleIn, ann.midHandleOut].every(
        (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
    if (ready) return;
    let c1 = ann.control1, c2 = ann.control2;
    if (!c1 || !c2) {
      const m0 = defaultCurveMidPoint(ann.start, ann.end);
      const c = controlsFromMidPoint(ann.start, ann.end, m0);
      c1 = c.control1; c2 = c.control2;
    }
    const m = deriveMidAnchor(ann.start, c1, c2, ann.end);
    ann.control1 = m.control1;
    ann.control2 = m.control2;
    ann.midPoint = m.midPoint;
    ann.midHandleIn = m.midHandleIn;
    ann.midHandleOut = m.midHandleOut;
  }
