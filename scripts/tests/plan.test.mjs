import test from 'node:test';
import assert from 'node:assert/strict';
import { YUHONAS_EXERCISES, filterCatalog, mergeCatalog } from '../../src/views/Plan/lib/catalog.js';
import { assignedWorkoutBody } from '../../src/views/Plan/lib/assignedWorkout.js';
import { completedSetPatch } from '../../src/views/Plan/lib/completedSet.js';
import { createWorkoutDraft } from '../../src/views/Plan/lib/workoutDraft.js';
import { toggleWeekday, weekGrid, weekdayIndex, todaysOpenRoutines } from '../../src/views/Plan/lib/weekSchedule.js';
import { unseenCoachPlans } from '../../src/views/Plan/lib/newPlans.js';
import { snapshotOf, clientView, hasUnpublishedChanges, diffSnapshots } from '../../src/views/Plan/lib/planVersions.js';
import { workoutTemplateExercises } from '../../src/views/Plan/lib/workoutTemplate.js';

test('Yuhonas catalog retains source IDs, instructions and bodyweight tracking', () => {
  assert.equal(YUHONAS_EXERCISES.length, 873);
  assert.equal(new Set(YUHONAS_EXERCISES.map((e) => e.id)).size, 873);
  const ex = YUHONAS_EXERCISES.find((e) => e.yuhonas_id === '3_4_Sit-Up');
  assert.equal(ex.id, 'yuhonas_3_4_sit-up');
  assert.equal(ex.trackingType, 'bodyweight_reps');
  assert.ok(ex.instructions.length > 0);
  assert.ok(filterCatalog(YUHONAS_EXERCISES, { q: 'barbell bench', equipment: 'barbell' }).length);
  const merged = mergeCatalog([{ exercise_id: 'expert-bench', yuhonas_id: ex.yuhonas_id, display_name: 'Kuratiert' }]);
  assert.equal(merged.filter((e) => e.yuhonas_id === ex.yuhonas_id).length, 1);
  const expert = merged.find((e) => e.yuhonas_id === ex.yuhonas_id);
  assert.equal(expert.id, 'expert-bench');
  assert.deepEqual(expert.instructions, ex.instructions);
  assert.deepEqual(expert.equipment, ex.equipment);
});
test('legacy coach assignment becomes a snapshot with prescribed sets and source linkage', () => {
  const ex = YUHONAS_EXERCISES[0];
  const body = assignedWorkoutBody({ id: 'assignment', name: 'Core', exercises: [{ exercise_id: ex.id, sets: 2, reps: '12', weight: '' }] });
  assert.equal(body.sourceAssignmentId, 'assignment');
  assert.equal(body.routine_snapshot.exercises[0].templateSets.length, 2);
  assert.equal(body.routine_snapshot.exercises[0].templateSets[0].targetWeight, null);
  assert.equal(body.routine_snapshot.exercises[0].yuhonas_id, ex.yuhonas_id);
  assert.throws(() => assignedWorkoutBody({ exercises: [] }));
});
test('completion cannot turn target ranges or missing performance into measured reps', () => {
  assert.throws(() => completedSetPatch({ ghostReps: '8-12', ghostWeight: 40 }, 'weight_reps'));
  assert.throws(() => completedSetPatch({ reps: -2, weight: 40 }, 'weight_reps'));
  assert.throws(() => completedSetPatch({ reps: 8 }, 'weight_reps'));
  assert.deepEqual(completedSetPatch({ reps: 8, weight: 0 }, 'weight_reps'), { completed: true, reps: 8, weight: 0 });
  assert.deepEqual(completedSetPatch({ reps: 12 }, 'bodyweight_reps'), { completed: true, reps: 12 });
  assert.deepEqual(completedSetPatch({ duration: 30 }, 'duration'), { completed: true, duration: 30 });
});
test('draft survives failed remote writes and clears only after a successful retry', async () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k,v), removeItem: (k) => data.delete(k) };
  let fail = true;
  const writer = createWorkoutDraft({ key: 'client:workout', storage, write: async () => { if (fail) throw new Error('offline'); } });
  writer.stage([{ sets: [{ reps: 8 }] }]);
  await assert.rejects(writer.flush(), /offline/);
  assert.equal(writer.read()[0].sets[0].reps, 8);
  fail = false;
  await writer.flush();
  assert.equal(writer.read(), null);
});
test('older write acknowledgement cannot erase newer edits', async () => {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k,v), removeItem: (k) => data.delete(k) };
  const writes = [];
  let release;
  const firstWrite = new Promise((resolve) => { release = resolve; });
  const writer = createWorkoutDraft({ key: 'test', storage, write: async (snapshot) => { writes.push(snapshot); if (writes.length === 1) await firstWrite; } });
  writer.stage([{ reps: 8 }]); const first = writer.save();
  await new Promise((r) => setImmediate(r));
  writer.stage([{ reps: 10 }]);
  release(); await first;
  assert.equal(writer.read()[0].reps, 10);
  await writer.flush();
  assert.deepEqual(writes.map((w) => w[0].reps), [8, 10]);
});
test('workout-to-template conversion keeps values as targets and leaves history untouched', () => {
  const workout = { exercises: [{ exercise_id: 'yuhonas_bench', name: 'Bench', rest_seconds: 0, sets: [{ reps: 10, weight: 60, completed: true }] }] };
  const copy = structuredClone(workout);
  const result = workoutTemplateExercises(workout);
  assert.equal(result[0].templateSets[0].targetWeight, 60);
  assert.equal(result[0].rest_seconds, 0);
  assert.equal(result[0].templateSets[0].completed, undefined);
  assert.deepEqual(workout, copy);
});
test('weekly schedule: toggle, grid and open routines for today', () => {
  assert.deepEqual(toggleWeekday([4, 0], 2), [0, 2, 4]);
  assert.deepEqual(toggleWeekday([0, 2], 0), [2]);
  const wed = new Date(2026, 9, 21, 15); // Mittwoch
  assert.equal(weekdayIndex(wed), 2);
  assert.equal(weekdayIndex(new Date(2026, 9, 25)), 6);
  const routines = [{ id: 'a', label: 'Push', weekdays: [0, 2], sourceTemplateId: 't1' }, { id: 'b', label: 'Pull', weekdays: [1] }, { id: 'c', label: 'Legs' }];
  assert.deepEqual(weekGrid(routines)[2].routines.map((r) => r.id), ['a']);
  assert.deepEqual(todaysOpenRoutines(routines, [], wed).map((r) => r.id), ['a']);
  const done = [{ finished_at: new Date(2026, 9, 21, 9).toISOString(), routine_id: 't1' }];
  assert.deepEqual(todaysOpenRoutines(routines, done, wed), []);
  const yesterday = [{ finished_at: new Date(2026, 9, 20, 9).toISOString(), sourcePlanRoutineId: 'a' }];
  assert.equal(todaysOpenRoutines(routines, yesterday, wed).length, 1);
});
test('unseen coach plans: only published, foreign, changed since last seen', () => {
  const plans = [
    { id: 'a', coachUid: 'coach', status: 'published', publishedAt: 't1' },
    { id: 'b', coachUid: 'coach', status: 'draft', publishedAt: 't1' },
    { id: 'c', coachUid: 'me', status: 'published', publishedAt: 't1' },
    { id: 'd', coachUid: 'coach', status: 'published' },
    { id: 'e', coachUid: 'coach', status: 'published', publishedAt: 't2' },
  ];
  assert.deepEqual(unseenCoachPlans(plans, 'me', {}).map((p) => p.id), ['a', 'e']);
  assert.deepEqual(unseenCoachPlans(plans, 'me', { a: 't1', e: 'old' }).map((p) => p.id), ['e']);
});

test('plan versions: client sees the published snapshot, diff lists readable changes', () => {
  const ex = (n, reps) => ({ exercise_id: n, name: n, templateSets: [{ targetReps: reps, targetWeight: 60 }] });
  const v1 = snapshotOf({ name: 'PPL', description: '', routines: [{ id: 'r1', label: 'Push', weekdays: [2, 0], exercises: [ex('Bench', '8'), ex('Dips', '10')] }] });
  const working = { name: 'PPL', description: 'Technik', published: v1, routines: [
    { id: 'r1', label: 'Push', weekdays: [0, 2, 4], exercises: [ex('Bench', '6'), ex('Fly', '12')] },
    { id: 'r2', label: 'Pull', weekdays: [], exercises: [ex('Row', '8')] }] };
  assert.equal(clientView(working).description, '');
  assert.equal(clientView(working).routines.length, 1);
  assert.equal(hasUnpublishedChanges(working), true);
  assert.equal(hasUnpublishedChanges({ ...working, ...v1 }), false);
  const text = diffSnapshots(v1, snapshotOf(working)).map((l) => `${l.kind}:${l.text}`).join('\n');
  for (const part of ['add:Einheit „Pull“', 'add:„Push“: + Fly', 'remove:„Push“: − Dips', 'change:Coach-Hinweis', 'Tage Mo, Mi → Mo, Mi, Fr', 'Bench']) assert.ok(text.includes(part), part);
  assert.equal(diffSnapshots(null, v1).filter((l) => l.kind === 'add').length, 1);
});
