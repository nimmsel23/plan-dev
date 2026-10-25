import test from 'node:test';
import assert from 'node:assert/strict';
import { localDay, isFinished, matchesPlanRoutine, completionsInWindow, doneOnDay } from '../../src/views/Plan/lib/planProgress.js';
import { todaysOpenRoutines } from '../../src/views/Plan/lib/weekSchedule.js';
import { conflictsWithActive, targetKey } from '../../src/views/Plan/lib/startTarget.js';

const done = (extra) => ({ finished_at: new Date(2026, 9, 21, 9).toISOString(), sessionState: 'completed', ...extra });

test('localDay zählt in lokaler Zeit, nicht UTC', () => {
  assert.equal(localDay(new Date(2026, 9, 22, 0, 30)), '2026-10-22');
  assert.equal(localDay(new Date(2026, 9, 22, 23, 59)), '2026-10-22');
});

test('erledigt: laufende Workouts zählen nie, Plan-Einheit hat Vorrang vor Vorlage', () => {
  assert.equal(isFinished({ finished_at: 'x', sessionState: 'work' }), false);
  const a = { id: 'a', sourceTemplateId: 'T' };
  const b = { id: 'b', sourceTemplateId: 'T' };
  const w = done({ sourcePlanRoutineId: 'a', routine_id: 'T' });
  assert.equal(matchesPlanRoutine(a, w), true);
  assert.equal(matchesPlanRoutine(b, w), false); // gleiche Vorlage, andere Einheit
  assert.equal(matchesPlanRoutine({ id: 'c', sourceTemplateId: null }, done({ sourcePlanRoutineId: 'c' })), true); // Kopie ohne Vorlage
  assert.equal(matchesPlanRoutine({ id: 'c', sourceTemplateId: null }, done({ routine_id: null })), false);
});

test('Zeitraumziel zählt auch ohne Herkunfts-Vorlage', () => {
  const r = { id: 'c', sourceTemplateId: null };
  const now = new Date(2026, 9, 22, 12);
  const ws = [done({ sourcePlanRoutineId: 'c' }), done({ sourcePlanRoutineId: 'c', finished_at: new Date(2026, 8, 1).toISOString() })];
  assert.equal(completionsInWindow(r, ws, 7, now), 1);
});

test('heute offen: zwei Einheiten mit derselben Vorlage werden getrennt erledigt', () => {
  const wed = new Date(2026, 9, 21, 15);
  const rs = [{ id: 'a', label: 'A', sourceTemplateId: 'T', weekdays: [2] }, { id: 'b', label: 'B', sourceTemplateId: 'T', weekdays: [2] }];
  const ws = [done({ sourcePlanRoutineId: 'a', routine_id: 'T' })];
  assert.deepEqual(todaysOpenRoutines(rs, ws, wed).map((r) => r.id), ['b']);
  assert.equal(doneOnDay(rs[0], ws, wed), true);
});

test('Mitternachtsgrenze: Training gestern 23:50 ist heute wieder offen', () => {
  const rs = [{ id: 'a', label: 'A', weekdays: [2], sourceTemplateId: 'T' }];
  const ws = [done({ sourcePlanRoutineId: 'a', finished_at: new Date(2026, 9, 20, 23, 50).toISOString() })];
  assert.equal(todaysOpenRoutines(rs, ws, new Date(2026, 9, 21, 0, 10)).length, 1);
});

test('Startkonflikt: anderes Ziel fragt nach, gleiches setzt fort, frei+frei bleibt still', () => {
  const running = { id: 'w1', sourcePlanRoutineId: 'rt_push', routine_id: 'T1' };
  assert.equal(conflictsWithActive(running, { sourcePlanRoutineId: 'rt_push' }), false);
  assert.equal(conflictsWithActive(running, { sourcePlanRoutineId: 'rt_pull' }), true);
  assert.equal(conflictsWithActive(running, {}), true); // „Leeres Workout“ während Plan-Einheit läuft
  assert.equal(conflictsWithActive({ id: 'w2' }, {}), false);
  assert.equal(conflictsWithActive({ id: 'w2' }, { routine_snapshot: { exercises: [] }, name: 'X' }), true);
  assert.equal(targetKey({ sourceAssignmentId: 'as1' }), 'as1');
});
