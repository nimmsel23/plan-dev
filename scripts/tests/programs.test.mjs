import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
const fakeUrl = new URL('./firestore-double.mjs', import.meta.url).href;
const macrosUrl = new URL('../../src/lib/db/firestore/macrocycles.js', import.meta.url).href;
const routinesUrl = new URL('../../src/lib/db/firestore/routines.js', import.meta.url).href;
const barrel = `export * from ${JSON.stringify(macrosUrl)}; export {createRoutine, getRoutine, listRoutines, updateRoutine as updateWorkoutRoutine, deleteRoutine as deleteWorkoutRoutine} from ${JSON.stringify(routinesUrl)};`;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'firebase/firestore' || specifier.endsWith('/offline.js')) return { url: fakeUrl, shortCircuit: true };
  if (specifier === '@cloud/firebase.js' || specifier.endsWith('/firebase.js')) return { url: 'data:text/javascript,export const db = {};', shortCircuit: true };
  if (specifier === '@db') return { url: `data:text/javascript,${encodeURIComponent(barrel)}`, shortCircuit: true };
  if (specifier === './core.js') return { url: 'data:text/javascript,export const getUid = () => "coach";', shortCircuit: true };
  return next(specifier, context);
} });
const macros = await import(macrosUrl);
const routines = await import(routinesUrl);
const store = await import('../../src/views/Plan/lib/programStore.js');
const fake = await import(fakeUrl);
const ex = { exercise_id: 'bench', name: 'Bench', instructions: ['Control'], rest_seconds: 0, notes: 'Cue', templateSets: [{ targetReps: '8-12', targetWeight: 60, targetDuration: null }] };

test('Coach assignment creates client exercises as documents and keeps published snapshots independent', async () => {
  const template = await routines.createRoutine({ name: 'Push' }, 'coach');
  await routines.addRoutineExercise(template.id, ex, 'coach');
  const program = await store.saveCoachProgram('coach', { name: 'Strength', durationWeeks: 8, workouts: [{ templateId: template.id, label: 'Push', weekdays: [0] }] });
  const version = await store.publishCoachProgram('coach', program);
  const id = await store.assignCoachProgram({ coachUid: 'coach', clientUid: 'client', program: { ...program, headVersion: version.number } });
  const plan = (await macros.getMacrocycle('client', id)).macrocycle;
  const assigned = (await routines.getRoutine(plan.routines[0].sourceTemplateId, 'client')).routine;
  assert.equal(assigned.exercises.length, 1, 'Client template must be usable independently of plan snapshot');
  assert.equal(assigned.exercises[0].rest_seconds, 0);
  assert.deepEqual(assigned.exercises[0].templateSets, ex.templateSets);
  assert.equal(plan.published.routines[0].exercises[0].notes, 'Cue');
  assert.equal((await macros.listMacrocycles('coach')).length, 0);
  await macros.updateMacrocycle('client', id, { name: 'Private edit' });
  assert.equal((await macros.getMacrocycle('client', id)).macrocycle.published.name, 'Strength');
  const before = [...fake.records.keys()];
  fake.failCommit();
  await assert.rejects(store.assignCoachProgram({ coachUid: 'coach', clientUid: 'other', program: { ...program, headVersion: version.number } }), /denied/);
  assert.deepEqual([...fake.records.keys()], before, 'Failed assignment must clean up its client data');
});


const { programToPlan, planToProgram } = await import('../../src/views/Plan/lib/programDraft.js');
test('legacy programs hydrate once; inline edits survive publication and assignment', async () => {
  let loads = 0;
  const legacy = { name: 'Legacy', goal: 'Strength', durationWeeks: 6, workouts: [{ templateId: 't', label: 'A' }] };
  const draft = await programToPlan(legacy, async () => { loads++; return { exercises: [ex] }; });
  assert.equal(loads, 1);
  const converted = planToProgram(legacy, draft);
  assert.equal(converted.goal, 'Strength');
  await programToPlan(converted, async () => { throw new Error('Must not reload mutable source'); });
  const saved = await store.saveCoachProgram('coach', converted);
  const version = await store.publishCoachProgram('coach', saved);
  assert.equal(version.snapshot.workouts[0].exercises[0].notes, 'Cue');
  const assigned = await store.assignCoachProgram({ coachUid: 'coach', clientUid: 'inline-client', program: { ...saved, headVersion: 1 } });
  assert.equal((await macros.getMacrocycle('inline-client', assigned)).macrocycle.published.name, 'Legacy');
  await assert.rejects(store.saveCoachProgram('coach', { ...saved, expectedUpdatedAt: 'stale' }), /inzwischen/);
  const edited = await store.saveCoachProgram('coach', { ...saved, expectedUpdatedAt: saved.updatedAt, description: 'Edited' });
  assert.equal('expectedUpdatedAt' in edited, false);
  await store.saveCoachProgram('coach', edited);
  assert.equal((await store.publishCoachProgram('coach', edited)).number, 2);
});

const { importClientForge } = await import('../../src/views/Plan/lib/legacyPlan.js');
test('ClientForge import preserves seconds, minutes, zero rests and original source', () => {
  const source = { einheiten: [{ name: 'A', abschnitte: [{ übungen: [
    { name: 'One', pause: '60s', gewicht: '', sätze: 2, wdh: '10–12' },
    { name: 'Two', pause: '1,5min', gewicht: 'BW', sätze: 1 },
    { name: 'Three', pause: 0, gewicht: '12,5', sätze: 1 },
  ] }] }] };
  const before = JSON.stringify(source);
  const exercises = importClientForge(source).routines[0].exercises;
  assert.deepEqual(exercises.map((ex) => ex.rest_seconds), [60,90,0]);
  assert.equal(exercises[0].templateSets[0].targetWeight, null);
  assert.equal(exercises[2].templateSets[0].targetWeight, 12.5);
  assert.equal(JSON.stringify(source), before);
});

const { ensureTemplateSets } = await import('../../src/views/Plan/lib/templateSets.js');
test('incomplete source prescriptions never acquire default sets or repetitions', () => {
  assert.deepEqual(ensureTemplateSets({ prescriptionIncomplete: true, target_reps: '15–20' }), []);
  assert.equal(ensureTemplateSets({ target_sets: 5, target_reps: '5' }).length, 5);
});
