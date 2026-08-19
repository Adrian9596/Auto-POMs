#!/usr/bin/env node
// Similar-style RETRIEVAL prototype report (US-016). For each demo it derives the
// features the sketch can supply, finds the nearest real library style, and
// contrasts that style's REAL measurements with the flat population median —
// showing how much more style-specific the prior becomes. Honest: only ~6 styles
// are matchable today, and this is a PREDICTION (best prior), not a measurement.
//   node test/tools/retrieval-demos.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(scriptDir, '..');
const appDir = path.resolve(testDir, '..');
await import(path.join(testDir, 'engine.js'));
await import(path.join(testDir, 'library', 'library-styles.js'));
const E = globalThis.MeasurementTestEngine;
const STYLES = globalThis.LIBRARY_STYLES;

// Population median per concept, from the production Tier-0 corpus.
const sizeL = JSON.parse(readFileSync(path.join(appDir, 'auto_mode_rules', 'sizeL-suggestions.json'), 'utf8'));
const popByConcept = {};
for (const v of Object.values(sizeL.poms || {})) if (v.concept && Number(v.median) > 0) popByConcept[v.concept] = Number(v.median);
// Align corpus concept names with the raw-measurement concept names.
const ALIAS = { center_front_height: 'cf_height', center_back_height: 'cb_height', strap_width: null };

// Features the sketch/anchors + OpenCV can actually supply (honest subset).
const DEMO_FEATURES = {
  'demo3.jpg': { cradle_closure_location: 'back_hook_eye', cup_coverage_silhouette: 'full_cup', back_coverage_tier: 'mid' },
  'demo5.jpg': { cradle_closure_location: 'back_hook_eye', cup_coverage_silhouette: 'full_cup', back_coverage_tier: 'mid' },
  'demo1.jpg': { cradle_closure_location: 'unknown', cup_coverage_silhouette: 'full_cup', back_coverage_tier: 'mid' },
};

console.log('=== Similar-style retrieval (real anchors/features -> nearest real style) ===');
console.log(`library pool: ${STYLES.length} styles (${STYLES.map(s => s.id).join(', ')})\n`);

for (const [demo, feats] of Object.entries(DEMO_FEATURES)) {
  const r = E.retrieveSimilarStyle(feats, STYLES);
  const n = r.nearest;
  console.log(`${demo}  features: ${JSON.stringify(feats)}`);
  console.log(`  nearest style: ${n.id}  (score ${n.score}, matched ${JSON.stringify(n.matchedFeatures)}, assessed ${JSON.stringify(r.assessedFeatures)})`);
  console.log('  concept              | nearest-style | pop.median | delta');
  console.log('  ---------------------|---------------|------------|------');
  let shown = 0;
  for (const [concept, val] of Object.entries(n.measurements)) {
    const pop = popByConcept[concept] != null ? popByConcept[concept] : (ALIAS[concept] ? popByConcept[ALIAS[concept]] : undefined);
    if (pop == null) continue;
    const delta = Math.round((val - pop) * 100) / 100;
    if (Math.abs(delta) < 1e-9 && shown > 6) continue;
    console.log(`  ${concept.padEnd(20)} | ${String(val).padStart(13)} | ${String(pop).padStart(10)} | ${delta > 0 ? '+' : ''}${delta}`);
    shown += 1;
  }
  console.log('');
}
console.log('The nearest-style prior differs from the flat median (style-specific). It is the');
console.log('best PREDICTION from library+sketch — not a measurement of this sample. Quality');
console.log('scales with library coverage: only 6 styles are matchable today.');
