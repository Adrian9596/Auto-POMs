#!/usr/bin/env node
// Bundles the production-detector anchor fixtures (JSON, source of truth) into a
// single offline JS global the lab loads via <script> — honoring the lab's
// no-fetch boundary. US-039 Stage 1 (library × sketch fusion over real anchors).
//
// Regenerate the JSON fixtures first (real detector, headless):
//   npm run demo -- --only=demo3 --dump-anchors=test/fixtures/production-anchors
// then rebuild this bundle:
//   node test/tools/build-anchor-bundle.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(scriptDir, '..');
const srcDir = path.join(testDir, 'fixtures', 'production-anchors');
const outFile = path.join(testDir, 'library', 'production-anchors.js');

const out = {};
for (const file of readdirSync(srcDir).sort()) {
  if (!file.endsWith('.json')) continue;
  const parsed = JSON.parse(readFileSync(path.join(srcDir, file), 'utf8'));
  out[parsed.image || file.replace(/\.json$/, '')] = parsed;
}

const banner = '// GENERATED — do not edit by hand.\n'
  + '// Real production-detector anchors for the offline lab bridge (US-039 Stage 1).\n'
  + '// Regenerate: npm run demo -- --only=<demo> --dump-anchors=test/fixtures/production-anchors\n'
  + '//   then: node test/tools/build-anchor-bundle.mjs\n';
const body = '(function (root, factory) {\n'
  + '  const data = factory();\n'
  + '  if (typeof module === "object" && module.exports) module.exports = data;\n'
  + '  root.PRODUCTION_ANCHOR_FIXTURES = data;\n'
  + '})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n'
  + '  return ' + JSON.stringify(out, null, 2) + ';\n'
  + '});\n';

writeFileSync(outFile, banner + body);
console.log(`wrote ${path.relative(testDir, outFile)} with ${Object.keys(out).join(', ')}`);
