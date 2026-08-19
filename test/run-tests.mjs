import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
await import('./engine.js');
await import('./topology.js');
await import('./library/construction-cohorts.js');
await import('./library/measurement-priors.js');
const engine = globalThis.MeasurementTestEngine;
const topo = globalThis.MeasurementTopology;
const fixture = globalThis.CONSTRUCTION_COHORT_FIXTURE;
const priors = globalThis.MEASUREMENT_PRIOR_SNAPSHOT;

const checks = [];
function test(name, fn) {
  try { fn(); checks.push({ name, pass: true }); }
  catch (error) { checks.push({ name, pass: false, error: error.message }); }
}

test('fixture is explicitly synthetic and isolated', () => {
  assert.equal(fixture.data_kind, 'synthetic_test_data');
  assert.equal(fixture.provenance.isolation, 'test_only_never_promote');
});
test('construction cohort counts are deterministic', () => {
  const counts = Object.fromEntries(engine.cohortSummary(fixture).map(row => [row.id, row.catalog_style_count]));
  assert.deepEqual(counts, { front_zipper: 4, front_closure_placket: 3, front_hook_and_eye: 1, back_hook_and_eye: 6, none_pull_on: 4 });
});
test('front zipper cohort is eligible', () => {
  assert.equal(engine.cohortPomStats(fixture, 'front_zipper', '9').status, 'ELIGIBLE');
});
test('cohort proof names every synthetic peer and its value', () => {
  const stats=engine.cohortPomStats(fixture,'back_hook_and_eye','12');
  assert.ok(stats.peers.length>=fixture.minimum_peer_count);
  assert.ok(stats.peers.every(peer=>peer.name&&peer.data_kind==='synthetic_test_data'&&peer.value_in>0));
});
test('front hook and eye safely abstains with one peer', () => {
  assert.equal(engine.cohortPomStats(fixture, 'front_hook_and_eye', '9').status, 'INSUFFICIENT_PEERS');
});
test('insufficient construction cohort falls back to the General Library Baseline', () => {
  const path=engine.deriveCandidatePaths([{id:'front',role:'front_outer',confidence:'high',bbox:{x:0,y:0,width:400,height:500}}]).find(row=>row.pom==='9');
  const result=engine.fuseMeasurement({fixture,priors,cohortId:'front_hook_and_eye',pom:'9',path,viewScale:null,mode:'prior'});
  assert.equal(result.source,'general_library_baseline');
  assert.equal(result.decision,'LIBRARY_PRIOR');
  assert.equal(result.value_in,8);
});
test('strong zipper signals classify as front zipper', () => {
  assert.equal(engine.classifyConstruction({ centerRail: .92, parallelRails: .9, centerRepeats: .8, edgeRepeats: .1 }).construction, 'front_zipper');
});
test('weak conflicting signals classify as unknown', () => {
  assert.equal(engine.classifyConstruction({ centerRail: .48, parallelRails: .45, centerRepeats: .42, edgeRepeats: .44 }).construction, 'unknown');
});
test('generic back rails do not prove back hook and eye', () => {
  const result=engine.classifyConstruction({centerRail:.12,parallelRails:.08,centerRepeats:.05,edgeRepeats:.08,backCenterRail:.94,backParallelRails:.08,backCenterRepeats:.1});
  assert.notEqual(result.construction,'back_hook_and_eye');
  assert.equal(result.scores.back_hook_and_eye,0);
  const tags=engine.deriveConstructionTags({frontTextureScore:.53,frontCoverageScore:.85,underwireScore:.2,backHookEyeRowCount:0},result,[{role:'front_outer'},{role:'back'}]);
  assert.equal(tags.find(row=>row.id==='back_hook_and_eye').state,'not_detected');
  assert.equal(tags.find(row=>row.id==='lace_overlay').state,'not_detected');
});
test('paired center-back closure panel produces a reviewable H&E candidate without visible rows', () => {
  const result=engine.classifyConstruction({centerRail:.12,parallelRails:.08,centerRepeats:.05,edgeRepeats:.08,backCenterRail:.94,backParallelRails:.78,backCenterRepeats:.2,backHookEyeRowCount:0});
  assert.notEqual(result.construction,'back_hook_and_eye');
  assert.ok(result.backClosurePanelSupport>=.4&&result.backClosurePanelSupport<.68);
  const tag=engine.deriveConstructionTags({backHookEyeRowCount:0},result,[{role:'back'}]).find(row=>row.id==='back_hook_and_eye');
  assert.equal(tag.state,'uncertain');
  assert.ok(tag.score>0);
  assert.match(tag.evidence,/rows not visible/);
});
test('distributed lace pattern evidence is distinct from generic image detail', () => {
  const detection=engine.classifyConstruction({centerRail:.2,parallelRails:.1,centerRepeats:.1,edgeRepeats:.1});
  const generic=engine.deriveConstructionTags({frontTextureScore:.8,frontLacePatternScore:0},detection,[{role:'front_outer'}]);
  const patterned=engine.deriveConstructionTags({frontTextureScore:.8,frontLacePatternScore:.82},detection,[{role:'front_outer'}]);
  assert.equal(generic.find(row=>row.id==='lace_overlay').state,'not_detected');
  assert.equal(patterned.find(row=>row.id==='lace_overlay').state,'detected');
});
test('regular component tracks preserve a discrete H&E row count', () => {
  assert.equal(engine.detectRegularRowCount([{x:.48,y:.62},{x:.481,y:.68},{x:.479,y:.74}]),3);
  assert.equal(engine.detectRegularRowCount([{x:.48,y:.62},{x:.53,y:.64},{x:.41,y:.81}]),0);
});
test('three detected H&E rows classify construction and map POM 12 to 3 inches', () => {
  const detection=engine.classifyConstruction({centerRail:.05,parallelRails:.05,centerRepeats:.05,edgeRepeats:.05,backCenterRail:.2,backParallelRails:.1,backCenterRepeats:.1,backHookEyeRowCount:3});
  assert.equal(detection.construction,'back_hook_and_eye');
  assert.equal(detection.backHookEyeRowCount,3);
  const tags=engine.deriveConstructionTags({backHookEyeRowCount:3},detection,[{role:'back'}]);
  assert.equal(tags.find(row=>row.id==='back_hook_and_eye').state,'detected');
  const reference=engine.hookEyePom12Reference(fixture,detection.construction,3);
  assert.equal(reference.status,'SUPPORTED');
  assert.equal(reference.value_in,3);
  assert.equal(reference.matched_peer_count,3);
  assert.equal(engine.hookEyePom12Reference(fixture,detection.construction,4).status,'NO_RULE');
});
const regions = [
  { id:'view_1',role:'front_outer',confidence:'high',bbox:{ x:0,y:0,width:480,height:600 } },
  { id:'view_2',role:'back',confidence:'high',bbox:{ x:520,y:0,width:480,height:600 } }
];
const paths = engine.deriveCandidatePaths(regions);
test('candidate paths cover all 16 POMs', () => assert.equal(paths.length, 16));
test('POM 11 follows the contract and lives on the back view', () => {
  assert.equal(engine.POM_VIEW_ROLES['11'],'back');
  assert.equal(paths.find(row=>row.pom==='11').viewRole,'back');
});
test('column evidence separates front and back views', () => {
  const columns = Array(100).fill(0);
  for (let x=5;x<=42;x+=1) columns[x]=12;
  for (let x=58;x<=95;x+=1) columns[x]=10;
  const detected = engine.deriveViewRegionsFromColumns(columns,100,100);
  assert.deepEqual(detected.map(row=>row.role),['front_outer','back']);
  assert.equal(detected[0].confidence,'high');
});
test('multi-anchor inferred scale requires agreement', () => {
  const inferred = engine.inferScale(fixture, 'front_zipper', paths, 'front_outer');
  assert.ok(['VALID', 'SCALE_DISAGREEMENT'].includes(inferred.status));
  assert.equal(inferred.candidates.length, 2);
});
test('explicit calibration produces a traceable sketch value', () => {
  const p9 = paths.find(row => row.pom === '9');
  const scale = { viewRole:'front_outer',status:'VALID',scale:8.5/p9.pixelLength,source:'td_explicit_calibration' };
  const result = engine.fuseMeasurement({ fixture, priors, cohortId: 'front_zipper', pom: '9', path:p9, pixelLength: p9.pixelLength, viewScale:scale, placementConfidence: 'medium', mode: 'explicit' });
  assert.equal(result.source, 'sketch_explicit_calibration');
  assert.equal(result.value_in, 8.5);
  assert.equal(result.decision, 'SKETCH_MEASUREMENT');
  assert.equal(result.formula.pixel_length, p9.pixelLength);
  assert.ok(result.evidence.includes('construction_compatible_peers'));
});
test('disagreement is review required and never averaged', () => {
  const p9 = paths.find(row => row.pom === '9');
  const scale = { viewRole:'front_outer',status:'VALID',scale:12/p9.pixelLength,source:'td_explicit_calibration' };
  const result = engine.fuseMeasurement({ fixture, priors, cohortId: 'front_zipper', pom: '9', path:p9, pixelLength: p9.pixelLength, viewScale:scale, placementConfidence: 'high', mode: 'explicit' });
  assert.equal(result.decision, 'REVIEW_REQUIRED');
  assert.equal(result.value_in, 12);
});
test('POM 14 numeric value is cohort prior, not curve length', () => {
  const p14 = paths.find(row=>row.pom==='14');
  const result = engine.fuseMeasurement({ fixture, priors, cohortId: 'front_zipper', pom: '14', path:p14, pixelLength: 9999, placementConfidence: 'high', mode: 'explicit', explicitScale: 1 });
  assert.equal(result.source, 'construction_cohort_prior');
  assert.equal(result.value_in, 8.375);
});
test('POM 15 and 16 use their own view-local scales', () => {
  const p15=paths.find(row=>row.pom==='15'), p16=paths.find(row=>row.pom==='16');
  const scales=engine.buildExplicitViewScales(paths,[
    {viewRole:'front_outer',pom:'1',knownLength:14},
    {viewRole:'back',pom:'12',knownLength:3.75}
  ]);
  const r15=engine.fuseMeasurement({fixture,priors,cohortId:'front_zipper',pom:'15',path:p15,viewScale:scales.back,mode:'explicit'});
  const r16=engine.fuseMeasurement({fixture,priors,cohortId:'front_zipper',pom:'16',path:p16,viewScale:scales.front_outer,mode:'explicit'});
  assert.equal(r15.decision,'SKETCH_MEASUREMENT');
  assert.equal(r16.decision,'SKETCH_MEASUREMENT');
  assert.ok(r15.value_in>0&&r16.value_in>0);
  assert.notEqual(r15.formula.scale_in_per_px,r16.formula.scale_in_per_px);
});
test('3 and 3.75 inch H&E references calibrate only the back view', () => {
  const front=engine.viewScaleFromCalibration(paths,{viewRole:'front_outer',pom:'1',knownLength:14});
  for(const knownLength of [3,3.75]){
    const back=engine.viewScaleFromCalibration(paths,{viewRole:'back',pom:'12',knownLength});
    assert.equal(back.status,'VALID');
    assert.equal(back.viewRole,'back');
    assert.equal(back.knownLength,knownLength);
    assert.equal(front.viewRole,'front_outer');
    assert.equal(front.knownLength,14);
    assert.notEqual(back.scale,front.scale);
  }
});
test('auto-scale resolver: construction reference (H&E rows) seeds the back view', () => {
  const ref = engine.hookEyePom12Reference(fixture, 'back_hook_and_eye', 3);
  const scales = engine.resolveViewScales({ fixture, cohortId:'back_hook_and_eye', paths, hookEyeReference:ref, calibrations:[] });
  const p12 = paths.find(row => row.pom === '12');
  assert.equal(scales.back.precedence, 'construction_reference');
  assert.equal(scales.back.source, 'opencv_hook_eye_rows_reference');
  assert.equal(scales.back.status, 'VALID');
  assert.equal(scales.back.rank, 3);
  assert.ok(Math.abs(scales.back.scale - 3 / p12.pixelLength) < 1e-9);
});
test('auto-scale resolver: TD calibration outranks the construction reference', () => {
  const ref = engine.hookEyePom12Reference(fixture, 'back_hook_and_eye', 3);
  const scales = engine.resolveViewScales({ fixture, cohortId:'back_hook_and_eye', paths, hookEyeReference:ref, calibrations:[{ viewRole:'back', pom:'12', knownLength:3.75 }] });
  const p12 = paths.find(row => row.pom === '12');
  assert.equal(scales.back.precedence, 'td_explicit_calibration');
  assert.equal(scales.back.rank, 4);
  assert.ok(Math.abs(scales.back.scale - 3.75 / p12.pixelLength) < 1e-9);
});
test('auto-scale resolver: library POM 12 hypothesis is the back fallback with no rows/calibration', () => {
  const ref = engine.hookEyePom12Reference(fixture, 'back_hook_and_eye', 4); // NO_RULE (not exactly 3 rows)
  const scales = engine.resolveViewScales({ fixture, cohortId:'back_hook_and_eye', paths, hookEyeReference:ref, calibrations:[] });
  assert.equal(scales.back.precedence, 'library_prior_hypothesis');
  assert.equal(scales.back.source, 'library_hook_eye_hypothesis');
  assert.equal(scales.back.confidence, 'low');
});
test('auto-scale resolver is view-local: front never borrows the back calibration', () => {
  const ref = engine.hookEyePom12Reference(fixture, 'back_hook_and_eye', 3);
  const scales = engine.resolveViewScales({ fixture, cohortId:'back_hook_and_eye', paths, hookEyeReference:ref, calibrations:[{ viewRole:'back', pom:'12', knownLength:3.75 }] });
  assert.equal(scales.front_outer.viewRole, 'front_outer');
  assert.equal(scales.back.viewRole, 'back');
  assert.notEqual(scales.front_outer.source, 'td_explicit_calibration');
  if (scales.front_outer.status === 'VALID') assert.notEqual(scales.front_outer.scale, scales.back.scale);
});
test('auto-scale resolver: front uses multi-anchor inference when POM 1/5 agree', () => {
  const inf = engine.inferScale(fixture, 'front_zipper', paths, 'front_outer');
  const scales = engine.resolveViewScales({ fixture, cohortId:'front_zipper', paths, hookEyeReference:{ status:'NO_RULE' }, calibrations:[] });
  if (inf.status === 'VALID') {
    assert.equal(scales.front_outer.precedence, 'multi_anchor_inferred');
    assert.equal(scales.front_outer.source, 'library_multi_anchor_inference');
    assert.ok(Math.abs(scales.front_outer.scale - inf.scale) < 1e-9);
  } else {
    assert.equal(scales.front_outer.precedence, 'none');
  }
});
test('fusion: weak sketch shrinks to the library (k→0), strong sketch keeps it (k→1)', () => {
  const weak = engine.fusePomValue({ sketchValue:10, prior:8, priorSpreadFrac:0.08, sketchSigmaFrac:0.8, styleOffset:0 });
  assert.ok(weak.k < 0.05, `weak k ${weak.k}`);
  assert.ok(Math.abs(weak.fused - 8) < 0.1, `weak fused ${weak.fused} ~ prior 8`);
  const strong = engine.fusePomValue({ sketchValue:10, prior:8, priorSpreadFrac:0.8, sketchSigmaFrac:0.02, styleOffset:0 });
  assert.ok(strong.k > 0.95, `strong k ${strong.k}`);
  assert.ok(Math.abs(strong.fused - 10) < 0.1, `strong fused ${strong.fused} ~ sketch 10`);
  // fused is always bracketed by the style-adjusted prior and the sketch (never an extrapolation)
  assert.ok(weak.fused >= 8 - 1e-9 && weak.fused <= 10 + 1e-9);
});
test('fusion: a coherent style offset is preserved, not shrunk to the mean', () => {
  const off = engine.computeStyleOffset([
    { pom:'5', sketch:5.775, prior:5.5 }, { pom:'9', sketch:8.4, prior:8 }, { pom:'10', sketch:8.4, prior:8 },
  ]); // every POM +5%
  assert.ok(Math.abs(off.offset - 0.05) < 0.005, `offset ${off.offset}`);
  assert.ok(off.dispersion < 0.005, `dispersion ${off.dispersion}`);
  // even with a very noisy sketch (k→0), the +5% style trend survives (not dragged to prior)
  const f = engine.fusePomValue({ sketchValue:8.4, prior:8, priorSpreadFrac:0.08, sketchSigmaFrac:0.8, styleOffset:off.offset });
  assert.ok(f.fused > 8.3, `fused ${f.fused} kept the +5% style offset`);
});
test('fusion: fewer than two POMs yields no style offset', () => {
  assert.equal(engine.computeStyleOffset([{ pom:'5', sketch:5.775, prior:5.5 }]).offset, 0);
});
test('fusion: residual + dispersion classify conflict correctly', () => {
  assert.equal(engine.diagnoseFusion({ residual:0.02, dispersion:0.03 }), 'coherent');
  assert.equal(engine.diagnoseFusion({ residual:0.30, dispersion:0.03 }), 'anchor_outlier');
  assert.equal(engine.diagnoseFusion({ residual:0.02, dispersion:0.30 }), 'scale_suspect');
});
test('fuseWithLibrary: coherent view keeps every POM near its sketch value', () => {
  const rows = ['5','9','10'].map((pom, i) => ({
    pom, viewRole:'front_outer', value_in:[5.775, 8.4, 8.4][i], library_prior_in:[5.5, 8, 8][i],
    result_kind:'ESTIMATED_SUGGESTION', decision:'ESTIMATED_SUGGESTION', confidence:'medium',
    scale_evidence:{ source:'library_multi_anchor_inference' }, cohort:{ values:[[5.4,5.5,5.6],[7.8,8,8.2],[7.9,8,8.1]][i] }, anchorStatus:'HYPOTHESIS',
  }));
  const summary = engine.fuseWithLibrary(rows, {});
  assert.ok(Math.abs(summary.viewFusion.front_outer.offset - 0.05) < 0.01);
  for (const r of rows) {
    assert.equal(r.fusion.diagnosis, 'coherent');
    assert.ok(r.pre_fusion_value_in != null);
    assert.ok(Math.abs(r.value_in - r.pre_fusion_value_in) < 0.05, `POM ${r.pom} kept its coherent value`);
  }
});
test('fuseWithLibrary: a lone outlier POM is flagged and sent to REVIEW', () => {
  const rows = [
    { pom:'5', viewRole:'front_outer', value_in:5.5, library_prior_in:5.5, result_kind:'ESTIMATED_SUGGESTION', decision:'ESTIMATED_SUGGESTION', confidence:'medium', scale_evidence:{ source:'library_multi_anchor_inference' }, cohort:{ values:[5.4,5.5,5.6] }, anchorStatus:'HYPOTHESIS' },
    { pom:'9', viewRole:'front_outer', value_in:8, library_prior_in:8, result_kind:'ESTIMATED_SUGGESTION', decision:'ESTIMATED_SUGGESTION', confidence:'medium', scale_evidence:{ source:'library_multi_anchor_inference' }, cohort:{ values:[7.8,8,8.2] }, anchorStatus:'HYPOTHESIS' },
    { pom:'10', viewRole:'front_outer', value_in:12, library_prior_in:8, result_kind:'SKETCH_MEASUREMENT', decision:'SKETCH_MEASUREMENT', confidence:'high', scale_evidence:{ source:'td_explicit_calibration' }, cohort:{ values:[7.9,8,8.1] }, anchorStatus:'ink_confirmed' },
  ];
  engine.fuseWithLibrary(rows, {});
  const p10 = rows.find(r => r.pom === '10');
  assert.equal(p10.fusion.diagnosis, 'anchor_outlier');
  assert.equal(p10.decision, 'REVIEW_REQUIRED');
  assert.equal(p10.result_kind, 'ESTIMATED_SUGGESTION');
});
test('pathsFromDetectedAnchors maps real production anchors to POM paths', () => {
  const anchors = {
    'band-left':  { x:0.1, y:0.8, viewRole:'front_outer', confidence:'high',   source:'ink',        reviewRequired:false },
    'band-right': { x:0.5, y:0.8, viewRole:'front_outer', confidence:'high',   source:'ink',        reviewRequired:false },
    'cf-top':     { x:0.3, y:0.4, viewRole:'front_outer', confidence:'medium', source:'ink',        reviewRequired:true },
    'cf-bottom':  { x:0.3, y:0.8, viewRole:'front_outer', confidence:'high',   source:'silhouette', reviewRequired:false },
  };
  const paths = engine.pathsFromDetectedAnchors(anchors, { width:1000, height:500 });
  const p1 = paths.find(p => p.pom === '1');
  assert.equal(p1.anchorSource, 'production_detected_ink');   // both ink, no review -> confirmed
  assert.equal(p1.anchorStatus, 'ink_detected');
  assert.equal(p1.confidence, 'high');
  assert.deepEqual(p1.start, { x:100, y:400 });
  assert.deepEqual(p1.end, { x:500, y:400 });
  assert.equal(p1.pixelLength, 400);
  const p5 = paths.find(p => p.pom === '5');                  // cf-top is reviewRequired -> not confirmed
  assert.equal(p5.anchorSource, 'production_detected_review');
  assert.equal(p5.confidence, 'medium');                      // min(medium, high)
  const p3 = paths.find(p => p.pom === '3');                  // chest-left/right absent
  assert.equal(p3.anchorStatus, 'NO_ANCHOR_EVIDENCE');
  assert.equal(p3.start, null);
});
test('pathsFromDetectedAnchors attaches a viewId so the proof does not read "view missing"', () => {
  const anchors = {
    'cf-top':    { x:0.2, y:0.4, viewRole:'front_outer', confidence:'high', source:'ink', reviewRequired:false },
    'cf-bottom': { x:0.2, y:0.8, viewRole:'front_outer', confidence:'high', source:'ink', reviewRequired:false },
    'back-top':    { x:0.8, y:0.5, viewRole:'back', confidence:'high', source:'ink', reviewRequired:false },
    'back-bottom': { x:0.8, y:0.9, viewRole:'back', confidence:'high', source:'ink', reviewRequired:false },
  };
  // No explicit regions: a view box must still be derived from the anchors themselves.
  const derived = engine.pathsFromDetectedAnchors(anchors, { width:1000, height:500 });
  const p5 = derived.find(p => p.pom === '5');
  assert.ok(p5.viewId, 'POM 5 has a viewId');
  assert.ok(p5.viewBox && p5.viewBox.height > 0, 'derived view box has extent');
  assert.equal(derived.find(p => p.pom === '12').viewId, 'anchors_back', 'back POM uses the back view');
  // Explicit detected regions take precedence over the derived box.
  const withRegions = engine.pathsFromDetectedAnchors(anchors, {
    width:1000, height:500,
    viewRegions:[{ id:'view_1', role:'front_outer', confidence:'high', bbox:{ x:0, y:0, width:480, height:500 } }],
  });
  assert.equal(withRegions.find(p => p.pom === '5').viewId, 'view_1', 'real detected region wins');
});
test('detected ink anchors clear the landmark-strong gate that ratio hypotheses cannot', () => {
  const anchors = {
    'cf-top':    { x:0.3, y:0.4, viewRole:'front_outer', confidence:'high', source:'ink', reviewRequired:false },
    'cf-bottom': { x:0.3, y:0.8, viewRole:'front_outer', confidence:'high', source:'ink', reviewRequired:false },
  };
  const p5 = engine.pathsFromDetectedAnchors(anchors, { width:1000, height:500 }).find(p => p.pom === '5');
  assert.ok(p5.anchorSource.includes('ink'));   // measurementEvidenceOutcome landmarkStrong keys on this
  const ratioP5 = engine.deriveCandidatePaths(regions).find(p => p.pom === '5');
  assert.equal(ratioP5.anchorSource, 'view_ratio_anchor_hypothesis');
  assert.ok(!ratioP5.anchorSource.includes('ink'));
});
// ---- topology layer (structure from line art) ----------------------------
// Synthetic front-view profile shaped like a real flat: empty margins, a strap
// zone, a gore-top line, a cup zone, a cradle seam, a band top and a hem.
function syntheticFrontRowInk() {
  const rows = new Array(280).fill(0);
  for (let y = 55; y <= 230; y++) rows[y] = 25;      // the drawing's extent
  for (let y = 60; y <= 90; y++) rows[y] = 35;       // strap / neckline zone
  rows[144] = 57; rows[143] = 46;                    // gore top (cf-top)
  rows[206] = 94; rows[207] = 82;                    // cradle seam
  rows[218] = 124;                                   // band top
  rows[230] = 192;                                   // hem / zigzag
  return rows;
}
test('topology: horizontal bands name hem, band top, cradle seam and gore top', () => {
  const named = topo.interpretFrontBands(syntheticFrontRowInk());
  assert.equal(named.hemY, 230, 'hem is the strongest band low in the drawing');
  assert.equal(named.bandTopY, 218, 'band top sits just above the hem');
  assert.ok(named.cradleSeamY >= 205 && named.cradleSeamY <= 208, `cradle seam ~206 (got ${named.cradleSeamY})`);
  assert.ok(named.goreTopY >= 140 && named.goreTopY <= 146, `gore top ~144 (got ${named.goreTopY})`);
});
test('topology: cradle seam is found with NO wire arc present (fixes POM 6/7/8)', () => {
  // Same profile with every trace of an underwire arc removed — only seams remain.
  const named = topo.interpretFrontBands(syntheticFrontRowInk());
  assert.ok(named.cradleSeamY != null, 'a wireless style still yields a cradle seam');
  const zone = topo.deriveCupZone(named);
  assert.ok(zone && zone.height > 0, 'cup zone derived from gore top -> cradle seam');
  assert.ok(zone.top < zone.bottom);
});
test('topology: cup apex comes from rails at ~1/4 and ~3/4, never the strap join', () => {
  // Cup-zone column profile: two side edges + a centre-front rail.
  const width = 218;
  const col = new Array(width).fill(0);
  for (let x = 20; x <= 200; x++) col[x] = 8;         // cup zone ink
  col[20] = 40; col[200] = 40;                        // side edges
  col[110] = 60;                                      // centre front rail
  const apex = topo.deriveCupApex(col);
  assert.ok(apex, 'apex derived');
  assert.equal(apex.centreFromRail, true, 'centre came from a real rail');
  assert.ok(Math.abs(apex.leftApexX - 65) <= 4, `left apex ~65 (got ${apex.leftApexX})`);
  assert.ok(Math.abs(apex.rightApexX - 155) <= 4, `right apex ~155 (got ${apex.rightApexX})`);
  // The realistic ratio check: ~50% of the band, not the 78% strap-join failure.
  const p = topo.apexPlausibility(apex.leftApexX, apex.rightApexX, 20, 200);
  assert.ok(p.plausible, `ratio ${p.ratio} should be plausible`);
  assert.ok(p.ratio >= 0.45 && p.ratio <= 0.55, `ratio ~0.5 (got ${p.ratio})`);
});
test('topology: plausibility rejects the strap-join failure and the gore', () => {
  const strap = topo.apexPlausibility(0.082, 0.254, 0.058, 0.279);   // the real EvelynBliss failure
  assert.equal(strap.verdict, 'implausible');
  assert.ok(/strap join/.test(strap.reason), strap.reason);
  const gore = topo.apexPlausibility(95, 120, 20, 200);
  assert.equal(gore.verdict, 'implausible');
  assert.ok(/gore/.test(gore.reason), gore.reason);
});
test('topology: plausibility is graded, so a marginal style is not cried wolf over', () => {
  // Calibrated on a size-L apex ~8in against a ~14in half-band => ~0.57.
  assert.equal(topo.apexPlausibility(0, 57, 0, 100).verdict, 'plausible');    // 0.57 — the expected value
  assert.equal(topo.apexPlausibility(0, 64, 0, 100).verdict, 'suspect');      // 0.64 — a bit wide
  assert.equal(topo.apexPlausibility(0, 78, 0, 100).verdict, 'implausible');  // 0.78 — the real failure
  assert.equal(topo.apexPlausibility(0, 30, 0, 100).verdict, 'implausible');  // 0.30 — reads as the gore
  // ordering: the grades must be monotonic in the ratio
  const ratios = [0.45, 0.57, 0.64, 0.78].map(r => topo.apexPlausibility(0, r * 100, 0, 100).verdict);
  assert.deepEqual(ratios, ['plausible', 'plausible', 'suspect', 'implausible']);
});
test('topology: thresholds are scale-relative (2x profile gives 2x geometry)', () => {
  const base = syntheticFrontRowInk();
  const scaled = new Array(560).fill(0);
  for (let y = 0; y < base.length; y++) { scaled[y * 2] = base[y]; scaled[y * 2 + 1] = base[y]; }
  const named = topo.interpretFrontBands(scaled);
  assert.ok(Math.abs(named.hemY - 460) <= 3, `hem scales to ~460 (got ${named.hemY})`);
  assert.ok(Math.abs(named.cradleSeamY - 412) <= 6, `cradle scales to ~412 (got ${named.cradleSeamY})`);
});
test('trim: a measured trim width implies an absolute scale candidate', () => {
  // A 2cm strap elastic (0.787in, XS-XL per the BOM) drawn 20px wide.
  const s = topo.trimScale(20, 'strap_elastic');
  assert.equal(s.status, 'CANDIDATE', 'never VALID alone — one trim is a hypothesis');
  assert.ok(Math.abs(s.scale - 0.787 / 20) < 1e-9);
  assert.equal(s.trimCm, 2);
  assert.equal(s.sizeRange, 'XS-XL', 'Size L falls in the XS-XL band');
  assert.equal(s.source, 'trim_reference');
  assert.equal(topo.trimScale(0, 'strap_elastic').status, 'NO_TRIM_EVIDENCE');
  assert.equal(topo.trimScale(20, 'not_a_trim').status, 'NO_TRIM_EVIDENCE');
});
test('trim: the H&E rule is the same mechanism (3 rows -> 3.00 in)', () => {
  const he = topo.TRIM_STANDARDS.hook_and_eye_3row;
  assert.equal(he.inches, 3.0, 'matches engine.hookEyePom12Reference');
  assert.ok(he.alt.some(a => a.inches === 3.75), '3.75in is the documented alternative');
});
test('trim: two agreeing trims give a scale, one alone does not', () => {
  const strap = topo.trimScale(20, 'strap_elastic');       // 0.03935 in/px
  const band = topo.trimScale(15, 'underband_elastic');    // 0.0394  in/px
  const agree = topo.agreeScales([strap, band]);
  assert.equal(agree.status, 'AGREE');
  assert.ok(agree.scale > 0 && agree.spread < 0.02, `spread ${agree.spread}`);
  assert.equal(topo.agreeScales([strap]).status, 'INSUFFICIENT_CANDIDATES', 'a single trim is not enough');
});
test('trim: disagreeing trims refuse to produce a scale', () => {
  const a = topo.trimScale(20, 'strap_elastic');           // 0.0394
  const b = topo.trimScale(30, 'underband_elastic');       // 0.0197 — half
  const out = topo.agreeScales([a, b]);
  assert.equal(out.status, 'DISAGREE');
  assert.equal(out.scale, null, 'no scale is emitted when trims contradict');
  assert.ok(out.spread > 0.12);
});
test('learning: a robust per-POM offset is learned from TD corrections', () => {
  const learned = engine.learnCorrections([
    { pom:'9', suggested:8.0, corrected:8.5 }, { pom:'9', suggested:8.1, corrected:8.6 }, { pom:'9', suggested:7.9, corrected:8.4 },
    { pom:'5', suggested:5.5, corrected:5.25 },
  ]);
  assert.equal(learned['9'].n, 3);
  assert.ok(Math.abs(learned['9'].offset - 0.5) < 1e-6, 'POM 9 learns +0.5');
  assert.ok(Math.abs(learned['5'].offset + 0.25) < 1e-6, 'POM 5 learns -0.25');
});
test('learning: correction is gated by minSamples and n-weighted', () => {
  const few = engine.learnCorrections([{ pom:'9', suggested:8, corrected:8.5 }, { pom:'9', suggested:8, corrected:8.5 }]);
  assert.equal(engine.applyLearnedCorrection('9', 8.0, few).applied, false, '2 samples < minSamples(3): not applied');
  const many = engine.learnCorrections(Array.from({ length:12 }, () => ({ pom:'9', suggested:8, corrected:8.5 })));
  const a = engine.applyLearnedCorrection('9', 8.0, many);
  assert.equal(a.applied, true);
  assert.ok(a.weight > 0.7, '12 samples -> strong weight');
  assert.ok(a.value > 8.0 && a.value <= 8.5, 'nudged toward the corrected value, not past it');
});
test('learning: applying the learned offset reduces held-out error', () => {
  // Systematic bias: the suggester reads ~0.6 in low on POM 10 every time.
  const train = Array.from({ length:8 }, (_, i) => ({ pom:'10', suggested:8.0 + i * 0.02, corrected:8.6 + i * 0.02 }));
  const learned = engine.learnCorrections(train);
  const heldTrue = 8.65, heldSuggested = 8.05;
  const before = Math.abs(heldSuggested - heldTrue);
  const after = Math.abs(engine.applyLearnedCorrection('10', heldSuggested, learned).value - heldTrue);
  assert.ok(after < before, `learning reduces error (${after} < ${before})`);
});
test('retrieval: nearest style is the one matching the sketch features', () => {
  const styles = [
    { id: 'A', features: { cradle_closure_location:'back_hook_eye', cup_coverage_silhouette:'full_cup', back_coverage_tier:'low' }, measurements: { cup_width: 7.5 } },
    { id: 'B', features: { cradle_closure_location:'back_hook_eye', cup_coverage_silhouette:'full_cup', back_coverage_tier:'mid' }, measurements: { cup_width: 8.5 } },
    { id: 'C', features: { cradle_closure_location:'front_close', cup_coverage_silhouette:'soft_cup', back_coverage_tier:'low' }, measurements: { cup_width: 6.5 } },
  ];
  const sketch = { cradle_closure_location:'back_hook_eye', cup_coverage_silhouette:'full_cup', back_coverage_tier:'mid' };
  const r = engine.retrieveSimilarStyle(sketch, styles);
  assert.equal(r.nearest.id, 'B', 'B matches all three supplied features');
  assert.equal(r.nearest.score, 1);
  assert.ok(r.ranked[1].id === 'A' && r.ranked[1].score < 1, 'A is next (closure+cup match, back differs)');
  assert.ok(r.ranked[2].id === 'C', 'C (front close, soft cup) ranks last');
});
test('retrieval: only features the sketch supplies are scored', () => {
  const styles = [{ id: 'A', features: { cradle_closure_location:'back_hook_eye', cup_molded:'true' }, measurements: {} }];
  const r = engine.retrieveSimilarStyle({ cradle_closure_location:'back_hook_eye', cup_molded:'unknown' }, styles);
  assert.deepEqual(r.assessedFeatures, ['cradle_closure_location'], 'unknown feature is not assessed');
  assert.equal(r.nearest.score, 1);
});
test('corroboration: cup box + cradle arc give strong structure support', () => {
  const anchors = {
    'inner-cup-left':  { x:0.20, y:0.50 }, 'inner-cup-right': { x:0.34, y:0.50 },
    'inner-cup-top':   { x:0.27, y:0.35 }, 'inner-cup-bottom':{ x:0.27, y:0.62 },
    'cradle-cf-top':   { x:0.19, y:0.60 }, 'cradle-cup-bottom':{ x:0.28, y:0.72 },
    'apex-left':       { x:0.10, y:0.30 }, 'apex-right':      { x:0.28, y:0.30 },
  };
  const c = engine.corroborateConstruction(anchors, { width:900, height:900 }, { construction:'none_pull_on', score:0.6 });
  assert.ok(c.axes.structured_cup.anchorSupport >= 0.6, 'cup box support strong');
  assert.ok(c.axes.underwire_cradle.anchorSupport >= 0.6, 'cradle arc support strong');
  assert.equal(c.axes.apex_symmetry.anchorSupport, 1, 'level apex pair fully symmetric');
});
test('corroboration: a front closure is explicitly not assessable by anchors', () => {
  const c = engine.corroborateConstruction({}, { width:900, height:900 }, { construction:'front_zipper', score:0.7 });
  assert.equal(c.verdict, 'not_assessable');
  assert.equal(c.adjustedScore, 0.7, 'confidence is left untouched when anchors cannot judge');
  assert.equal(c.axes.front_closure.assessable, false);
});
test('corroboration: back-centre column corroborates back H&E but cannot count rows', () => {
  const anchors = { 'back-top': { x:0.78, y:0.62 }, 'back-bottom': { x:0.78, y:0.80 } };
  const c = engine.corroborateConstruction(anchors, { width:900, height:900 }, { construction:'back_hook_and_eye', score:0.9 });
  assert.equal(c.axisJudged, 'back_closure');
  assert.ok(c.anchorSupport > 0, 'a present centred column gives some support');
  assert.ok(/rows/i.test(c.note), 'note flags that rows are not counted');
});
test('corroboration: a strong closure column challenges a pull-on call', () => {
  const anchors = { 'back-top': { x:0.78, y:0.62 }, 'back-bottom': { x:0.78, y:0.80 } };
  const c = engine.corroborateConstruction(anchors, { width:900, height:900 }, { construction:'none_pull_on', score:0.6 });
  assert.equal(c.axisJudged, 'back_closure');
  assert.ok(['contradicted', 'weak', 'corroborated'].includes(c.verdict));
  assert.ok(c.adjustedScore != null && c.adjustedScore !== c.opencvScore || c.verdict === 'corroborated', 'pull-on confidence is nudged by closure evidence');
});
test('front scale is never borrowed for POM 15; library fallback remains visible', () => {
  const p15=paths.find(row=>row.pom==='15');
  const result=engine.fuseMeasurement({fixture,priors,cohortId:'front_zipper',pom:'15',path:p15,viewScale:null,mode:'explicit'});
  assert.equal(result.decision,'LIBRARY_PRIOR');
  assert.equal(result.source,'construction_cohort_prior');
  assert.ok(result.value_in>0);
});
test('complete low-confidence evidence keeps value for TD review', () => {
  const path=Object.assign({},paths.find(row=>row.pom==='16'),{confidence:'low'});
  const scale={viewRole:'front_outer',status:'VALID',scale:.05,source:'td_explicit_calibration'};
  const result=engine.fuseMeasurement({fixture,priors,cohortId:'front_zipper',pom:'16',path,viewScale:scale,placementConfidence:'low',mode:'explicit'});
  assert.equal(result.decision,'REVIEW_REQUIRED');
  assert.ok(result.value_in>0);
});
test('workbench Auto requires confirmed landmarks and approved peers', () => {
  const path=Object.assign({},paths.find(row=>row.pom==='1'),{anchorStatus:'CONFIRMED',anchorSource:'ink_detected'});
  const measurement={pom:'1',value_in:14,decision:'SKETCH_MEASUREMENT'};
  const cohortGate={status:'ELIGIBLE',minimum:3,approved_production_peer_count:3};
  const constructionDetection={confidence:'high'};
  const explicit={status:'VALID',scale:.05,source:'td_explicit_calibration'};
  const outcome=engine.measurementEvidenceOutcome({measurement,path,scale:explicit,cohortGate,constructionDetection,effectiveConstruction:'front_zipper'});
  assert.equal(outcome.status,'AUTO');
  assert.ok(outcome.score>=85);
});
test('synthetic peers can support Review but never Auto', () => {
  const path=Object.assign({},paths.find(row=>row.pom==='1'),{anchorStatus:'CONFIRMED',anchorSource:'ink_detected'});
  const measurement={pom:'1',value_in:14,decision:'SKETCH_MEASUREMENT',cohort:{status:'ELIGIBLE',count:4}};
  const outcome=engine.measurementEvidenceOutcome({
    measurement,path,scale:{status:'VALID',scale:.05,source:'td_explicit_calibration'},
    cohortGate:{status:'ELIGIBLE',minimum:3,synthetic_measurement_peer_count:4,approved_production_peer_count:0},
    constructionDetection:{confidence:'high'},effectiveConstruction:'front_zipper'
  });
  assert.equal(outcome.status,'REVIEW');
  assert.equal(outcome.approvedLibraryPass,false);
  assert.ok(outcome.score>outcome.measurementConfidence);
  assert.ok(outcome.measurementConfidence<=84);
  assert.equal(outcome.layers.find(layer=>layer.id==='library').status,'WEAK');
});
test('candidate geometry caps numeric confidence below 80', () => {
  const path=paths.find(row=>row.pom==='1');
  const outcome=engine.measurementEvidenceOutcome({
    measurement:{pom:'1',value_in:14,decision:'SKETCH_MEASUREMENT'},path,
    scale:{status:'VALID',scale:.05,source:'td_explicit_calibration'},
    cohortGate:{status:'ELIGIBLE',minimum:3,approved_production_peer_count:3},
    constructionDetection:{confidence:'high'},effectiveConstruction:'front_zipper'
  });
  assert.equal(outcome.status,'REVIEW');
  assert.equal(outcome.landmarkStrong,false);
  assert.ok(outcome.measurementConfidence<=79);
});
test('no numeric measurement has no measurement confidence', () => {
  const path=paths.find(row=>row.pom==='1');
  const outcome=engine.measurementEvidenceOutcome({
    measurement:{pom:'1',value_in:null,decision:'NO_DATA'},path,
    scale:{status:'VALID',scale:.05,source:'td_explicit_calibration'},
    cohortGate:{status:'ELIGIBLE',minimum:3,approved_production_peer_count:3},
    constructionDetection:{confidence:'high'},effectiveConstruction:'front_zipper'
  });
  assert.equal(outcome.status,'INSUFFICIENT');
  assert.equal(outcome.measurementConfidence,null);
  assert.equal(outcome.displayValueIn,null);
  assert.equal(outcome.layers.length,5);
});
test('library prior without pixel scale remains a visible Review proposal', () => {
  const path=paths.find(row=>row.pom==='15');
  const cohort=engine.cohortPomStats(fixture,'back_hook_and_eye','15');
  const measurement={pom:'15',value_in:cohort.median,source:'construction_cohort_prior',decision:'LIBRARY_PRIOR',cohort};
  const outcome=engine.measurementEvidenceOutcome({measurement,path,scale:null,cohortGate:{status:'ELIGIBLE',minimum:3,synthetic_measurement_peer_count:6,approved_production_peer_count:0},constructionDetection:{confidence:'high'},effectiveConstruction:'back_hook_and_eye'});
  assert.equal(outcome.status,'REVIEW');
  assert.equal(outcome.scaleRequired,false);
  assert.equal(outcome.displayValueIn,cohort.median);
  assert.equal(outcome.layers.find(layer=>layer.id==='scale').status,'NOT_APPLICABLE');
});
test('general library prior remains visible while construction abstains', () => {
  const path=paths.find(row=>row.pom==='1');
  const measurement={pom:'1',value_in:14,source:'general_library_baseline',decision:'LIBRARY_PRIOR',library_prior_count:225};
  const outcome=engine.measurementEvidenceOutcome({measurement,path,scale:null,cohortGate:{status:'NO_COHORT',minimum:3},constructionDetection:{confidence:'low'},effectiveConstruction:'unknown'});
  assert.equal(outcome.status,'REVIEW');
  assert.equal(outcome.generalLibraryBaseline,true);
  assert.equal(outcome.displayValueIn,14);
  assert.ok(outcome.measurementConfidence<=50);
  assert.match(outcome.layers.find(layer=>layer.id==='library').detail,/225 general library records/);
});
test('three-row POM 12 reference is Review and names matching peers', () => {
  const path=paths.find(row=>row.pom==='12');
  const cohort=engine.cohortPomStats(fixture,'back_hook_and_eye','12');
  const reference=engine.hookEyePom12Reference(fixture,'back_hook_and_eye',3);
  const measurement={pom:'12',value_in:3,source:'opencv_hook_eye_row_rule',decision:'ESTIMATED_SUGGESTION',cohort,construction_reference:reference};
  const outcome=engine.measurementEvidenceOutcome({measurement,path,scale:null,cohortGate:{status:'ELIGIBLE',minimum:3,synthetic_measurement_peer_count:6,approved_production_peer_count:0},constructionDetection:{confidence:'high'},effectiveConstruction:'back_hook_and_eye'});
  assert.equal(outcome.status,'REVIEW');
  assert.equal(outcome.constructionReference,true);
  assert.equal(outcome.displayValueIn,3);
  assert.match(outcome.layers.find(layer=>layer.id==='library').detail,/3 synthetic peers match/);
});
test('inferred scale remains Review and missing scale is Insufficient', () => {
  const path=paths.find(row=>row.pom==='1');
  const args={measurement:{pom:'1',value_in:14,decision:'ESTIMATED_SUGGESTION'},path,cohortGate:{status:'ELIGIBLE'},constructionDetection:{confidence:'high'},effectiveConstruction:'front_zipper'};
  const review=engine.measurementEvidenceOutcome({...args,scale:{status:'VALID',scale:.05,source:'library_multi_anchor_inference'}});
  const insufficient=engine.measurementEvidenceOutcome({...args,scale:null});
  assert.equal(review.status,'REVIEW');
  assert.equal(insufficient.status,'INSUFFICIENT');
  assert.equal(insufficient.displayValueIn,null);
});
test('Evidence Health is derived from active views, paths, scales, and peers', () => {
  const health=engine.calculateEvidenceHealth({
    views:regions,paths,
    scales:{front_outer:{status:'VALID',scale:.04,source:'td_explicit_calibration'},back:{status:'VALID',scale:.05,source:'td_explicit_calibration'}},
    cohortGate:{status:'ELIGIBLE',synthetic_measurement_peer_count:4,approved_production_peer_count:0},
    constructionDetection:{score:.91},minimumPeerCount:3
  });
  assert.equal(health.viewDetection,94);
  assert.equal(health.absoluteScale,96);
  assert.equal(health.librarySupport,80);
});
test('synthetic workbench keeps every usable explicit row in Review', () => {
  const scales=engine.buildExplicitViewScales(paths,[
    {viewRole:'front_outer',pom:'1',knownLength:14},
    {viewRole:'back',pom:'12',knownLength:3.75}
  ]);
  const cohortGate={status:'ELIGIBLE',minimum:3,synthetic_measurement_peer_count:4,approved_production_peer_count:0};
  const constructionDetection={confidence:'high'};
  const statuses=paths.map(path=>{
    const measurement=engine.fuseMeasurement({fixture,priors,cohortId:'front_zipper',pom:path.pom,path,viewScale:scales[path.viewRole]||null,mode:'explicit',placementConfidence:path.confidence});
    return engine.measurementEvidenceOutcome({measurement,path,scale:scales[path.viewRole]||null,cohortGate,constructionDetection,effectiveConstruction:'front_zipper'}).status;
  });
  assert.equal(statuses.length,16);
  assert.equal(statuses.filter(status=>status==='AUTO').length,0);
  assert.equal(statuses.filter(status=>status==='REVIEW').length,16);
  assert.equal(statuses.filter(status=>status==='INSUFFICIENT').length,0);
});
test('Size L override accepts fractions and mixed fractions', () => {
  assert.equal(engine.fractionToNumber('1/2'),.5);
  assert.equal(engine.fractionToNumber('8 1/2'),8.5);
  assert.equal(engine.fractionToNumber('8-3/4'),8.75);
  assert.equal(engine.fractionToNumber('1/0'),null);
});
const finalMeasurements=paths.map((path,index)=>({
  pom:path.pom,name:path.name,value_in:index<2?8+index:null,
  source:index<2?'sketch_explicit_calibration':'none',
  confidence:index===0?'high':(index===1?'medium':'very_low'),
  decision:index<2?'SKETCH_MEASUREMENT':'NO_DATA',
  result_kind:index<2?'SKETCH_MEASUREMENT':'NO_DATA',
  evidence_trace:[{stage:'test',status:'observed',detail:'fixture'}],
  layer_proof:[{id:'decision',label:'Trust Decision',status:index<2?'WEAK':'MISSING',detail:index<2?'REVIEW':'INSUFFICIENT'}]
}));
test('bulk accept resolves only high-confidence sketch measurements', () => {
  const rows=engine.acceptHighConfidence(engine.createFinalizationRows(finalMeasurements,7));
  assert.equal(rows[0].status,'RESOLVED');
  assert.equal(rows[0].tdAction,'accept_suggestion');
  assert.equal(rows[1].status,'UNRESOLVED');
});
test('missing suggestions can be safely marked No Data in bulk', () => {
  const rows=engine.markMissingNoData(engine.createFinalizationRows(finalMeasurements,7));
  assert.equal(rows[2].status,'RESOLVED');
  assert.equal(rows[2].tdAction,'no_data');
  assert.equal(rows[0].status,'UNRESOLVED');
});
test('reject remains unresolved and blocks final lock', () => {
  const rows=engine.createFinalizationRows(finalMeasurements,7);
  rows[0]=engine.resolveFinalRow(rows[0],'reject_suggestion');
  assert.equal(rows[0].status,'REJECTED_NEEDS_RESOLUTION');
  assert.equal(engine.finalizationSummary(rows,16).canLock,false);
});
test('all 16 resolved rows lock with suggestion and evidence snapshot', () => {
  let rows=engine.createFinalizationRows(finalMeasurements,7);
  rows=rows.map(row=>Number.isFinite(row.suggestionValueIn)?engine.resolveFinalRow(row,'accept_suggestion'):engine.resolveFinalRow(row,'no_data'));
  rows[1]=engine.resolveFinalRow(rows[1],'td_override','8 3/4');
  const locked=engine.lockFinalization(rows,{analysisRun:7,image:{name:'demo.jpg'},construction:'front_zipper'});
  assert.equal(locked.ok,true);
  assert.equal(locked.payload.rows.length,16);
  assert.equal(locked.payload.rows[1].final_value_in,8.75);
  assert.equal(locked.payload.rows[0].evidence_trace[0].stage,'test');
  assert.equal(locked.payload.rows[0].workbench.layers[0].id,'decision');
  assert.deepEqual(locked,engine.lockFinalization(rows,{analysisRun:7,image:{name:'demo.jpg'},construction:'front_zipper'}));
  assert.equal(engine.lockFinalization(rows,{analysisRun:8}).status,'STALE_EVIDENCE');
});
test('HTML and local scripts contain no remote resource dependency', () => {
  const files = ['index.html', 'app.js', 'styles.css', 'engine.js'];
  for (const file of files) assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /https?:\/\//i);
  const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('app.js',import.meta.url),'utf8');
  assert.match(html,/Evidence trace/);
  for(const id of ['proofSummary','viewResult','viewList','frontCalibrationPom','backCalibrationPom','suggestionCounts','finalizationBody','acceptHighConfidenceBtn','markMissingNoDataBtn','finalizeSizeLBtn','finalPayload','detectedViewChips','constructionChips','evidenceHealth','measurementSummary','frontScaleValue','backScaleValue','confirmViewsBtn','confirmConstructionBtn','hookWidthButtons','pilotAnalysisMs','pilotActions','pilotOverrides','pilotReviewRows','pilotLockMs'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/Size L measurements/);
  assert.match(html,/MEASUREMENT FAST LANE/);
  assert.match(app,/function resetFastLaneEvidence\(\)/);
  assert.match(app,/constructionOverride\.value='auto'/);
  assert.match(app,/calibrationKind:'td_confirmed_hook_eye_height'/);
  assert.match(app,/hookEyePom12Reference/);
  assert.match(app,/opencv_hook_eye_rows_reference/);
  assert.match(html,/Anchor hypotheses · no inferred lines/);
  assert.match(app,/function drawAnchorHypotheses\(paths, viewRegions\)/);
  assert.match(app,/detector support/);
  assert.match(app,/Math\.round\(tag\.score\*100\)/);
  assert.match(app,/analysisInFlight/);
  assert.match(app,/Run \$\{analysisRun\} complete in/);
  assert.match(app,/Analyze again/);
  assert.doesNotMatch(app,/ctx\.lineTo\(path\.end/);
  assert.doesNotMatch(app,/Evidence score/);
  assert.doesNotMatch(html,/id="calibrationPom"|id="knownLength"/);
});

for (const row of checks) console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.name}${row.error ? ` — ${row.error}` : ''}`);
const failed = checks.filter(row => !row.pass);
if (failed.length) process.exitCode = 1;
else console.log(`PASS construction-measurement-test (${checks.length}/${checks.length})`);
