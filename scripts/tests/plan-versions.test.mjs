import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotOf, sameSnapshot, clientView, hasUnpublishedChanges, diffSnapshots } from '../../src/views/Plan/lib/planVersions.js';
import { unseenCoachPlans } from '../../src/views/Plan/lib/newPlans.js';

const ex = (id, extra = {}) => ({ exercise_id: id, name: id.toUpperCase(), notes: '', rest_seconds: 90, templateSets: [{ setIndex: 1, setType: 'normal', targetReps: '8-12', targetWeight: null }, { setIndex: 2, setType: 'normal', targetReps: '8-12', targetWeight: 40 }], ...extra });
const routine = (id, extra = {}) => ({ id, label: id, weekdays: [0, 3], targetCount: 1, targetPeriodDays: 7, isDeload: false, restHoursAfter: 48, sourceTemplateId: `t-${id}`, exercises: [ex('a'), ex('b')], ...extra });
const plan = (extra = {}) => ({ id: 'p', name: 'Plan', description: 'Hinweis', totalWeeks: 8, routines: [routine('Push'), routine('Pull')], ...extra });
const clone = (x) => JSON.parse(JSON.stringify(x));

test('Property: sameSnapshot false => Diff nicht leer (zufällige Mutationen)', () => {
  let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const muts = [
    (p) => { p.name += 'x'; }, (p) => { p.description += 'x'; }, (p) => { p.totalWeeks += 1; },
    (p) => { p.routines[0].label += 'x'; }, (p) => { p.routines[0].isDeload = true; }, (p) => { p.routines[0].restHoursAfter = 12; },
    (p) => { p.routines[0].targetCount = 5; }, (p) => { p.routines[0].targetPeriodDays = 3; }, (p) => { p.routines[0].weekdays = [1]; },
    (p) => { p.routines[0].sourceTemplateId = 'neu'; }, (p) => { p.routines[0].custom = 1; }, (p) => { p.routines.reverse(); },
    (p) => { p.routines.pop(); }, (p) => { p.routines.push(routine('Legs')); },
    (p) => { p.routines[0].exercises.reverse(); }, (p) => { p.routines[0].exercises.pop(); }, (p) => { p.routines[0].exercises.push(ex('c')); },
    (p) => { p.routines[0].exercises[0].notes = 'neu'; }, (p) => { p.routines[0].exercises[0].rest_seconds = 30; },
    (p) => { p.routines[0].exercises[0].instructions = 'i'; }, (p) => { p.routines[0].exercises[0].name = 'Neu'; },
    (p) => { p.routines[0].exercises[0].templateSets[0].targetReps = '5'; }, (p) => { p.routines[0].exercises[0].templateSets[1].targetWeight = 50; },
    (p) => { p.routines[0].exercises[0].templateSets[0].setType = 'drop'; }, (p) => { p.routines[0].exercises[0].templateSets[0].targetDuration = 30; },
    (p) => { p.routines[0].exercises[0].templateSets.pop(); }, (p) => { delete p.routines[0].exercises[0].templateSets; },
  ];
  for (let i = 0; i < 400; i++) {
    const p = clone(plan());
    for (let k = 0; k <= rnd(3); k++) { try { muts[rnd(muts.length)](p); } catch { /* Vormutation entfernte das Ziel */ } }
    const a = snapshotOf(plan()); const b = snapshotOf(p);
    if (!sameSnapshot(a, b)) assert.ok(diffSnapshots(a, b).length > 0, JSON.stringify(p));
  }
  for (const m of muts) { const p = clone(plan()); m(p); if (!sameSnapshot(snapshotOf(plan()), snapshotOf(p))) assert.ok(diffSnapshots(plan(), p).length > 0, String(m)); }
});

test('Reihenfolge der Einheiten wird gemeldet, auch neben add/remove', () => {
  const sw = plan({ routines: [routine('Pull'), routine('Push')] });
  assert.ok(diffSnapshots(plan(), sw).some((l) => l.text === 'Reihenfolge der Einheiten geändert: Push, Pull → Pull, Push'));
  const mixed = plan({ routines: [routine('Pull'), routine('Push'), routine('Legs')] });
  const t = diffSnapshots(plan(), mixed).map((l) => l.text);
  assert.ok(t.some((x) => x.startsWith('Reihenfolge der Einheiten')) && t.some((x) => x.includes('Legs')));
});

test('Satz-, Einheiten- und Übungsfelder werden generisch erkannt', () => {
  const p = plan(); p.routines[0].exercises[0].templateSets[0].targetDuration = 45; p.routines[0].isDeload = true;
  const t = diffSnapshots(plan(), p).map((l) => l.text).join('\n');
  assert.match(t, /Satz 1/); assert.match(t, /Deload/);
  const q = plan(); q.routines[0].exercises[1].notes = 'x'; q.routines[0].exercises[1].rest_seconds = 10;
  assert.match(diffSnapshots(plan(), q).map((l) => l.text).join('\n'), /Hinweis, Pause geändert/);
});

test('doppelte Übungen / Übungen ohne ID werden per Vorkommen unterschieden', () => {
  const base = plan(); base.routines[0].exercises = [ex('a'), ex('a'), { name: 'Plank', templateSets: [] }, { name: 'Plank', templateSets: [] }];
  const chg = clone(base); chg.routines[0].exercises[1].notes = 'zweites'; chg.routines[0].exercises[3].templateSets = [{ targetReps: '30' }];
  const t = diffSnapshots(base, chg).map((l) => l.text);
  assert.equal(t.length, 2);
  const rem = clone(base); rem.routines[0].exercises.pop();
  assert.deepEqual(diffSnapshots(base, rem).map((l) => l.kind), ['remove']);
});

test('Legacy-Snapshot ohne targetCount ist keine Scheinänderung; ungültige Tage crashen nicht', () => {
  const old = clone(plan()); delete old.routines[0].targetCount; delete old.routines[0].targetPeriodDays;
  const now = clone(old); now.routines[0].targetCount = 0;
  assert.deepEqual(diffSnapshots(old, now), []);
  assert.equal(hasUnpublishedChanges({ ...now, published: old }), false);
  const odd = plan(); odd.routines[0].weekdays = [9, -1, 'x', 2, 2, null];
  assert.ok(Array.isArray(diffSnapshots(plan(), odd)));
});

test('clientView / hasUnpublishedChanges', () => {
  const pub = snapshotOf(plan());
  const work = { ...plan({ name: 'Neu' }), published: pub, headVersion: 1 };
  assert.equal(clientView(work).name, 'Plan');
  assert.equal(hasUnpublishedChanges(work), true);
  assert.equal(hasUnpublishedChanges({ ...plan(), published: pub }), false);
  assert.equal(hasUnpublishedChanges(plan()), false);
  assert.equal(clientView(plan()).name, 'Plan');
  const unsorted = plan(); unsorted.routines[0].weekdays = [3, 0];
  assert.equal(hasUnpublishedChanges({ ...unsorted, published: pub }), false);
});

test('unseenCoachPlans: eigener Plan (coachUid == eigene UID) erscheint nie', () => {
  const plans = [{ id: '1', status: 'published', coachUid: 'me', publishedAt: 't' }, { id: '2', status: 'published', coachUid: 'c', publishedAt: 't' }, { id: '3', status: 'draft', coachUid: 'c', publishedAt: 't' }];
  assert.deepEqual(unseenCoachPlans(plans, 'me', {}).map((p) => p.id), ['2']);
  assert.deepEqual(unseenCoachPlans(plans, 'me', { 2: 't' }), []);
});
