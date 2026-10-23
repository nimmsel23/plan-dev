import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingUpdates, updateLines, readSeenVersions, markVersionsSeen } from '../../src/views/Plan/lib/planUpdates.js';
import { diffSnapshots } from '../../src/views/Plan/lib/planVersions.js';

const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };

test('Ohne Ausgangsstand: Baseline, kein Banner', () => {
  const r = pendingUpdates([{ id: 'p', headVersion: 3 }], {});
  assert.equal(r.updates.length, 0);
  assert.equal(r.baseline.length, 1);
});

test('Neuere Version meldet sich, gleiche nicht', () => {
  assert.equal(pendingUpdates([{ id: 'p', headVersion: 3 }], { p: 2 }).updates[0].from, 2);
  assert.equal(pendingUpdates([{ id: 'p', headVersion: 3 }], { p: 3 }).updates.length, 0);
  assert.equal(pendingUpdates([{ id: 'p' }], { p: 1 }).updates.length, 0);
});

test('Merken und Lesen pro Nutzer', () => {
  markVersionsSeen('u1', [{ id: 'p', headVersion: 4 }]);
  assert.equal(readSeenVersions('u1').p, 4);
  assert.deepEqual(readSeenVersions('u2'), {});
});

test('Diff-Zeilen zwischen gesehener und aktueller Version', () => {
  const snap = (n) => ({ name: 'X', description: '', totalWeeks: n, routines: [] });
  const lines = updateLines([{ number: 1, snapshot: snap(4) }, { number: 2, snapshot: snap(6) }], 1, 2, diffSnapshots);
  assert.ok(lines.some((l) => l.includes('4 → 6')));
  assert.deepEqual(updateLines([{ number: 2, snapshot: snap(6) }], 1, 2, diffSnapshots), []);
});
