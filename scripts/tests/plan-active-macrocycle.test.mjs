import test from 'node:test';
import assert from 'node:assert/strict';
import { pickActiveMacrocycle } from '../../src/views/Plan/lib/activeMacrocycle.js';

test('leere Liste liefert null', () => {
  assert.equal(pickActiveMacrocycle([]), null);
  assert.equal(pickActiveMacrocycle(null), null);
});
test('ohne veröffentlichte Pläne gewinnt der erste der Liste', () => {
  assert.equal(pickActiveMacrocycle([{ id: 'neu' }, { id: 'alt' }]).id, 'neu');
});
test('veröffentlichter Plan schlägt neueren Entwurf', () => {
  const list = [{ id: 'entwurf', status: 'draft', createdAt: '2026-11-05T10:00:00Z' }, { id: 'live', status: 'published', publishedAt: '2026-10-01T10:00:00Z' }];
  assert.equal(pickActiveMacrocycle(list).id, 'live');
});
test('unter mehreren veröffentlichten gewinnt der zuletzt zugestellte', () => {
  const list = [
    { id: 'a', status: 'published', publishedAt: '2026-09-01T00:00:00Z', createdAt: '2026-11-01T00:00:00Z' },
    { id: 'b', status: 'published', publishedAt: '2026-11-03T00:00:00Z', createdAt: '2026-08-01T00:00:00Z' },
  ];
  assert.equal(pickActiveMacrocycle(list).id, 'b');
});
