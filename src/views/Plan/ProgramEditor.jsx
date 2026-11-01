import { useEffect, useState } from 'react';
import PlanEditor from './PlanEditor.jsx';
import { createPlanApi } from './api.js';
import { programToPlan, planToProgram } from './lib/programDraft.js';

// Coach provides identity, storage and navigation; Plan owns the complete composition UI.
export default function ProgramEditor({ program, coachUid, templates, onSave, onSaved, onClose }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setPlan(null); setError('');
    const api = createPlanApi(coachUid);
    programToPlan(program, async (id) => (await api.get(`/routines/${encodeURIComponent(id)}`)).routine)
      .then((value) => { if (alive) setPlan(value); })
      .catch((err) => { if (alive) setError(err.message || 'Programm konnte nicht geladen werden.'); });
    return () => { alive = false; };
  }, [program.id, program.updatedAt, coachUid, attempt]);
  if (error) return <div role="alert"><p>{error}</p><button className="min-h-[44px] underline" onClick={() => setAttempt((n) => n + 1)}>Erneut versuchen</button><button className="min-h-[44px] px-3" onClick={onClose}>Zurück</button></div>;
  if (!plan) return <p role="status">Programm wird geöffnet…</p>;
  return <PlanEditor key={`${program.id}:${program.updatedAt}`} plan={plan} uid={coachUid} draftNamespace="program" templates={templates} apiClient={createPlanApi(coachUid)} onClose={onClose} onSaved={onSaved} saveDraft={(draft) => onSave(planToProgram(program, draft))} />;
}
