// Einzige Stelle, die weiß, wo die Fitness-KB (fitness/catalog/kb) liegt.
// Reihenfolge: FITNESS_KB_DIR (explizit) → coach-dev (Python-Backend, aktuellste KB)
// → fitness-dev / .fitness-dev (CI-Checkout). Später ersetzbar durch `fitness kb path`.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rel = 'fitness/catalog/kb';
const candidates = [
  process.env.FITNESS_KB_DIR,
  join(root, '..', 'coach-dev', rel),
  join(root, '..', 'fitness-dev', rel),
  // coach-dev nested: modules/plan → ../../fitness/catalog/kb bzw. ../../.fitness-dev/...
  join(root, '..', '..', rel),
  join(root, '..', '..', '.fitness-dev', rel),
  join(root, '.fitness-dev', rel),
].filter(Boolean);

export const KB_DIR = candidates.find((c) => existsSync(c)) ?? null;
if (!KB_DIR) {
  throw new Error(`Fitness-KB nicht gefunden. FITNESS_KB_DIR setzen. Gesucht:\n  ${candidates.join('\n  ')}`);
}
