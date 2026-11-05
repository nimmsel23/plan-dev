// Mountet das echte Session-Gate (TodayPlan) mit einem Coach-Plan samt Phasen; Entwurf landet sichtbar in #draft.
import { createRoot } from 'react-dom/client';
import '@src/styles.css';
import TodayPlan from '../../src/views/Session/TodayPlan.jsx';

const sets = (n) => Array.from({ length: n }, () => ({ targetReps: 8, targetWeight: 60 }));
const day = 86400000;
const cycle = {
  id: 'p1', name: 'Block A', coachUid: 'coach', publishedAt: new Date(Date.now() - 8 * day).toISOString(),
  phases: [{ id: 'a', name: 'Aufbau', kind: 'build', weeks: 1, volumePct: 100, rirDelta: 0, weeklyWeightPct: 0 }, { id: 'b', name: 'Deload', kind: 'deload', weeks: 1, volumePct: 60, rirDelta: 2, weeklyWeightPct: 0 }],
  routines: [
    { id: 'r1', label: 'Push', exercises: [{ exercise_id: 'bench', name: 'Bankdrücken', rir: 2, rest_seconds: 120, templateSets: sets(5) }] },
    { id: 'r2', label: 'Pull', exercises: [{ exercise_id: 'row', name: 'Rudern', templateSets: sets(4) }] },
  ],
};
createRoot(document.getElementById('root')).render(
  <TodayPlan cycle={cycle} nextRoutine={cycle.routines[0]} lastPerformance={null} clientUid="client" onDone={() => {}} onLogFreely={() => {}}
    onLoadDraft={(d) => { document.getElementById('draft').textContent = JSON.stringify(d); }} />
);
