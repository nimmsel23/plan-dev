import { Play } from 'lucide-react';

// Startseite des Klienten: die nächste Einheit aus dem Plan des Coaches.
export default function CoachPlanToday({ plan, routine, today, onStart, onOpenPlans, busy }) {
  return <section className="mb-5 rounded-2xl border border-fit-accent/30 bg-fit-accent/10 p-4">
    <p className="mb-1 text-xs font-medium text-fit-accent">{today ? 'Heute laut Plan' : 'Als Nächstes in deinem Plan'} · {plan.name}</p>
    <h2 className="text-xl font-bold">{routine.label}</h2>
    <p className="mt-1 text-sm text-fit-muted">{routine.exercises?.length || 0} Übungen · von deinem Coach</p>
    <div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => onStart(routine.sourceTemplateId, { sourcePlanId: plan.id, sourcePlanRoutineId: routine.id, sourcePlanVersion: plan.headVersion || null, name: routine.label, ...(routine.exercises?.length ? { routine_snapshot: { name: routine.label, exercises: routine.exercises } } : {}) })} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fit-accent py-3 text-sm font-semibold text-fit-bg disabled:opacity-50"><Play size={16} /> Training starten</button><button onClick={onOpenPlans} className="rounded-xl border border-fit-line px-3 text-sm">Zum Plan</button></div>
  </section>;
}
