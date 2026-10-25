import { useState, useEffect } from 'react';
import { Send, Play } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { getAssignedPlans } from '@db';
import { assignedWorkoutBody } from './lib/assignedWorkout.js';

export default function AssignedPlans({ onStart }) {
  const { user } = useUser();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    let alive = true;
    setPlans([]);
    if (user?.uid) getAssignedPlans(user.uid).then((p) => { if (alive) setPlans(p); }).catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [user?.uid]);
  if (!plans.length && !error) return null;
  return <section className="mb-6 space-y-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Send size={15} className="text-fit-accent" /> Vom Coach zugewiesen</h2>
    {error && <p role="alert" className="text-sm text-fit-red">{error}</p>}
    {plans.map((plan) => <article key={plan.id} className="rounded-2xl border border-fit-line bg-fit-card p-4"><h3 className="font-semibold">{plan.name || 'Coach-Workout'}</h3><ol className="my-3 space-y-1 text-sm text-fit-muted">{(plan.exercises || []).map((ex,i) => <li key={ex.id || i}>{ex.name} · {ex.target_sets || ex.sets || 3} × {ex.target_reps || ex.reps || '8–12'}</li>)}</ol><button disabled={!!busy || !plan.exercises?.length} onClick={async () => { setBusy(plan.id); setError(''); try { await onStart(assignedWorkoutBody(plan)); } catch (err) { setError(err.message); } finally { setBusy(null); } }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-fit-accent py-3 text-sm font-semibold text-fit-bg disabled:opacity-50"><Play size={15} /> {busy === plan.id ? 'Startet…' : 'Training starten'}</button></article>)}
  </section>;
}
