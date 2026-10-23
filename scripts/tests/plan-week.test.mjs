import test from 'node:test';
import assert from 'node:assert/strict';
import { weekOverview } from '../../src/views/Plan/lib/weekOverview.js';
import { normFeedback, effortLabel } from '../../src/views/Plan/lib/workoutFeedback.js';

const plan = { routines: [
  { id: 'a', label: 'Push', weekdays: [0, 3], exercises: [{}] },
  { id: 'b', label: 'Pull', weekdays: [1, 4], exercises: [{}] },
] };
// Mittwoch, 21.10.2026 (lokal)
const now = new Date(2026, 9, 21, 12, 0, 0);
const fin = (routineId, d) => ({ id: routineId + d, sourcePlanRoutineId: routineId, finished_at: new Date(2026, 9, d, 18).toISOString() });

test('Wochenübersicht: erledigt, verpasst, offen, kommend', () => {
  const w = weekOverview(plan, [fin('a', 19)], now);
  assert.equal(w.planned, 4);
  assert.equal(w.done, 1);
  assert.equal(w.missed, 1); // Pull am Di nicht gemacht
  assert.equal(w.days[0].entries[0].status, 'done');
  assert.equal(w.days[1].entries[0].status, 'missed');
  assert.equal(w.days[3].entries[0].status, 'upcoming');
  assert.equal(w.days[2].isToday, true);
});

test('Erledigt zählt nur am geplanten Tag und nur beendet', () => {
  const w = weekOverview(plan, [fin('a', 20), { ...fin('b', 20), finished_at: null }], now);
  assert.equal(w.done, 0);
  assert.equal(w.missed, 2);
});

test('Wochenstart ist Montag, auch über Monatsgrenze', () => {
  const sun = new Date(2026, 10, 1, 9); // So 1.11.2026
  const w = weekOverview(plan, [], sun);
  assert.equal(w.days[0].key, '2026-10-26');
  assert.equal(w.days[6].key, '2026-11-01');
});

test('Feedback normalisieren', () => {
  assert.equal(normFeedback({}), null);
  assert.equal(normFeedback({ effort: 11 }), null);
  assert.equal(normFeedback({ effort: '7.4', note: '  ok ' }).effort, 7);
  assert.equal(normFeedback({ note: 'x'.repeat(2000) }).note.length, 1000);
  assert.equal(effortLabel(8), 'fordernd');
});
