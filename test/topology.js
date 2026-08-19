// Topology layer prototype — structure from LINE ART, not from texture.
//
// A technical flat is line art: the drawn lines ARE the structure. Canny/Hough
// texture analysis throws that away, which is why two anchors fail today:
//   * apex lands on the wide-set STRAP JOIN instead of the cup centre
//     (EvelynBliss POM 16 = 11.44 in, apex/half-band 78% vs a real ~45-55%);
//   * cradle anchors are missing on a WIRELESS style, because there is no wire
//     arc to find — even though a cradle seam is clearly drawn (POM 6/7/8 NO DATA).
//
// These functions are PURE (profiles in, structure out) so they unit-test in Node
// with no browser. Pixel extraction stays in the browser (the only place with a
// canvas); it feeds these the per-view ink profiles.
//
// Every threshold is expressed as a FRACTION of view width/height — absolute
// pixel constants would not survive a different sketch scale.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MeasurementTopology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function smooth(values, window) {
    const w = Math.max(1, Math.round(window || 1));
    if (w < 2) return (values || []).slice();
    const out = [];
    for (let i = 0; i < values.length; i += 1) {
      let sum = 0, n = 0;
      for (let k = i - (w >> 1); k <= i + (w >> 1); k += 1) {
        if (k < 0 || k >= values.length) continue;
        sum += Number(values[k]) || 0; n += 1;
      }
      out.push(n ? sum / n : 0);
    }
    return out;
  }

  // First/last index with meaningful ink — the drawing's extent inside the view.
  function inkExtent(profile, options) {
    options = options || {};
    const minInk = Number(options.minInk) || 1;
    let first = -1, last = -1;
    for (let i = 0; i < profile.length; i += 1) {
      if ((Number(profile[i]) || 0) >= minInk) { if (first < 0) first = i; last = i; }
    }
    return { first, last, length: first < 0 ? 0 : last - first + 1 };
  }

  // Local maxima that genuinely stand out. Two subtleties, both learned the hard
  // way on a synthetic flat and they matter just as much on real data:
  //
  //  * PROMINENCE, not just "is a local max". A flat plateau of body ink makes
  //    every point a local max, which floods the result with phantom bands and
  //    lets a plateau point outrank the real band-top line. A peak must rise
  //    above the local baseline on BOTH sides to count.
  //  * SNAP TO RAW. Smoothing is needed to survive 1px noise but shifts a peak's
  //    index (hem 230 -> 229). Detect on the smoothed profile, then report the
  //    raw profile's maximum nearby, so positions stay pixel-true.
  function findPeaks(profile, options) {
    options = options || {};
    const win = Math.max(1, Math.round(options.smooth || 3));
    const values = smooth(profile, win);
    const max = values.reduce((m, v) => Math.max(m, v), 0);
    if (!(max > 0)) return [];
    const minInk = max * (options.minFraction == null ? 0.25 : options.minFraction);
    const minSeparation = Math.max(1, Math.round(options.minSeparation || 3));
    const minProminence = max * (options.minProminenceFraction == null ? 0.12 : options.minProminenceFraction);
    const look = Math.max(2, minSeparation);

    const candidates = [];
    for (let i = 1; i < values.length - 1; i += 1) {
      if (!(values[i] >= values[i - 1] && values[i] >= values[i + 1] && values[i] >= minInk)) continue;
      let leftMin = values[i], rightMin = values[i];
      for (let k = i - 1; k >= Math.max(0, i - look); k -= 1) leftMin = Math.min(leftMin, values[k]);
      for (let k = i + 1; k <= Math.min(values.length - 1, i + look); k += 1) rightMin = Math.min(rightMin, values[k]);
      const prominence = values[i] - Math.max(leftMin, rightMin);
      if (prominence < minProminence) continue;
      // Snap to the raw profile's local maximum so the index is pixel-true.
      let bestIdx = i, bestRaw = Number(profile[i]) || 0;
      for (let k = Math.max(0, i - win); k <= Math.min(profile.length - 1, i + win); k += 1) {
        const v = Number(profile[k]) || 0;
        if (v > bestRaw) { bestRaw = v; bestIdx = k; }
      }
      candidates.push({ index: bestIdx, ink: bestRaw, prominence: Math.round(prominence * 100) / 100 });
    }
    candidates.sort((a, b) => b.ink - a.ink);
    const kept = [];
    for (const p of candidates) {
      if (kept.every(k => Math.abs(k.index - p.index) >= minSeparation)) kept.push(p);
    }
    return kept.sort((a, b) => a.index - b.index);
  }

  // Horizontal structural lines of a view (hem, band top, cradle seam, gore top).
  function findHorizontalBands(rowInk, options) {
    options = options || {};
    const height = rowInk.length;
    const extent = inkExtent(rowInk, { minInk: Math.max(1, Math.round(height * 0.01)) });
    const bands = findPeaks(rowInk, {
      minFraction: options.minFraction == null ? 0.2 : options.minFraction,
      minSeparation: Math.max(2, Math.round(height * (options.minSeparationFrac || 0.02))),
      smooth: 3,
    }).map(p => ({ y: p.index, ink: p.ink }));
    return { bands, inkTop: extent.first, inkBottom: extent.last, inkHeight: extent.length };
  }

  // Name the front view's bands by where they sit in the garment, bottom-up:
  //   hem        strongest band in the lowest fifth of the drawing
  //   bandTop    next band above the hem — the underbust seam
  //   cradleSeam next band above that — the cup/band boundary. Present whether or
  //              not the style has a wire, which is the whole point for POM 6/7/8.
  //   goreTop    a band in the upper half — the centre-front gore top (cf-top)
  // TWO PASSES, because a garment's zones carry very different ink weight: the
  // band/hem is dense stitching while cup and gore seams are single light lines.
  // One global threshold either drowns the cup seams (demo3 found only 2 bands)
  // or floods the band zone. So: find hem + band top globally, then re-detect
  // ABOVE the band top with its own local normalisation. Ordering is enforced
  // (gore strictly above cradle, cradle strictly above band top) — without that,
  // one band gets selected twice and the cup zone collapses (demo4: 165/165).
  function interpretFrontBands(rowInk, options) {
    options = options || {};
    const global = findHorizontalBands(rowInk, options);
    const { bands, inkTop, inkBottom, inkHeight } = global;
    if (!bands.length || inkHeight <= 0) {
      return { hemY: null, bandTopY: null, cradleSeamY: null, goreTopY: null, bands, upperBands: [] };
    }
    const minGap = Math.max(2, Math.round(inkHeight * (options.minGapFrac || 0.02)));
    const lowestFifth = inkBottom - inkHeight * 0.2;
    const inLowest = bands.filter(b => b.y >= lowestFifth);
    const hem = (inLowest.length ? inLowest : bands).reduce((best, b) => (b.ink > best.ink ? b : best), (inLowest[0] || bands[0]));
    const bandTop = bands.filter(b => b.y < hem.y - minGap)
      .reduce((best, b) => (!best || b.y > best.y ? b : best), null);

    // Pass 2: the cup region, normalised to ITS OWN max so light seams surface.
    const upperLimit = bandTop ? bandTop.y : hem.y;
    let upperBands = [];
    if (upperLimit - inkTop > minGap * 2) {
      const slice = rowInk.slice(inkTop, upperLimit);
      upperBands = findHorizontalBands(slice, {
        minFraction: options.upperMinFraction == null ? 0.35 : options.upperMinFraction,
        minSeparationFrac: options.minSeparationFrac || 0.02,
        minProminenceFraction: options.upperMinProminenceFraction == null ? 0.15 : options.upperMinProminenceFraction,
      }).bands.map(b => ({ y: b.y + inkTop, ink: b.ink }));
    }
    // Cradle seam = the LOWEST light band in the cup region (cup/band boundary).
    const cradle = upperBands.filter(b => b.y < upperLimit - minGap)
      .reduce((best, b) => (!best || b.y > best.y ? b : best), null);
    // Gore top = a band strictly ABOVE the cradle seam (never the same line).
    const goreCandidates = upperBands.filter(b => (cradle ? b.y < cradle.y - minGap : b.y < upperLimit - minGap));
    const gore = goreCandidates.length
      ? goreCandidates.reduce((best, b) => (b.ink > best.ink ? b : best), goreCandidates[0])
      : null;
    return {
      hemY: hem ? hem.y : null,
      bandTopY: bandTop ? bandTop.y : null,
      cradleSeamY: cradle ? cradle.y : null,
      goreTopY: gore ? gore.y : null,
      bands, upperBands,
    };
  }

  // The cup band: between the gore top and the cradle seam. This is the only
  // y-range where a cup apex can legitimately live — a point above it (a strap
  // join) is structurally impossible as an apex.
  function deriveCupZone(named, options) {
    options = options || {};
    const top = named.goreTopY, bottom = named.cradleSeamY != null ? named.cradleSeamY : named.bandTopY;
    if (top == null || bottom == null || bottom <= top) return null;
    return { top, bottom, midY: Math.round((top + bottom) / 2), height: bottom - top };
  }

  // Vertical structural rails of a zone (side edges + centre front).
  function findVerticalRails(colInk, options) {
    options = options || {};
    const width = colInk.length;
    return findPeaks(colInk, {
      minFraction: options.minFraction == null ? 0.3 : options.minFraction,
      minSeparation: Math.max(2, Math.round(width * (options.minSeparationFrac || 0.05))),
      smooth: 3,
    }).map(p => ({ x: p.index, ink: p.ink }));
  }

  // Cup apex from rails, NOT from hardware. Inside the cup zone the drawing is
  // bounded by the two side edges with the centre-front rail between them; each
  // cup's apex is the midpoint of its own half. For a symmetric flat this puts
  // the two apexes at ~1/4 and ~3/4 of the width, i.e. ~50% of the band apart —
  // which is the realistic apex/half-band ratio, and structurally impossible to
  // confuse with a strap join.
  function deriveCupApex(colInkInZone, options) {
    options = options || {};
    const width = colInkInZone.length;
    const extent = inkExtent(colInkInZone, { minInk: 1 });
    if (extent.first < 0 || extent.length < width * 0.2) return null;
    const rails = findVerticalRails(colInkInZone, options);
    const centreTarget = (extent.first + extent.last) / 2;
    const tolerance = width * (options.centreToleranceFrac || 0.12);
    const centreCandidates = rails.filter(r => Math.abs(r.x - centreTarget) <= tolerance);
    const centre = centreCandidates.length
      ? centreCandidates.reduce((best, r) => (r.ink > best.ink ? r : best), centreCandidates[0])
      : { x: Math.round(centreTarget), ink: null, inferred: true };
    const leftEdge = extent.first, rightEdge = extent.last;
    if (!(centre.x > leftEdge && centre.x < rightEdge)) return null;
    return {
      leftApexX: Math.round((leftEdge + centre.x) / 2),
      rightApexX: Math.round((centre.x + rightEdge) / 2),
      centreX: centre.x,
      centreFromRail: !centre.inferred,
      leftEdge, rightEdge,
      rails,
    };
  }

  // Plausibility of an apex pair: apex separation as a fraction of the band width.
  //
  // Calibration, not a guess: a size-L apex-to-apex is ~7.5-8.5 in against a
  // ~14 in half-band, so the real ratio sits near 8/14 = 0.57. Graded rather than
  // a hard pass/fail, because the difference between "a bit wide" and "seeded on
  // the strap join" matters — crying wolf on a marginal style would train people
  // to ignore the check.
  //   < 0.40        too narrow — reads as the gore, not the apex
  //   0.40 - 0.62   plausible
  //   0.62 - 0.68   suspect — worth a TD glance
  //   > 0.68        implausible — the strap-join failure mode
  function apexPlausibility(leftApexX, rightApexX, bandLeftX, bandRightX) {
    const band = Math.abs(Number(bandRightX) - Number(bandLeftX));
    const apex = Math.abs(Number(rightApexX) - Number(leftApexX));
    if (!(band > 0)) return { ratio: null, verdict: 'unknown', plausible: false, reason: 'no band width' };
    const ratio = apex / band;
    let verdict, reason;
    if (ratio < 0.4) { verdict = 'implausible'; reason = 'apex too narrow — likely the gore, not the cup apex'; }
    else if (ratio <= 0.62) { verdict = 'plausible'; reason = 'within the realistic band (~0.57 expected)'; }
    else if (ratio <= 0.68) { verdict = 'suspect'; reason = 'apex a little wide — worth a TD glance'; }
    else { verdict = 'implausible'; reason = 'apex too wide — likely a strap join, not a cup apex'; }
    return { ratio: Math.round(ratio * 1000) / 1000, verdict, plausible: verdict === 'plausible', reason };
  }

  // ---- Trim reference: an absolute ruler drawn into the sketch --------------
  // Trims are manufactured to STANDARD widths and the BOM records which width a
  // style uses, per size range. So a trim visible on a flat is a physical ruler
  // — the only offline way to get an ABSOLUTE scale with no TD measuring. The
  // engine already proves the principle in one place: 3 H&E rows -> POM 12 =
  // 3.00 in is a trim reference, and it is the highest-trust value the pipeline
  // ever produces (CONSTRUCTION-REF). This generalises it.
  //
  // Widths below are REAL rows from this project's BOM reference library
  // (Bra BOM/library/library_duplicates_review.md), not invented defaults. Note
  // they are SIZE-RANGE dependent — Size L falls in the XS-XL band.
  const TRIM_STANDARDS = {
    strap_elastic: { inches: 0.787, cm: 2.0, sizeRange: 'XS-XL', placement: 'adjustable straps', alt: [{ inches: 0.984, cm: 2.5, sizeRange: '2XL+' }] },
    underband_elastic: { inches: 0.591, cm: 1.5, sizeRange: 'XS-XL', placement: 'front & back inner UB', alt: [{ inches: 0.787, cm: 2.0, sizeRange: '2XL+' }] },
    vfold_neckline: { inches: 0.630, cm: 1.6, sizeRange: 'ALL', placement: 'neckline & armhole finish', alt: [] },
    inner_binding: { inches: 0.394, cm: 1.0, sizeRange: 'ALL', placement: 'inner side seam, under cup', alt: [] },
    swan_hook: { inches: 0.709, cm: 1.8, sizeRange: 'XS-2XL', placement: 'front strap end', alt: [{ inches: 0.906, cm: 2.3, sizeRange: '2XL+' }] },
    hook_and_eye_3row: { inches: 3.0, cm: 7.62, sizeRange: 'ALL', placement: 'centre back closure', alt: [{ inches: 3.75, cm: 9.53 }] },
  };

  // Scale implied by a trim measured in the sketch. Honest by construction: the
  // caller must say WHICH trim it measured, because a drawn band could be the
  // elastic, its binding, or a fold — and those are different widths.
  function trimScale(pixelWidth, trimKey, options) {
    options = options || {};
    const std = TRIM_STANDARDS[trimKey];
    const px = Number(pixelWidth);
    if (!std || !(px > 0)) return { scale: null, status: 'NO_TRIM_EVIDENCE', trim: trimKey || null };
    const inches = Number(options.inchesOverride) || std.inches;
    return {
      scale: inches / px,
      status: 'CANDIDATE',                       // never VALID on its own — see agreeScales
      trim: trimKey, trimInches: inches, trimCm: std.cm, sizeRange: std.sizeRange,
      placement: std.placement, pixelWidth: Math.round(px * 100) / 100,
      source: 'trim_reference',
      note: 'absolute if the trim identity is right; confirm against the BOM',
    };
  }

  // Two independent trims implying the same scale is strong evidence; one trim
  // alone is a hypothesis. Mirrors the engine's existing multi-anchor agreement
  // rule (same 12% default) so trust stays consistent across the pipeline.
  function agreeScales(candidates, options) {
    options = options || {};
    const tolerance = options.tolerance == null ? 0.12 : options.tolerance;
    const scales = (candidates || []).map(c => Number(c && c.scale)).filter(s => s > 0);
    if (scales.length < 2) return { agree: false, status: 'INSUFFICIENT_CANDIDATES', n: scales.length, scale: scales[0] || null };
    const sorted = scales.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const spread = Math.max(...sorted.map(s => Math.abs(s - median) / median));
    return {
      agree: spread <= tolerance,
      status: spread <= tolerance ? 'AGREE' : 'DISAGREE',
      scale: spread <= tolerance ? median : null,
      median, spread: Math.round(spread * 1000) / 1000, n: scales.length, tolerance,
    };
  }

  return {
    smooth, inkExtent, findPeaks,
    findHorizontalBands, interpretFrontBands, deriveCupZone,
    findVerticalRails, deriveCupApex, apexPlausibility,
    TRIM_STANDARDS, trimScale, agreeScales,
  };
});
