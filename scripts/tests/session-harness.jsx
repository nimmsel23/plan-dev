// Mountet das echte Session-Gate (TodayPlan) mit einem Coach-Plan samt Mikrozyklen; Entwurf landet sichtbar in #draft.
import { createRoot } from 'react-dom/client';
import '@src/styles.css';
import TodayPlan from '../../src/views/Session/TodayPlan.jsx';

const sets = (n) => Array.from({ length: n }, () => ({ targetReps: 8, targetWeight: 60 }));
const day = 86400000;
const cycle = {
  id: 'p1', name: 'Block A', coachUid: 'coach', publishedAt: new Date(Date.now() - 8 * day).toISOString(),
  microcycles: [{ id: 'a', name: 'Aufbau', kind: 'build', weeks: 1, volumePct: 100, rirDelta: 0, weeklyWeightPct: 0 }, { id: 'b', name: 'Deload', kind: 'deload', weeks: 1, volumePct: 60, rirDelta: 2, weeklyWeightPct: 0 }],
  routines: [
    { id: 'r1', label: 'Push', exercises: [{ exercise_id: 'bench', name: 'Bankdrücken', rir: 2, rest_seconds: 120, templateSets: sets(5) }] },
    { id: 'r2', label: 'Pull', exercises: [{ exercise_id: 'row', name: 'Rudern', templateSets: sets(4) }] },
  ],
};
createRoot(document.getElementById('root')).render(
  <TodayPlan cycle={cycle} nextRoutine={cycle.routines[0]} lastPerformance={null} clientUid="client" onDone={() => {}} onLogFreely={() => {}}
    onLoadDraft={(d) => { document.getElementById('draft').textContent = JSON.stringify(d); }} />
);

// Drill 8: echte ExerciseCard mit „Letztes Mal“ (prev); Zustand wird live in #card-state gespiegelt.
import { useState } from 'react';
import ExerciseCard from '../../src/views/Session/ExerciseCard.jsx';
function CardHarness() {
  const [ex, setEx] = useState({ id: 'bench', name: 'Bankdrücken', primaryMuscles: [], secondaryMuscles: [], stabilizers: [], setsArray: [{ reps: '', weight: '' }, { reps: '10', weight: '' }, { reps: '', weight: '' }], note: '' });
  const prev = { date: '2026-11-02', setsArray: [{ reps: '8', weight: '60' }, { reps: '7', weight: '62.5' }] };
  const toast = (m) => { document.getElementById('toast').textContent = m; };
  return <>
    <ExerciseCard ex={ex} i={0} prev={prev} isFirst isLast onToast={toast}
      updateEx={() => {}} addSet={() => {}} removeSet={() => {}} removeEx={() => {}} moveEx={() => {}}
      replaceSets={(_, sets) => { setEx((e) => ({ ...e, setsArray: sets })); document.getElementById('card-state').textContent = JSON.stringify(sets); }} />
  </>;
}
const cardRoot = document.createElement('div'); cardRoot.id = 'card-root'; document.body.appendChild(cardRoot);
const st = document.createElement('pre'); st.id = 'card-state'; document.body.appendChild(st);
const ts = document.createElement('pre'); ts.id = 'toast'; document.body.appendChild(ts);
createRoot(cardRoot).render(<CardHarness />);

// Drill 4/6: echter TemplateLauncher gegen das isolierte Test-Backend; vorher wird über dieselbe Plan-api eine Vorlage angelegt.
import { api } from '../../src/views/Plan/api.js';
import TemplateLauncher from '../../src/views/Session/TemplateLauncher.jsx';
const launchRoot = document.createElement('div'); launchRoot.id = 'launcher-root'; document.body.appendChild(launchRoot);
const launched = document.createElement('pre'); launched.id = 'launched'; document.body.appendChild(launched);
(async () => {
  const { id } = await api.post('/routines', { name: 'Push A' });
  await api.post(`/routines/${id}/exercises`, { exercise_id: 'bench', name: 'Bankdrücken', target_sets: 3, target_reps: '8' });
  createRoot(launchRoot).render(<TemplateLauncher onLoadDraft={(d) => { launched.textContent = JSON.stringify(d); }} />);
})().catch((e) => { launched.textContent = `ERROR ${e.message}`; });
