#!/usr/bin/env node
// Serves this test/ folder (the offline measurement test lab) as a static site.
// Node-based so it works on the Google Drive path, where the sandboxed system
// Python's http.server cannot call os.getcwd().
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from '../scripts/static-server.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || '127.0.0.1';

const { baseUrl } = await startStaticServer(scriptDir, { host, port });
console.log(`Bra measurement test lab running at ${baseUrl}/`);
console.log('Press Ctrl+C to stop.');
