#!/usr/bin/env node
// Library-coverage dashboard for the similar-style RETRIEVAL pool (US-016/US-043).
// The retrieval pool = styles that have BOTH a fingerprint AND measurements.
// Today that pool is thin; the fastest way to grow it is to FINGERPRINT the many
// styles that are already measured. This report quantifies the gap and prints a
// prioritized "fingerprint these next" queue (most-measured styles first).
//   node test/tools/library-coverage.mjs
// It complements the corpus's own library_health.py — it only scores retrieval
// readiness, and never writes anything.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.resolve(scriptDir, '..', '..', '..', 'Measurements 2', 'library');

function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (line === '') continue;
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur); rows.push(cells);
  }
  return rows;
}

const fpPath = path.join(libDir, 'component_fingerprints.csv');
const mPath = path.join(libDir, '_raw_intake', 'measurements_size_l.csv');
if (!existsSync(fpPath) || !existsSync(mPath)) {
  console.error('Corpus not found at ' + libDir + ' — this report needs the ../Measurements 2 sibling.');
  process.exit(1);
}

// Retrieval scores on these features; a fingerprint is "complete" when it fills them.
const RETRIEVAL_FEATURES = ['cradle_closure_location', 'cup_coverage_silhouette', 'back_coverage_tier', 'cup_molded', 'band_width_tier'];

const fp = parseCsv(readFileSync(fpPath, 'utf8'));
const fpHdr = fp[0];
const fpById = {};
for (const r of fp.slice(1)) { const id = r[fpHdr.indexOf('style_id')]; if (id) fpById[id] = r; }

const m = parseCsv(readFileSync(mPath, 'utf8'));
const mHdr = m[0];
const iId = mHdr.indexOf('style_id'), iC = mHdr.indexOf('old_concept'), iV = mHdr.indexOf('size_l_in');
const measConcepts = {};
for (const r of m.slice(1)) {
  const id = r[iId], c = r[iC], v = Number(r[iV]);
  if (!id || !c || !Number.isFinite(v)) continue;
  (measConcepts[id] = measConcepts[id] || new Set()).add(c);
}

const measured = new Set(Object.keys(measConcepts));
const fingerprinted = new Set(Object.keys(fpById));
const pool = [...measured].filter(id => fingerprinted.has(id));
const candidates = [...measured].filter(id => !fingerprinted.has(id))
  .sort((a, b) => measConcepts[b].size - measConcepts[a].size);
const fpNoMeas = [...fingerprinted].filter(id => !measured.has(id));

console.log('=== Similar-style retrieval — library coverage ===\n');
console.log(`measured styles:       ${measured.size}`);
console.log(`fingerprinted styles:  ${fingerprinted.size}`);
console.log(`RETRIEVAL POOL (both): ${pool.length}   <- what retrieval can match against today`);
console.log(`fingerprint candidates (measured, not fingerprinted): ${candidates.length}`);
if (fpNoMeas.length) console.log(`fingerprinted without measurements (need measuring): ${fpNoMeas.length} — ${fpNoMeas.join(', ')}`);

console.log('\n-- Retrieval-feature completeness of the current pool --');
for (const id of pool.sort()) {
  const row = fpById[id];
  const missing = RETRIEVAL_FEATURES.filter(f => !(row[fpHdr.indexOf(f)] || '').trim());
  console.log(`  ${id.padEnd(20)} ${missing.length ? 'MISSING: ' + missing.join(', ') : 'complete'}`);
}

console.log('\n-- Fingerprint these NEXT (already measured; most measurements first) --');
console.log('   #POMs | style_id');
for (const id of candidates.slice(0, 15)) {
  console.log(`   ${String(measConcepts[id].size).padStart(5)} | ${id}`);
}
if (candidates.length > 15) console.log(`   … and ${candidates.length - 15} more`);

console.log('\nAfter adding fingerprint row(s) to component_fingerprints.csv:');
console.log('  1) npm run build-library-styles   (regenerates the offline pool)');
console.log('  2) npm run retrieval-demos        (confirms the pool grew / matches improved)');
console.log('  3) npm run construction-measurement-test');
console.log('See docs/notes/GROW_LIBRARY.md for the full checklist + feature vocabulary.');
