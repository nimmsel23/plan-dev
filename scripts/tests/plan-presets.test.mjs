import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_PRESETS, SET_SCHEMES, buildPresetDays, applySchemeToExercise, applySchemeToExercises } from '../../src/views/Plan/lib/planPresets.js';
import { completePrescription } from '../../src/views/Plan/lib/planReadiness.js';

test('Presets liefern Trainingstage mit je einem Wochentag, ohne Überschneidung', () => {
  for (const p of PLAN_PRESETS.filter((x) => x.id !== 'empty')) {
    const days = buildPresetDays(p.id);
    assert.ok(days.length >= 3, p.id);
    const weekdays = days.flatMap((d) => d.weekdays);
    assert.equal(new Set(weekdays).size, weekdays.length, `${p.id}: Wochentage doppelt`);
    assert.ok(weekdays.every((d) => d >= 0 && d <= 6));
    assert.ok(days.every((d) => d.label && d.exercises.length === 0 && d.targetCount === 1 && d.targetPeriodDays === 7));
  }
  assert.deepEqual(buildPresetDays('empty'), []);
  assert.deepEqual(buildPresetDays('unbekannt'), []);
});

test('Schema setzt Sätze und Wdh, behält Gewicht und Satz-Typ', () => {
  const ex = { name: 'Bankdrücken', trackingType: 'weight_reps', prescriptionIncomplete: true,
    templateSets: [{ setIndex: 1, setType: 'normal', targetReps: '', targetWeight: 60 }] };
  const out = applySchemeToExercise(ex, SET_SCHEMES.find((s) => s.id === '5x5'));
  assert.equal(out.templateSets.length, 5);
  assert.ok(out.templateSets.every((s) => s.targetReps === '5' && s.targetWeight === 60));
  assert.deepEqual(out.templateSets.map((s) => s.setIndex), [1, 2, 3, 4, 5]);
  assert.equal(out.target_sets, 5);
  assert.equal(out.prescriptionIncomplete, false);
  assert.equal(completePrescription(out), true);
  assert.equal(ex.templateSets.length, 1); // Eingabe bleibt unverändert
});

test('Schema ohne vorhandene Sätze und Zeit-Übungen unangetastet', () => {
  const plain = applySchemeToExercise({ name: 'Kniebeuge' }, SET_SCHEMES[0]);
  assert.equal(plain.templateSets.length, 3);
  assert.equal(plain.templateSets[0].targetWeight, null);
  const plank = { name: 'Plank', trackingType: 'duration', templateSets: [{ targetDuration: 45 }] };
  assert.equal(applySchemeToExercise(plank, SET_SCHEMES[0]), plank);
  const all = applySchemeToExercises([plank, { name: 'Row' }], SET_SCHEMES[2]);
  assert.equal(all[0], plank);
  assert.equal(all[1].templateSets.length, 4);
});
