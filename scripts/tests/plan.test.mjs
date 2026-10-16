import test from 'node:test';
import assert from 'node:assert/strict';
import { YUHONAS_EXERCISES, filterCatalog, mergeCatalog } from '../../src/views/Plan/lib/catalog.js';
import { assignedWorkoutBody } from '../../src/views/Plan/lib/assignedWorkout.js';
import { completedSetPatch } from '../../src/views/Plan/lib/completedSet.js';
import { createWorkoutDraft } from '../../src/views/Plan/lib/workoutDraft.js';
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
