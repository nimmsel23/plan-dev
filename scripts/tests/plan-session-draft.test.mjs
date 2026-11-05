import test from 'node:test';
import assert from 'node:assert/strict';
import { routineToSessionDraft, prescriptionText } from '../../src/views/Plan/lib/sessionDraft.js';

const routine = { label: 'Push', exercises: [
  { exercise_id: 'bench', name: 'Bankdrücken', rir: 2, rest_seconds: 120, notes: 'Schulterblätter fixieren', templateSets: [{ targetReps: 8, targetWeight: 60 }, { targetReps: 8, targetWeight: 60 }, { targetReps: 8, targetWeight: 60 }, { targetReps: 8, targetWeight: 60 }, { targetReps: 8, targetWeight: 60 }] },
  { name: 'Dehnen', target_sets: 2 },
] };

test('Entwurf: Sätze vorbereitet, Ist-Werte leer, Vorgaben im Hinweis', () => {
  const d = routineToSessionDraft(routine, { planName: 'PPL' });
  assert.equal(d.block, 'Push · PPL');
  assert.equal(d.exercises[0].id, 'bench');
  assert.equal(d.exercises[0].setsArray.length, 5);
  assert.deepEqual(d.exercises[0].setsArray[0], { reps: '', weight: '' });
  assert.match(d.exercises[0].note, /Ziel: 5×8 @ 60 kg · RIR 2 · Pause 120 s/);
  assert.match(d.exercises[0].note, /Schulterblätter/);
  assert.equal(d.exercises[1].setsArray.length, 2);
  assert.equal(d.exercises[1].source, 'plan');
});

test('Entwurf mit Deload-Phase: weniger Sätze, mehr RIR, Phase im Blocknamen', () => {
  const phase = { id: 'd', name: 'Deload', volumePct: 60, rirDelta: 2 };
  const d = routineToSessionDraft(routine, { phase, week: 4 });
  assert.equal(d.block, 'Push [Deload, W4]');
  assert.equal(d.exercises[0].setsArray.length, 3);
  assert.match(d.exercises[0].note, /3×8 @ 60 kg · RIR 4/);
  assert.equal(routine.exercises[0].templateSets.length, 5);
});

test('prescriptionText: ohne Vorgaben leer', () => {
  assert.equal(prescriptionText({ name: 'x', prescriptionIncomplete: true }), '');
});

test('mergeDraftIntoExercises: anhängen, gleiche Übung bekommt Sätze, Ist-Werte bleiben, keine Mutation', async () => {
  const { mergeDraftIntoExercises } = await import('../../src/views/Plan/lib/sessionDraft.js');
  const existing = [{ id: 'bench', name: 'Bankdrücken', note: 'x', setsArray: [{ reps: '8', weight: '60' }] }];
  const draft = routineToSessionDraft(routine);
  const out = mergeDraftIntoExercises(existing, draft);
  assert.equal(out.length, 2);
  assert.equal(out[0].setsArray.length, 6);
  assert.deepEqual(out[0].setsArray[0], { reps: '8', weight: '60' });
  assert.match(out[0].note, /^x\nZiel: 5×8/);
  assert.equal(existing[0].setsArray.length, 1);
  assert.equal(out[1].name, 'Dehnen');
  // zweites Einfügen derselben Zielnotiz dupliziert sie nicht
  assert.equal((mergeDraftIntoExercises(out, draft)[0].note.match(/Ziel:/g) || []).length, 1);
  assert.deepEqual(mergeDraftIntoExercises(existing, null), existing);
});

test('Letztes Mal: Karte aus Historie, nur Vorschlag in der Notiz', async () => {
  const { lastPerformanceMap, withLastPerformance, lastPerformanceText } = await import('../../src/views/Plan/lib/sessionDraft.js');
  const hist = [
    { date: '2026-11-05', exercises: [{ name: 'Bankdrücken', setsArray: [{ reps: '1', weight: '1' }] }] },
    { date: '2026-11-02', exercises: [{ name: 'Bankdrücken', setsArray: [{ reps: '8', weight: '60' }, { reps: '7', weight: '60' }] }, { name: 'Leer', setsArray: [{ reps: '', weight: '' }] }] },
    { date: '2026-10-30', exercises: [{ name: 'Bankdrücken', setsArray: [{ reps: '5', weight: '50' }] }] },
  ];
  const map = lastPerformanceMap(hist, '2026-11-05');
  assert.equal(map['Bankdrücken'].date, '2026-11-02');
  assert.equal(map['Leer'], undefined);
  assert.equal(lastPerformanceText(map['Bankdrücken']), 'Letztes Mal (02.11.): 8×60 · 7×60');
  const d = withLastPerformance(routineToSessionDraft(routine), map);
  assert.match(d.exercises[0].note, /Ziel: 5×8[^\n]*\n.*Letztes Mal \(02\.11\.\)/s);
  assert.deepEqual(d.exercises[0].setsArray[0], { reps: '', weight: '' });
  assert.equal(d.exercises[1].note, 'Ziel: 2 Sätze');
  assert.equal(withLastPerformance(null, map), null);
});

test('adoptLastSets: füllt nur leere Felder, überschreibt nie, null wenn nichts zu tun', async () => {
  const { adoptLastSets } = await import('../../src/views/Plan/lib/sessionDraft.js');
  const prev = [{ reps: '8', weight: '60' }, { reps: '7', weight: '62.5' }];
  const out = adoptLastSets([{ reps: '', weight: '' }, { reps: '', weight: '' }, { reps: '', weight: '' }], prev);
  assert.deepEqual(out.map((s) => [s.reps, s.weight]), [['8', '60'], ['7', '62.5'], ['7', '62.5']]);
  const part = adoptLastSets([{ reps: '10', weight: '' }], prev);
  assert.deepEqual(part[0], { reps: '10', weight: '60' });
  assert.equal(adoptLastSets([{ reps: '5', weight: '50' }], prev), null);
  assert.equal(adoptLastSets([{ reps: '', weight: '' }], []), null);
  assert.equal(adoptLastSets([], prev), null);
});
