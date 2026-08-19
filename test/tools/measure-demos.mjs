#!/usr/bin/env node
// Offline Stage-1 measurement run (US-039): drive the REAL production-detected
// anchors (test/fixtures/production-anchors) through the lab's own scale + fusion
// engine — no browser — and emit per-POM measured values as a --measured file for
// the S0.1 line-level accuracy gate (scripts/measurement-accuracy-tests.mjs).
//
//   node test/tools/measure-demos.mjs                 # print measured values
//   node test/tools/measure-demos.mjs --out=run.json  # write a --measured file
//
// This is the "real anchors + fusion" pipeline the browser lab runs, distilled to
// a deterministic, CI-able script. Construction/H&E-row inputs per demo mirror
// what the production detector reports (documented below); everything else is
// derived from the detected anchor geometry.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(scriptDir, '..');
await import(path.join(testDir, 'engine.js'));
await import(path.join(testDir, 'topology.js'));
await import(path.join(testDir, 'library', 'construction-cohorts.js'));
await import(path.join(testDir, 'library', 'measurement-priors.js'));
const E = globalThis.MeasurementTestEngine;
const T = globalThis.MeasurementTopology;
const fixture = globalThis.CONSTRUCTION_COHORT_FIXTURE;
const priors = globalThis.MEASUREMENT_PRIOR_SNAPSHOT;

// Per-demo construction context as reported by the production detector
// (npm run demo): demo3/demo5 read as back hook-and-eye with 3 regular rows;
// demo1 has no detected closure.
const DEMO_CONTEXT = {
  'demo3.jpg': { construction: 'back_hook_and_eye', heRows: 3, opencvScore: 0.92 },
  'demo5.jpg': { construction: 'back_hook_and_eye', heRows: 3, opencvScore: 0.92 },
  'demo1.jpg': { construction: 'none_pull_on', heRows: 0, opencvScore: 0.55 },
  // Determined live in the browser lab (measure-sketch skill worked example): the
  // pixel-fallback pass guessed 'front hook and eye', but the OpenCV-upgraded pass
  // corrected it to 'unknown' (Front zip tag hit 84% but classifyConstruction's
  // margin gate abstained) — a real, useful "construction unresolved" case, not a
  // guess. Every POM correctly falls back to the general library baseline.
  'demo4.jpg': { construction: 'unknown', heRows: 0, opencvScore: null },
  // Real TD style. OpenCV abstained to 'unknown' because the closure evidence
  // conflicted ('Front zip' 74% AND 'Back hook & eye' candidate 67%), which left
  // every POM on the library baseline. Resolved at S7 by reading the flat: the
  // front panels show a centre-front zip line with a top pull, and the back view
  // is a continuous scooped V with NO hook-and-eye column — so 'Front zip' was
  // right and the back-H&E candidate was a false positive (the centre-back seam /
  // strap adjusters). Recorded as front_zipper from that visual confirmation;
  // a TD should sign it off in the fast lane.
  // CAVEAT for anyone reading its numbers: POM 16 is NOT trustworthy on this
  // style — apex-left/right landed at the wide-set STRAP JOINS (y≈0.26, level
  // with strap-top 0.235, above cf-top 0.514), not the cup apexes, giving
  // apex/half-band = 78% where ~45-55% is real. The detector still reported them
  // 'high' confidence, so this is detector over-confidence, not a missing anchor.
  'EvelynBliss vA 1.0.jpg': { construction: 'front_zipper', heRows: 0, opencvScore: null },
};

// CLI overrides for a sketch that has no hardcoded DEMO_CONTEXT entry (i.e. any
// sketch besides the bundled demo1/3/5). Node can compute real anchors + scale
// + fusion, but it cannot run the browser's OpenCV pixel-texture construction
// classifier — that needs a canvas, which only the browser lab has. So a new
// sketch's construction must come from either the browser (most accurate) or
// this override; without one it defaults to 'none_pull_on' and prints a WARNING
// rather than silently pretending the construction was detected.
function parseOverrideArgs(argv) {
  const only = argv.find(a => a.startsWith('--only='));
  const construction = argv.find(a => a.startsWith('--construction='));
  const heRows = argv.find(a => a.startsWith('--heRows='));
  return {
    only: only ? only.slice(7) : null,
    construction: construction ? construction.slice(15) : null,
    heRows: heRows ? Number(heRows.slice(9)) : null,
  };
}

// Minimal JPEG/PNG dimension reader — anchors are normalized to the SOURCE
// image, so pixel-length ratios (which drive the inferred scale) are only valid
// at the true aspect ratio, not a square canvas.
function imageSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }; // PNG IHDR
  let i = 2; // JPEG
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { width: 1000, height: 1000 };
}

function measureDemo(image, anchorFixture, overrides) {
  overrides = overrides || {};
  // An explicit CLI override always wins over the recorded default — it is a
  // deliberate "what if this construction were confirmed?" instruction.
  let ctx = overrides.construction ? null : DEMO_CONTEXT[image];
  let ctxSource = 'bundled demo (known construction)';
  if (!ctx) {
    if (overrides.construction) {
      ctx = { construction: overrides.construction, heRows: overrides.heRows || 0, opencvScore: null };
      ctxSource = '--construction/--heRows override';
    } else {
      ctx = { construction: 'none_pull_on', heRows: 0, opencvScore: null };
      ctxSource = 'DEFAULTED — construction unknown';
      console.log(`  WARNING: ${image} has no known construction and no --construction= override.`);
      console.log('    Defaulting to none_pull_on/0 H&E rows — likely WRONG for this sketch.');
      console.log('    Node cannot run the OpenCV texture classifier (browser-only); either:');
      console.log('      1) detect it live in the browser lab (most accurate), or');
      console.log('      2) pass --construction=<id> --heRows=<n> once you know it.');
    }
  }
  const cohortId = ctx.construction;
  const dims = imageSize(readFileSync(path.join(testDir, 'sketches', image)));
  const paths = E.pathsFromDetectedAnchors(anchorFixture.anchors, { width: dims.width, height: dims.height });
  const hookEyeReference = E.hookEyePom12Reference(fixture, cohortId, ctx.heRows);
  const scales = E.resolveViewScales({ fixture, cohortId, paths, hookEyeReference, calibrations: [] });
  const inferredFront = scales.front_outer && scales.front_outer.precedence === 'multi_anchor_inferred' ? scales.front_outer.scale : null;

  const measurements = paths.map(path => {
    const viewScale = scales[path.viewRole] || null;
    const stats = E.cohortPomStats(fixture, cohortId, path.pom);
    const result = (hookEyeReference.status === 'SUPPORTED' && path.pom === '12')
      ? { pom: '12', name: path.name, viewRole: path.viewRole, value_in: hookEyeReference.value_in, source: 'opencv_hook_eye_row_rule', confidence: 'medium', decision: 'ESTIMATED_SUGGESTION', result_kind: 'CONSTRUCTION_REFERENCE_MEASUREMENT', cohort: stats }
      : E.fuseMeasurement({ fixture, priors, cohortId, pom: path.pom, path, pixelLength: path.pixelLength, viewRole: path.viewRole, viewScale, placementConfidence: path.confidence, mode: 'auto', inferredScale: inferredFront });
    return Object.assign({ library_prior_in: stats.median, anchorStatus: path.anchorStatus }, result);
  });
  E.fuseWithLibrary(measurements, { fixture, cohortId, priors });

  const values = {};
  for (const m of measurements) if (m.value_in != null && Number.isFinite(Number(m.value_in))) values[m.pom] = Math.round(Number(m.value_in) * 1000) / 1000;
  return { values, scales, measurements, ctx, ctxSource };
}

const srcDir = path.join(testDir, 'fixtures', 'production-anchors');
const out = {};
const perDemoRows = {};
const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const readiness = args.includes('--readiness');
const corroborate = args.includes('--corroborate');
const classify = args.includes('--classify');
const diagnose = args.includes('--diagnose');
const overrides = parseOverrideArgs(args);

// Standard calibration POMs a TD would type a known length for, per view, and
// the library median they'd most likely enter. Used ONLY to SIMULATE what each
// POM would become after one TD calibration (see --diagnose) — never to produce
// a reported measurement.
const CALIBRATION_SIM = {
  front_outer: { pom: '1', knownLength: 14 },    // 1/2 bottom band relax
  back: { pom: '12', knownLength: 3.75 },        // back centre length
};

// Label each POM by the true SOURCE of its number (prior vs measured vs ref).
function categorize(m) {
  const rk = m.result_kind, src = String(m.source || ''), dec = m.decision;
  if (m.value_in == null) return 'NO DATA';
  if (rk === 'CONSTRUCTION_REFERENCE_MEASUREMENT' || src.includes('opencv_hook_eye')) return 'CONSTRUCTION-REF';
  if (rk === 'SKETCH_MEASUREMENT' || src.includes('sketch_explicit')) return 'MEASURED (sketch)';
  if (rk === 'ESTIMATED_SUGGESTION' || src.includes('sketch_inferred')) return 'ESTIMATED (sketch·inferred scale)';
  if (dec === 'LIBRARY_PRIOR' || src.includes('library') || src.includes('cohort_prior') || src.includes('baseline')) return 'PRIOR (library)';
  return dec || '?';
}

for (const file of readdirSync(srcDir).sort()) {
  if (!file.endsWith('.json')) continue;
  const fx = JSON.parse(readFileSync(path.join(srcDir, file), 'utf8'));
  const image = fx.image || file.replace(/\.json$/, '');
  if (overrides.only && image !== overrides.only && file !== overrides.only) continue;
  const { values, scales, measurements, ctx, ctxSource } = measureDemo(image, fx, overrides);
  out[image] = values;
  perDemoRows[image] = measurements;
  DEMO_CONTEXT[image] = DEMO_CONTEXT[image] || ctx;               // so --classify/--readiness/--corroborate below label it consistently
  const front = scales.front_outer, back = scales.back;
  console.log(`\n${image}  [${ctx.construction}]  (${ctxSource})`);
  console.log(`  scale: front ${front.status === 'VALID' ? front.scale.toFixed(4) : front.status} (${front.precedence})  |  back ${back.status === 'VALID' ? back.scale.toFixed(4) : back.status} (${back.precedence})`);
  console.log('  measured POM values (in): ' + JSON.stringify(values));
}
if (overrides.only && !Object.keys(out).length) {
  console.log(`\nNo fixture matched --only=${overrides.only}. Dump it first:`);
  console.log(`  npm run demo -- --only=${overrides.only.replace(/\.json$/, '').replace(/\.(jpg|png|jpeg)$/, '')} --dump-anchors=test/fixtures/production-anchors`);
}

if (outArg) {
  const outPath = path.isAbsolute(outArg.slice(6)) ? outArg.slice(6) : path.join(testDir, '..', outArg.slice(6));
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote measured values for ${Object.keys(out).length} demo(s) to ${outPath}`);
}

// --readiness: per-POM roll-out candidacy across all demo fixtures (US-041).
// Tells a TD which POMs produce a coherent measured value often enough to be
// worth labelling ground truth for, and which fall back (library/outlier) — a
// map of where Mode B is ready vs blocked, with NO ground truth required.
if (readiness) {
  const demos = Object.keys(perDemoRows);
  const agg = {};
  for (const image of demos) {
    for (const m of perDemoRows[image]) {
      const a = (agg[m.pom] = agg[m.pom] || { coherent: 0, fallback: 0, deltas: [] });
      const fused = m.fusion && m.fusion.diagnosis === 'coherent';
      if (fused) a.coherent += 1; else a.fallback += 1;
      if (m.fusion && Number(m.library_prior_in) > 0) a.deltas.push(Math.abs(m.fusion.residual || 0));
    }
  }
  console.log('\n=== Mode B per-POM readiness (across ' + demos.length + ' demo fixtures) ===');
  console.log('POM | coherent | fallback | avg|residual| | candidate?');
  console.log('----|----------|----------|-------------|-----------');
  const ids = Object.keys(agg).sort((x, y) => Number(x) - Number(y));
  for (const pom of ids) {
    const a = agg[pom];
    const avgRes = a.deltas.length ? (a.deltas.reduce((s, v) => s + v, 0) / a.deltas.length) : null;
    const candidate = a.coherent >= Math.max(1, Math.ceil(demos.length / 2)) && a.coherent >= a.fallback;
    console.log(
      `${String(pom).padStart(3)} | ${String(a.coherent).padStart(8)} | ${String(a.fallback).padStart(8)} | `
      + `${(avgRes == null ? '—' : (Math.round(avgRes * 1000) / 10 + '%')).padStart(11)} | ${candidate ? 'yes — label GT next' : 'no — needs detector/anchor work'}`);
  }
  console.log('\nCandidate = coherent on a majority of demos. A candidate POM still needs');
  console.log('TD-confirmed ground truth + `measurement-accuracy --promote` before it is enabled.');
}

// --corroborate: anchor geometry as an independent second opinion on the OpenCV
// construction call, per demo fixture. Structure axis (cup/cradle/apex) is
// strong; closure axis (H&E/zipper) is weak/not-assessable — reported honestly.
if (corroborate) {
  console.log('\n=== Anchor -> construction corroboration (real anchors, offline) ===');
  for (const file of readdirSync(srcDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const fx = JSON.parse(readFileSync(path.join(srcDir, file), 'utf8'));
    const image = fx.image || file.replace(/\.json$/, '');
    const ctx = DEMO_CONTEXT[image] || { construction: 'unknown', opencvScore: null };
    const dims = imageSize(readFileSync(path.join(testDir, 'sketches', image)));
    const c = E.corroborateConstruction(fx.anchors, dims, { construction: ctx.construction, score: ctx.opencvScore });
    console.log(`\n${image}  — OpenCV call: ${c.construction} (score ${c.opencvScore})`);
    console.log(`  verdict: ${c.verdict}${c.anchorSupport != null ? ' (anchor support ' + c.anchorSupport + ')' : ''}`
      + (c.adjustedScore != null && c.adjustedScore !== c.opencvScore ? ` → adjusted score ${c.adjustedScore}` : ''));
    if (c.note) console.log(`  note: ${c.note}`);
    console.log('  structure axis: cup ' + c.axes.structured_cup.anchorSupport
      + ' · cradle ' + c.axes.underwire_cradle.anchorSupport
      + ' · apex-sym ' + c.axes.apex_symmetry.anchorSupport
      + '  |  closure axis: back-column ' + c.axes.back_closure.anchorSupport + ' (weak), front-closure not assessable');
  }
  console.log('\nAnchors give strong independent evidence on STRUCTURE (cup/cradle/apex) but');
  console.log('only weak evidence on CLOSURE type — OpenCV rows/rails stay the decider there.');
}

// --classify: per-POM, is the NUMBER a real measurement or a library prior?
if (classify) {
  const POM_NAMES = E.POM_NAMES || {};
  for (const [image, rows] of Object.entries(perDemoRows)) {
    console.log(`\n=== ${image}  [${(DEMO_CONTEXT[image] || {}).construction || 'unknown'}] — is each POM measured or a prior? ===`);
    console.log('  POM | value | category                        | source');
    console.log('  ----|-------|---------------------------------|-------------------------------');
    const tally = {};
    for (const m of rows.sort((a, b) => Number(a.pom) - Number(b.pom))) {
      const cat = categorize(m);
      tally[cat] = (tally[cat] || 0) + 1;
      const val = m.value_in == null ? '—' : String(m.value_in);
      console.log(`  ${String(m.pom).padStart(3)} | ${val.padStart(5)} | ${cat.padEnd(31)} | ${m.source || 'none'}`);
    }
    console.log('  ' + '-'.repeat(70));
    console.log('  tally: ' + Object.entries(tally).map(([k, v]) => `${v}×${k}`).join('  '));
  }
  console.log('\nMEASURED/ESTIMATED = derived from the sketch (trust per confidence).');
  console.log('CONSTRUCTION-REF   = a detected feature (e.g. H&E rows) → a known value.');
  console.log('PRIOR (library)    = population/cohort median, NOT measured from THIS sketch.');
}

// --diagnose: for every POM that is NOT a real measurement, name the exact
// BLOCKER and SIMULATE which escalation unlocks it — so the ROI of each TD
// action is known before anyone does it. Answers "what do I do about this row?",
// which --classify deliberately does not.
if (diagnose) {
  const priorMedian = pom => {
    const p = priors.poms && priors.poms[String(pom)];
    return p && Number(p.median) > 0 ? Number(p.median) : null;
  };
  // Compact category codes so the blocker/unlock columns stay aligned.
  const SHORT = {
    'MEASURED (sketch)': 'MEASURED', 'CONSTRUCTION-REF': 'CONSTR-REF',
    'ESTIMATED (sketch·inferred scale)': 'ESTIMATED', 'PRIOR (library)': 'PRIOR', 'NO DATA': 'NO-DATA',
  };
  const short = c => SHORT[c] || c;
  for (const [image, rows] of Object.entries(perDemoRows)) {
    const ctx = DEMO_CONTEXT[image] || { construction: 'unknown', heRows: 0 };
    const fx = JSON.parse(readFileSync(path.join(srcDir, image + '.json'), 'utf8'));
    const dims = imageSize(readFileSync(path.join(testDir, 'sketches', image)));
    const paths = E.pathsFromDetectedAnchors(fx.anchors, { width: dims.width, height: dims.height });
    const cohortId = ctx.construction;
    const her = E.hookEyePom12Reference(fixture, cohortId, ctx.heRows);
    const scalesNow = E.resolveViewScales({ fixture, cohortId, paths, hookEyeReference: her, calibrations: [] });

    // Hypothetical A: construction resolved. When it is already unresolved we
    // probe a plausible cohort so the report can say whether that alone helps.
    const probeCohort = cohortId === 'unknown' ? 'back_hook_and_eye' : cohortId;
    const scalesIfConstruction = E.resolveViewScales({
      fixture, cohortId: probeCohort, paths,
      hookEyeReference: E.hookEyePom12Reference(fixture, probeCohort, ctx.heRows), calibrations: [],
    });
    // Hypothetical B: TD types one known length per view (explicit calibration).
    const scalesIfCalibrated = E.buildExplicitViewScales(paths, [
      { viewRole: 'front_outer', pom: CALIBRATION_SIM.front_outer.pom, knownLength: CALIBRATION_SIM.front_outer.knownLength },
      { viewRole: 'back', pom: CALIBRATION_SIM.back.pom, knownLength: CALIBRATION_SIM.back.knownLength },
    ]);

    const simulate = (pom, viewScaleSet, cohort, mode) => {
      const p = paths.find(x => x.pom === pom);
      if (!p) return null;
      const vs = viewScaleSet[p.viewRole] || null;
      const r = E.fuseMeasurement({
        fixture, priors, cohortId: cohort, pom, path: p, pixelLength: p.pixelLength,
        viewRole: p.viewRole, viewScale: vs, placementConfidence: p.confidence, mode,
      });
      return categorize(Object.assign({ library_prior_in: null }, r));
    };

    console.log(`\n=== ${image} [${cohortId}] — blockers + what unlocks each POM ===`);
    console.log('  POM | now        | blocker                          | unlock');
    console.log('  ----|------------|----------------------------------|---------------------------------');
    for (const m of rows.slice().sort((a, b) => Number(a.pom) - Number(b.pom))) {
      const now = categorize(m);
      if (now === 'MEASURED (sketch)' || now === 'CONSTRUCTION-REF') {
        console.log(`  ${String(m.pom).padStart(3)} | ${short(now).padEnd(10)} | ${'—'.padEnd(32)} | already a real measurement`);
        continue;
      }
      const p = paths.find(x => x.pom === m.pom);
      let blocker, unlock;
      if (!p || !p.start || !p.end) {
        // Which required anchor kinds are actually absent from the fixture?
        const missing = (p ? p.anchors : []).filter(k => !fx.anchors[k]);
        blocker = 'MISSING ANCHOR: ' + (missing.join(', ') || 'view/anchor pair');
        const prior = priorMedian(m.pom);
        unlock = prior != null
          ? `TD drags anchor once (learning remembers) — or show prior ${prior}`
          : 'TD drags anchor once (learning remembers) — no prior exists';
      } else {
        const vs = scalesNow[p.viewRole];
        const afterConstruction = simulate(m.pom, scalesIfConstruction, probeCohort, 'auto');
        const afterCalibration = simulate(m.pom, scalesIfCalibrated, cohortId, 'explicit');
        const scaleOk = vs && vs.status === 'VALID';
        blocker = scaleOk ? `library-anchored scale (${vs.precedence})` : `NO ${p.viewRole} SCALE (${vs ? vs.status : 'none'})`;
        const gains = [];
        if (!scaleOk && afterConstruction && /MEASURED|ESTIMATED/.test(afterConstruction)) gains.push(`confirm construction → ${afterConstruction}`);
        if (afterCalibration && /MEASURED/.test(afterCalibration)) gains.push('TD calibrates 1 length → MEASURED (sketch)');
        unlock = gains.length ? gains.join('; ') : 'needs TD calibration or ground truth to go beyond a prior';
      }
      console.log(`  ${String(m.pom).padStart(3)} | ${short(now).padEnd(10)} | ${blocker.slice(0, 32).padEnd(32)} | ${unlock}`);
    }
    // ANCHOR SANITY (topology layer, US-066). A POM can be "measured" and still be
    // geometrically wrong: on EvelynBliss the apex pair sat on the wide-set STRAP
    // JOINS, so POM 16 read 11.43 in instead of ~8 in. apexPlausibility needs only
    // anchor coordinates — no pixels — so this check runs here on every sketch and
    // catches over-confident anchors that the confidence tier calls 'high'.
    const aL = fx.anchors['apex-left'], aR = fx.anchors['apex-right'];
    const bL = fx.anchors['band-left'], bR = fx.anchors['band-right'];
    if (T && aL && aR && bL && bR) {
      const p = T.apexPlausibility(aL.x, aR.x, bL.x, bR.x);
      const tierL = aL.confidence || '?', tierR = aR.confidence || '?';
      console.log('  --- anchor sanity (topology) ---');
      console.log(`  POM 16 apex/half-band = ${p.ratio} → ${p.verdict.toUpperCase()} (${p.reason})`);
      console.log(`         detector tiers: apex-left ${tierL}, apex-right ${tierR}`
        + (p.verdict !== 'plausible' ? '  ← over-confident: the tier does not reflect this' : ''));
      if (p.verdict !== 'plausible') {
        console.log('         unlock: re-seed apex from the cup zone (see test/tools/topology-harness.md),');
        console.log('                 or have the TD drag the apex pair once (learning remembers it).');
      }
    }
    console.log('  ' + '-'.repeat(100));
    console.log(`  simulation assumes the TD types: front POM ${CALIBRATION_SIM.front_outer.pom}=${CALIBRATION_SIM.front_outer.knownLength}in, back POM ${CALIBRATION_SIM.back.pom}=${CALIBRATION_SIM.back.knownLength}in`);
    if (cohortId === 'unknown') console.log(`  construction probe used '${probeCohort}' only to test whether resolving it would help`);
  }
  console.log('\nThese are SIMULATED outcomes of an escalation, not measurements. Use them to');
  console.log('choose the cheapest unlock per POM, then perform it for real.');
}
