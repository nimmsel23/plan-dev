import test from 'node:test';
import assert from 'node:assert/strict';
import { occurrences, openOccurrences, openByRoutine } from '../../src/views/Plan/lib/occurrences.js';
import { weekOverview } from '../../src/views/Plan/lib/weekOverview.js';
import { normFeedback, effortLabel } from '../../src/views/Plan/lib/workoutFeedback.js';

const plan = { routines: [
  { id: 'a', label: 'Push', weekdays: [0, 3], exercises: [{}] },
  { id: 'b', label: 'Pull', weekdays: [1, 4], exercises: [{}] },
] };
// Mittwoch, 21.10.2026 (lokal)
const now = new Date(2026, 9, 21, 12, 0, 0);
const fin = (routineId, d) => ({ id: routineId + d, sourcePlanRoutineId: routineId, finished_at: new Date(2026, 9, d, 18).toISOString() });

test('Wochenübersicht: erledigt, überfällig, kommend', () => {
  const w = weekOverview(plan, [fin('a', 19)], now);
  assert.equal(w.planned, 4);
  assert.equal(w.done, 1);
  assert.equal(w.overdue, 1); // Pull war für Di geplant, heute (Mi) noch möglich
  assert.equal(w.days[0].entries[0].status, 'done');
  assert.equal(w.days[1].entries[0].status, 'overdue');
  assert.equal(w.days[3].entries[0].status, 'scheduled'); // Do: ab Vortag möglich
  assert.equal(w.days[4].entries[0].status, 'upcoming');
  assert.equal(w.days[2].isToday, true);
});

test('Ohne Abschluss: Mo und Di bleiben offen (überfällig), es gibt kein verpasst', () => {
  const w = weekOverview(plan, [], now);
  assert.equal(w.days[0].entries[0].status, 'overdue');
  assert.equal(w.overdue, 2);
  assert.equal(w.missed, undefined);
});

test('Erledigt zählt im ±1-Tag-Fenster und nur beendet', () => {
  const w = weekOverview(plan, [fin('a', 17), { ...fin('b', 20), finished_at: null }], now);
  assert.equal(w.done, 0);
  assert.equal(w.days[0].entries[0].status, 'overdue');
  assert.equal(w.days[1].entries[0].status, 'overdue');
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

test('Fenster ±24 h: ab Sonntag möglich, Montag fällig, danach offen (überfällig)', () => {
  const ppl = [{ id: 'A', label: 'Push', weekdays: [0], exercises: [{}] }];
  const since = new Date(2026, 9, 18); // Plan seit So 18.10. veröffentlicht
  const st = (d, ws = []) => openOccurrences(ppl, ws, new Date(2026, 9, d, 10), { since }).map((o) => o.status);
  assert.deepEqual(st(18), ['scheduled']); // So 18.10. → Mo 19.10. ab jetzt möglich
  assert.deepEqual(st(19), ['due']);
  assert.deepEqual(st(20), ['overdue']);
  assert.deepEqual(st(21), ['overdue']); // Mi: bleibt offen
  assert.deepEqual(st(18, [fin('A', 18)]), []); // am Sonntag erledigt zählt für Montag
  assert.deepEqual(st(19, [fin('A', 18)]), []);
  assert.deepEqual(st(24), ['overdue']); // Sa: Mo 19. bleibt offen
  assert.deepEqual(st(24, [fin('A', 22)]), []); // Do-Zusatztraining holt Mo 19. nach
});

test('Ein Abschluss belegt nur ein Vorkommen; überlappende Fenster', () => {
  const two = [{ id: 'A', label: 'Push', weekdays: [0, 1], exercises: [{}] }]; // Mo + Di
  const occ = occurrences(two, [fin('A', 20)], new Date(2026, 9, 19), new Date(2026, 9, 20), new Date(2026, 9, 20, 10));
  assert.deepEqual(occ.map((o) => o.status), ['done', 'due']); // Di-Abschluss deckt nur Montag, Dienstag bleibt fällig
});

test('Überfällig vor fällig vor ab jetzt möglich', () => {
  const rs = [
    { id: 'A', label: 'A', weekdays: [1], exercises: [{}] }, // Di
    { id: 'B', label: 'B', weekdays: [2], exercises: [{}] }, // Mi
    { id: 'C', label: 'C', weekdays: [3], exercises: [{}] }, // Do
  ];
  const o = openOccurrences(rs, [], new Date(2026, 9, 21, 9), { since: new Date(2026, 9, 20) });
  assert.deepEqual(o.map((x) => x.routine.id + ':' + x.status), ['A:overdue', 'B:due', 'C:scheduled']);
});

test('Offenes bleibt offen; Zusatztraining holt es nach', () => {
  const ppl = [{ id: 'A', label: 'Push', weekdays: [0], exercises: [{}] }];
  const thu = new Date(2026, 9, 22, 10);
  assert.deepEqual(openOccurrences(ppl, [], thu, { since: new Date(2026, 9, 18) }).map((o) => o.key + ':' + o.status), ['2026-10-19:overdue']);
  assert.equal(openOccurrences(ppl, [fin('A', 22)], thu, { since: new Date(2026, 9, 18) }).length, 0); // Nachholen am Do erfüllt das offene Mo
  assert.equal(openByRoutine(ppl, [], new Date(2026, 10, 3, 10)).length, 1); // mehrere offene Wochen → ein Eintrag je Einheit
});
