#!/usr/bin/env node
// Inlines real approved styles (fingerprint features + per-concept Size-L
// medians) from ../Measurements 2 into an offline lab artifact for the
// similar-style RETRIEVAL prototype (US-016 "construction-compatible
// similar-sketch evidence"). Only styles that have BOTH a fingerprint and
// measurements are kept — today that's a thin pool (~6), which is exactly the
// data gap this POC quantifies. Regenerate: node test/tools/build-library-styles.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(scriptDir, '..');
const libDir = path.resolve(testDir, '..', '..', 'Measurements 2', 'library');

// Minimal quote-aware CSV parser (fields may contain commas inside quotes).
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
const median = xs => { const s = xs.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const FEATURE_COLS = ['cup_coverage_silhouette', 'cup_molded', 'cup_depth_tier', 'cradle_closure_location', 'back_coverage_tier', 'band_width_tier', 'strap_mount_type', 'fit_block'];

const fp = parseCsv(readFileSync(path.join(libDir, 'component_fingerprints.csv'), 'utf8'));
const fpHdr = fp[0];
const fpById = {};
for (const r of fp.slice(1)) {
  const id = r[fpHdr.indexOf('style_id')]; if (!id) continue;
  const f = {}; for (const c of FEATURE_COLS) f[c] = r[fpHdr.indexOf(c)] || null;
  fpById[id] = f;
}

const m = parseCsv(readFileSync(path.join(libDir, '_raw_intake', 'measurements_size_l.csv'), 'utf8'));
const mHdr = m[0];
const iId = mHdr.indexOf('style_id'), iC = mHdr.indexOf('old_concept'), iV = mHdr.indexOf('size_l_in');
const byStyle = {};
for (const r of m.slice(1)) {
  const id = r[iId], c = r[iC], v = Number(r[iV]);
  if (!id || !c || !Number.isFinite(v)) continue;
  (byStyle[id] = byStyle[id] || {}); (byStyle[id][c] = byStyle[id][c] || []).push(v);
}

const styles = [];
for (const id of Object.keys(fpById)) {
  if (!byStyle[id]) continue;                                  // needs BOTH fingerprint + measurements
  const meas = {};
  for (const [c, vs] of Object.entries(byStyle[id])) meas[c] = Math.round(median(vs) * 1000) / 1000;
  styles.push({ id, features: fpById[id], measurements: meas });
}
styles.sort((a, b) => a.id.localeCompare(b.id));

const banner = '// GENERATED — do not edit by hand. Real approved styles (fingerprint features +\n'
  + '// per-concept Size-L medians) for the lab similar-style retrieval prototype (US-016).\n'
  + '// Regenerate: node test/tools/build-library-styles.mjs\n';
const body = '(function (root, factory) {\n'
  + '  const data = factory();\n'
  + '  if (typeof module === "object" && module.exports) module.exports = data;\n'
  + '  root.LIBRARY_STYLES = data;\n'
  + '})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n'
  + '  return ' + JSON.stringify(styles, null, 2) + ';\n'
  + '});\n';
writeFileSync(path.join(testDir, 'library', 'library-styles.js'), banner + body);
console.log('wrote library/library-styles.js with ' + styles.length + ' styles: ' + styles.map(s => s.id).join(', '));
