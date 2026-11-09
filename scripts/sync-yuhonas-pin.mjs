#!/usr/bin/env node
// Keep yuhonas.ref + src/lib/yuhonas.pin.js aligned with vendor/free-exercise-db.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'vendor/free-exercise-db');
const sha = execFileSync('git', ['-C', vendor, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`invalid yuhonas HEAD: ${sha}`);

writeFileSync(join(root, 'yuhonas.ref'), `${sha}\n`);
const pinPath = join(root, 'src/lib/yuhonas.pin.js');
const next = `// Pinned Yuhonas free-exercise-db commit (vendor/free-exercise-db + yuhonas.ref).
// Bump together: node scripts/sync-yuhonas-pin.mjs after updating the submodule.
// Images stay on jsDelivr at this SHA (~200MB not shipped in Firebase builds).
export const YUHONAS_COMMIT = '${sha}';
export const YUHONAS_CDN_EXERCISES =
  \`https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@\${YUHONAS_COMMIT}/exercises\`;
`;
writeFileSync(pinPath, next);
const ref = readFileSync(join(root, 'yuhonas.ref'), 'utf8').trim();
if (ref !== sha) throw new Error('yuhonas.ref write mismatch');
console.log(`yuhonas pin → ${sha.slice(0, 7)}`);
