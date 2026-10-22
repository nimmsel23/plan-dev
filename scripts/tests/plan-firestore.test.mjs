import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const fakeUrl = new URL('./firestore-double.mjs', import.meta.url).href;
const macroUrl = new URL('../../src/lib/db/firestore/macrocycles.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'firebase/firestore') return { url: fakeUrl, shortCircuit: true };
  if (specifier.endsWith('/firebase.js')) return { url: 'data:text/javascript,export const db = {};', shortCircuit: true };
  if (specifier === '@db') return { url: macroUrl, shortCircuit: true };
  if (specifier === './core.js') return { url: 'data:text/javascript,export const getUid = () => "coach";', shortCircuit: true };
  return next(specifier, context);
} });
const routines = await import('../../src/lib/db/firestore/routines.js');
const workouts = await import('../../src/lib/db/firestore/workouts.js');
const macros = await import('../../src/lib/db/firestore/macrocycles.js');
const fake = await import(fakeUrl);
const { copyPlanToClient } = await import('../../src/views/Plan/lib/copyPlan.js');

test('coach edits the chosen client; plan snapshot becomes independent normal workout', async () => {
  const { id } = await routines.createRoutine({ name: 'Push A' }, 'client');
  const ex = { exercise_id: 'yuhonas_bench', name: 'Bench', yuhonas_id: 'Barbell_Bench_Press_-_Medium_Grip', notes: 'Coach cue', instructions: ['Control the bar.'], rest_seconds: 0, templateSets: [{ targetReps: '8-12', targetWeight: 60 }] };
  await routines.addRoutineExercise(id, ex, 'client');
  await routines.updateRoutine(id, { name: 'Push B' }, 'client');
  assert.equal((await routines.listRoutines()).routines.length, 0);
  assert.equal((await routines.listRoutines('client')).routines.length, 1);
  const { routine } = await routines.getRoutine(id, 'client');
  assert.equal(routine.name, 'Push B');
  const plan = await macros.createMacrocycle('client', { name: 'PPL', coachUid: 'coach', status: 'draft' });
  await assert.rejects(macros.publishMacrocycle('client', plan.id));
  const updated = await macros.addRoutine('client', plan.id, { label: routine.name, sourceTemplateId: id, targetCount: 1, targetPeriodDays: 7, exercises: routine.exercises });
  const published = await macros.publishMacrocycle('client', plan.id);
  assert.equal(published.status, 'published');
  assert.equal(published.headVersion, 1);
  assert.equal(published.published.routines[0].exercises.length, 1);
  await assert.rejects(macros.publishMacrocycle('client', plan.id), /Keine Änderungen/);
  await macros.updateMacrocycle('client', plan.id, { description: 'Neu' });
  const v2 = await macros.publishMacrocycle('client', plan.id, { message: 'Hinweis ergänzt' });
  assert.equal(v2.headVersion, 2);
  assert.equal(v2.headMessage, 'Hinweis ergänzt');
  assert.deepEqual((await macros.listPlanVersions('client', plan.id)).map((v) => v.id), ['v1', 'v2']);
  const restored = await macros.restorePlanVersion('client', plan.id, 'v1');
  assert.equal(restored.description, '');
  assert.equal(restored.published.description, 'Neu');
  const created = await workouts.createWorkout({ routine_id: id, sourcePlanId: plan.id, routine_snapshot: { name: routine.name, exercises: updated.routines[0].exercises } }, 'client');
  await routines.updateRoutineExercise(id, routine.exercises[0].id, { name: 'Changed afterwards' }, 'client');
  const { workout } = await workouts.getWorkout(created.id, 'client');
  assert.equal(workout.exercises[0].name, 'Bench');
  assert.equal(workout.exercises[0].notes, 'Coach cue');
  assert.equal(workout.exercises[0].rest_seconds, 0);
  assert.deepEqual(workout.exercises[0].instructions, ['Control the bar.']);
  assert.equal(workout.sourcePlanId, plan.id);
  assert.equal(workout.exercises[0].sets[0].completed, false);
  assert.equal(workout.exercises[0].sets[0].reps, null);
  fake.failCommit();
  await assert.rejects(workouts.updateWorkout(created.id, { finished_at: '2026-10-16', exercises: workout.exercises, eventLog: [{ reps: 8 }] }, 'client'), /denied/);
  assert.equal((await workouts.getWorkout(created.id, 'client')).workout.finished_at, null);
  await workouts.updateWorkout(created.id, { finished_at: '2026-10-16', exercises: workout.exercises, eventLog: [{ reps: 8 }] }, 'client');
  assert.equal((await workouts.listWorkouts('client')).workouts[0].eventLog[0].reps, 8);
  await routines.updateRoutine(id, { exercises: [{ ...ex, name: 'Replacement' }] }, 'client');
  assert.equal((await routines.getRoutine(id, 'client')).routine.exercises.length, 1);
  assert.equal((await routines.getRoutine(id, 'client')).routine.exercises[0].name, 'Replacement');
});

const ex = (id) => ({ exercise_id: id, name: id, templateSets: [{ targetReps: '8', targetWeight: 50 }] });
const planKeys = () => [...fake.records.keys()].filter((k) => /^fitness\/[^/]+\/macrocycles\/[^/]+$/.test(k));
async function readyPlan(uid = 'p1', extra = {}) {
  const plan = await macros.createMacrocycle(uid, { name: 'Plan', coachUid: 'coach', ...extra });
  await macros.addRoutine(uid, plan.id, { label: 'A', exercises: [ex('a')], weekdays: [3, 1, 1, 9, 'x'] });
  return plan;
}

test('createMacrocycle defaults to draft; weekdays are normalized', async () => {
  const plan = await readyPlan();
  assert.equal(plan.status, 'draft');
  assert.deepEqual((await macros.getMacrocycle('p1', plan.id)).macrocycle.routines[0].weekdays, [1, 3]);
});

test('parallel publishes never reuse a version number', async () => {
  const plan = await readyPlan('p2');
  const first = await Promise.allSettled([macros.publishMacrocycle('p2', plan.id), macros.publishMacrocycle('p2', plan.id)]);
  assert.equal(first.filter((r) => r.status === 'fulfilled').length, 1);
  assert.match(first.find((r) => r.status === 'rejected').reason.message, /Keine Änderungen/);
  assert.deepEqual((await macros.listPlanVersions('p2', plan.id)).map((v) => v.id), ['v1']);
  await macros.updateMacrocycle('p2', plan.id, { description: 'Neu' });
  const second = await Promise.allSettled([macros.publishMacrocycle('p2', plan.id, { message: 'x' }), macros.publishMacrocycle('p2', plan.id, { message: 'y' })]);
  assert.equal(second.filter((r) => r.status === 'fulfilled').length, 1);
  const versions = await macros.listPlanVersions('p2', plan.id);
  assert.deepEqual(versions.map((v) => v.id), ['v1', 'v2']);
  assert.equal((await macros.getMacrocycle('p2', plan.id)).macrocycle.headVersion, 2);
});

test('existing version document is never overwritten', async () => {
  const plan = await readyPlan('p3');
  fake.records.set(`fitness/p3/macrocycles/${plan.id}/versions/v1`, { id: 'v1', number: 1, message: 'alt', snapshot: {} });
  await assert.rejects(macros.publishMacrocycle('p3', plan.id), /existiert bereits/);
  assert.equal(fake.records.get(`fitness/p3/macrocycles/${plan.id}/versions/v1`).message, 'alt');
  assert.equal((await macros.getMacrocycle('p3', plan.id)).macrocycle.status, 'draft');
});

test('legacy plan without published snapshot becomes v1', async () => {
  const plan = await readyPlan('p4');
  fake.records.set(`fitness/p4/macrocycles/${plan.id}`, { ...fake.records.get(`fitness/p4/macrocycles/${plan.id}`), status: 'published' });
  const out = await macros.publishMacrocycle('p4', plan.id);
  assert.equal(out.headVersion, 1);
  assert.equal(out.published.routines.length, 1);
});

test('name, description and status in one update land in the snapshot', async () => {
  const plan = await readyPlan('p5');
  const out = await macros.updateMacrocycle('p5', plan.id, { name: ' Neuer Name ', description: 'Hinweis', status: 'published', message: 7 });
  assert.equal(out.published.name, 'Neuer Name');
  assert.equal(out.published.description, 'Hinweis');
  assert.equal(out.headMessage, 'Erste Version');
  await assert.rejects(macros.updateMacrocycle('p5', plan.id, { name: '  ' }), /Name erforderlich/);
});

test('concurrent routine edits do not lose each other', async () => {
  const plan = await macros.createMacrocycle('p6', { name: 'P', coachUid: 'coach' });
  await Promise.all(['A', 'B', 'C'].map((label) => macros.addRoutine('p6', plan.id, { label, exercises: [ex(label)] })));
  assert.equal((await macros.getMacrocycle('p6', plan.id)).macrocycle.routines.length, 3);
});

test('stale writes keep published state', async () => {
  const plan = await readyPlan('p7');
  await macros.publishMacrocycle('p7', plan.id);
  const [a, b] = await Promise.all([macros.updateMacrocycle('p7', plan.id, { description: 'x' }), macros.addRoutine('p7', plan.id, { label: 'B', exercises: [ex('b')] })]);
  const m = (await macros.getMacrocycle('p7', plan.id)).macrocycle;
  assert.equal(m.headVersion, 1);
  assert.equal(m.status, 'published');
  assert.equal(m.published.routines.length, 1);
  assert.equal(m.routines.length, 2);
  assert.equal(m.description, 'x');
});

test('restore of unknown version fails without changes', async () => {
  const plan = await readyPlan('p8');
  const before = structuredClone(fake.records.get(`fitness/p8/macrocycles/${plan.id}`));
  await assert.rejects(macros.restorePlanVersion('p8', plan.id, 'v9'), /Version nicht gefunden/);
  assert.deepEqual(fake.records.get(`fitness/p8/macrocycles/${plan.id}`), before);
});

test('list hides published and counts the published routines', async () => {
  const plan = await readyPlan('p9');
  await macros.publishMacrocycle('p9', plan.id);
  await macros.addRoutine('p9', plan.id, { label: 'B', exercises: [ex('b')] });
  const [entry] = await macros.listMacrocycles('p9');
  assert.equal('published' in entry, false);
  assert.equal('routines' in entry, false);
  assert.equal(entry.routineCount, 1);
  assert.equal(entry.workingRoutineCount, 2);
  assert.equal(entry.headVersion, 1);
});

test('delete removes versions and completions', async () => {
  const plan = await readyPlan('p10');
  await macros.publishMacrocycle('p10', plan.id);
  await macros.completeRoutine('p10', plan.id, 'x', []);
  assert.equal(await macros.deleteMacrocycle('p10', plan.id), true);
  assert.deepEqual([...fake.records.keys()].filter((k) => k.startsWith('fitness/p10/')), []);
});

test('copyPlan writes plan and routines atomically as a draft', async () => {
  const src = await readyPlan('src', { totalWeeks: 8, description: 'Hinweis' });
  await macros.publishMacrocycle('src', src.id);
  await macros.addRoutine('src', src.id, { label: 'B', sourceTemplateId: 'tpl', exercises: [ex('b')], targetCount: 2, targetPeriodDays: 7 });
  const out = await copyPlanToClient({ fromUid: 'src', planId: src.id, toUid: 'dst', coachUid: 'coach' });
  assert.equal(out.fromWorkingCopy, true);
  assert.equal(out.hadUnpublished, true);
  const copy = (await macros.getMacrocycle('dst', out.plan.id)).macrocycle;
  assert.equal(copy.status, 'draft');
  assert.equal(copy.description, 'Hinweis');
  assert.equal(copy.published, undefined);
  assert.equal(copy.headVersion, undefined);
  assert.equal(copy.routines.length, 2);
  assert.equal(copy.routines[1].sourceTemplateId, null);
  assert.equal(copy.routines[1].targetCount, 2);
  assert.deepEqual(copy.routines[0].weekdays, [1, 3]);
  assert.notEqual(copy.routines[0].id, (await macros.getMacrocycle('src', src.id)).macrocycle.routines[0].id);
  assert.equal(copy.routines[0].exercises.length, 1);
});

test('copyPlan failure leaves no half-copied plan', async () => {
  const src = await readyPlan('src2');
  fake.failSet();
  await assert.rejects(copyPlanToClient({ fromUid: 'src2', planId: src.id, toUid: 'dst2', coachUid: 'coach' }), /Kopie konnte nicht angelegt werden/);
  assert.deepEqual([...fake.records.keys()].filter((k) => k.startsWith('fitness/dst2/')), []);
  await assert.rejects(copyPlanToClient({ fromUid: 'src2', planId: 'missing', toUid: 'dst2', coachUid: 'coach' }), /Quellplan/);
});
