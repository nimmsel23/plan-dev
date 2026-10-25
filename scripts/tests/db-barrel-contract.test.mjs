// Vertrag: Alles, was Plan-Code aus '@db' importiert, muss in jedem Ziel-Barrel exportiert sein.
// Hintergrund: fitness-dev kompiliert die Plan-Views gegen seine EIGENE db-Kopie; ein neuer Import
// ohne passenden Export dort bricht erst im Deploy ab. Zusätzliche Barrels: DB_CONTRACT_BARRELS
// (Komma-getrennte Pfade); fehlende Dateien werden übersprungen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(root, 'src');
const home = os.homedir();
// Touren-Funktionen gehören zur Plan-Shell, nicht zu den eingebetteten Plan-Views.
const SHELL_ONLY = /(^|\/)(Touren|lib\/tours)\//;

const own = ['src/lib/db/index.js', 'src/lib/db/index.firestore.app.js'].map((p) => path.join(root, p));
const consumers = [
  path.join(home, 'fitness-dev/src/lib/db/index.js'),
  path.join(home, 'fitness-dev/src/lib/db/index.firestore.app.js'),
  ...(process.env.DB_CONTRACT_BARRELS || '').split(',').filter(Boolean),
];
const barrels = [...own, ...consumers].filter((p) => fs.existsSync(p));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
  });
}
function ast(file) {
  const code = /\.jsx$/.test(file) ? transformSync(fs.readFileSync(file, 'utf8'), { loader: 'jsx' }).code : fs.readFileSync(file, 'utf8');
  return parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
}
function importedFromDb() {
  const out = new Map();
  for (const file of walk(SRC)) {
    if (SHELL_ONLY.test(path.relative(SRC, file))) continue;
    for (const node of ast(file).body) {
      const isImp = node.type === 'ImportDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source);
      if (!isImp || node.source?.value !== '@db') continue;
      for (const s of node.specifiers || []) {
        const name = s.imported?.name ?? s.local?.name;
        if (name && name !== 'default') out.set(name, [...(out.get(name) || []), path.relative(root, file)]);
      }
    }
  }
  return out;
}
function exportsOf(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return new Set();
  seen.add(file);
  const names = new Set();
  for (const node of ast(file).body) {
    if (node.type === 'ExportAllDeclaration' && node.source.value.startsWith('.')) {
      exportsOf(path.resolve(path.dirname(file), node.source.value), seen).forEach((n) => names.add(n));
    } else if (node.type === 'ExportAllDeclaration') {
      // Alias-Pfad (z. B. @plan/...): nicht auflösbar, Namen daher unbekannt
    } else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.id) names.add(node.declaration.id.name);
      node.declaration?.declarations?.forEach((d) => names.add(d.id.name));
      node.specifiers.forEach((s) => names.add(s.exported.name));
    }
  }
  return names;
}

test('jeder @db-Import des Plan-Codes ist in allen Ziel-Barrels exportiert', () => {
  assert.ok(barrels.length >= 2, 'eigene Barrels fehlen');
  const wanted = importedFromDb();
  assert.ok(wanted.size > 20, 'zu wenige Imports gefunden – Parser kaputt?');
  const problems = [];
  for (const barrel of barrels) {
    const have = exportsOf(barrel);
    // Barrels mit Alias-Re-Exports (export * from "@plan/…") können wir nicht auflösen: nur Warnung.
    if (!have.size) continue;
    for (const [name, files] of wanted) if (!have.has(name)) problems.push(`${path.relative(home, barrel)}: ${name} (genutzt in ${files[0]})`);
  }
  assert.deepEqual(problems, [], `Fehlende @db-Exporte:\n${problems.join('\n')}`);
});
