// Annotation drawing primitives: line core + path, arrowheads, label,
// selection helpers, and handles. Source part for app.js.
// Run `npm run build` after editing.
//
// drawAnnotation is the top-level entry; it dispatches between
// drawLineCore (committed/draft line body and stitches) and the helpers
// here (handles, label, etc.). drawLabel and drawSelectionHelpers carry
// state-aware tweaks (e.g. selection highlight, alpha) so the same
// helpers serve hover, selected, and draft renderings.

  function drawAnnotation(ann) {
    drawLineCore(ann, 1);
    if (state.editingLabelId === ann.id) return;
    if (!labelsVisible()) return;
    drawLabel(ann.label, getLabelText(ann), state.selection.kind === 'annotation' && ann.id === state.selection.id, 1, getAnnotationColor(ann));
  }

  function drawLineCore(ann, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const color = getAnnotationColor(ann);
    ctx.strokeStyle = color;
    const lineWidth = getLineWidth(ann);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let style = getLineStyle(ann);
    if (style === 'solid' && annotationCrossesViews(ann)) style = 'dashed';

    if (style === 'zigzag') {
      drawZigzagStitchLine(ann, color, lineWidth);
    } else if (style === 'cover') {
      drawCoverStitchLine(ann, color, lineWidth);
    } else if (style === 'bartack') {
      drawBartackStitchLine(ann, color, lineWidth);
    } else {
      ctx.lineWidth = lineWidth / state.zoom;
      ctx.setLineDash(style === 'dashed' ? [10 / state.zoom, 7 / state.zoom] : []);
      drawAnnotationPath(ann);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    if (ann.type === 'straight') {
      drawArrowheadsForStraight(ann, color, lineWidth);
    } else {
      drawArrowheadsForCurve(ann, color, lineWidth);
    }
    ctx.restore();
  }

  function drawAnnotationPath(ann) {
    ctx.beginPath();
    ctx.moveTo(ann.start.x, ann.start.y);
    if (ann.type === 'straight') {
      ctx.lineTo(ann.end.x, ann.end.y);
    } else {
      for (const s of getCurveBeziers(ann)) {
        ctx.bezierCurveTo(s.p1.x, s.p1.y, s.p2.x, s.p2.y, s.p3.x, s.p3.y);
      }
    }
  }

  function drawArrowheadsForStraight(ann, color, lineWidth) {
    const arrowType = getArrowType(ann);
    if (arrowType === 'none') return;
    const arrowSize = (10 + lineWidth * 0.55) / state.zoom;
    drawArrowhead(ann.end, Math.atan2(ann.end.y - ann.start.y, ann.end.x - ann.start.x), arrowSize, color);
    if (arrowType === 'double') {
      drawArrowhead(ann.start, Math.atan2(ann.start.y - ann.end.y, ann.start.x - ann.end.x), arrowSize, color);
    }
  }

  function drawArrowheadsForCurve(ann, color, lineWidth) {
    const arrowType = getArrowType(ann);
    if (arrowType === 'none') return;
    const arrowSize = (10 + lineWidth * 0.55) / state.zoom;
    const endAngle = Math.atan2(ann.end.y - ann.control2.y, ann.end.x - ann.control2.x);
    drawArrowhead(ann.end, endAngle, arrowSize, color);
    if (arrowType === 'double') {
      const startAngle = Math.atan2(ann.start.y - ann.control1.y, ann.start.x - ann.control1.x);
      drawArrowhead(ann.start, startAngle, arrowSize, color);
    }
  }

  function drawArrowhead(point, angle, size, color = LINE_COLOR) {
    const spread = Math.PI / 7;
    const wing = size * 0.9;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(
      point.x - Math.cos(angle - spread) * wing,
      point.y - Math.sin(angle - spread) * wing
    );
    ctx.lineTo(
      point.x - Math.cos(angle + spread) * wing,
      point.y - Math.sin(angle + spread) * wing
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLabel(pos, text, selected, alpha = 1, color = LINE_COLOR) {
    const fontSize = 17 / state.zoom;
    const halo = 3 / state.zoom;
    // White label fill is invisible on the white canvas — use a dark halo so
    // the callout number still reads when the line color is white.
    const isWhiteFill = String(color || '').toLowerCase() === '#ffffff';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 ' + fontSize + 'px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = isWhiteFill ? halo * 1.4 : halo;
    ctx.shadowColor = 'rgba(17,24,39,.18)';
    ctx.shadowBlur = 4 / state.zoom;
    ctx.shadowOffsetY = 1 / state.zoom;
    ctx.strokeStyle = isWhiteFill ? '#111827' : '#ffffff';
    ctx.strokeText(String(text), pos.x, pos.y);
    ctx.fillStyle = color;
    ctx.fillText(String(text), pos.x, pos.y);
    ctx.restore();
  }

  function drawSelectionHelpers(ann) {
    ctx.save();

    if (ann.type === 'curved') {
      const twoSeg = !!(ann.midPoint && ann.midHandleIn && ann.midHandleOut);
      ctx.setLineDash([6 / state.zoom, 5 / state.zoom]);
      ctx.strokeStyle = 'rgba(53,109,255,.45)';
      ctx.lineWidth = 1.2 / state.zoom;
      ctx.beginPath();
      // Separate handle lines: one per endpoint, plus two at the middle anchor
      // (one toward each end). Each handle bends only its own side of the curve.
      if (ann.control1) { ctx.moveTo(ann.start.x, ann.start.y); ctx.lineTo(ann.control1.x, ann.control1.y); }
      if (ann.control2) { ctx.moveTo(ann.end.x, ann.end.y); ctx.lineTo(ann.control2.x, ann.control2.y); }
      if (twoSeg) {
        ctx.moveTo(ann.midPoint.x, ann.midPoint.y); ctx.lineTo(ann.midHandleIn.x, ann.midHandleIn.y);
        ctx.moveTo(ann.midPoint.x, ann.midPoint.y); ctx.lineTo(ann.midHandleOut.x, ann.midHandleOut.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (ann.control1) drawHandle(ann.control1, false);
      if (ann.control2) drawHandle(ann.control2, false);
      if (twoSeg) {
        drawHandle(ann.midHandleIn, false);
        drawHandle(ann.midHandleOut, false);
      }
      if (ann.midPoint) drawHandle(ann.midPoint, false);
    }

    drawHandle(ann.start, true);
    drawHandle(ann.end, true);
    drawLabelHandle(ann.label, getAnnotationColor(ann));
    ctx.restore();
  }

  function drawHandle(point, emphasized) {
    const r = (emphasized ? 7.5 : 6.0) / state.zoom;
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2 / state.zoom;
    ctx.strokeStyle = emphasized ? SELECT_COLOR : 'rgba(53,109,255,.72)';
    ctx.stroke();
    ctx.restore();
  }

  function drawLabelHandle(point, color = LINE_COLOR) {
    const r = 7 / state.zoom;
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.fill();
    ctx.lineWidth = 2 / state.zoom;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }
