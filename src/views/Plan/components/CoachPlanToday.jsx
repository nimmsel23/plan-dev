import { useState } from 'react';
import { Play } from 'lucide-react';

const LABELS = { due: 'Heute fällig', overdue: 'Überfällig – war für gestern geplant, heute noch möglich', scheduled: 'Ab heute möglich – geplant für morgen' };

// Startseite des Klienten: die nächste Einheit aus dem Plan des Coaches samt Hinweis und Versionsstand.
export default function CoachPlanToday({ plan, routine, status, doneToday, alsoToday = [], onStart, onOpenPlans, busy }) {
  const [more, setMore] = useState(false);
  const note = plan.description?.trim();
  const long = note && (note.length > 140 || note.includes('\n'));
  const label = LABELS[status] || (doneToday ? 'Heute erledigt ✓ · als Nächstes' : 'Als Nächstes in deinem Plan');
  return <section className="mb-5 rounded-2xl border border-fit-accent/30 bg-fit-accent/10 p-4">
    <p className="mb-1 text-xs font-medium text-fit-accent">{label} · {plan.name}</p>
    <h2 className="text-xl font-bold">{routine.label}</h2>
    <p className="mt-1 text-sm text-fit-muted">{routine.exercises?.length || 0} Übungen · von deinem Coach{plan.headVersion > 1 ? ` · Version ${plan.headVersion}` : ''}</p>
    {alsoToday.length > 0 && <p className="mt-1 text-xs text-fit-muted">Außerdem heute: {alsoToday.join(', ')}</p>}
    {plan.headVersion > 1 && plan.headMessage && <p className="mt-2 text-xs"><span className="font-semibold text-fit-accent">Neu:</span> {plan.headMessage}</p>}
    {note && <div className="mt-3 rounded-xl bg-fit-bg/60 p-3 text-sm"><span className="mb-1 block text-xs font-semibold text-fit-accent">Hinweis von deinem Coach</span><p className={`whitespace-pre-wrap ${long && !more ? 'line-clamp-3' : ''}`}>{note}</p>{long && <button onClick={() => setMore((v) => !v)} aria-expanded={more} className="mt-1 min-h-[44px] text-xs text-fit-accent underline">{more ? 'Weniger' : 'Mehr anzeigen'}</button>}</div>}
    <div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => onStart(routine.sourceTemplateId, { sourcePlanId: plan.id, sourcePlanRoutineId: routine.id, sourcePlanVersion: plan.headVersion || null, name: routine.label, ...(routine.exercises?.length ? { routine_snapshot: { name: routine.label, exercises: routine.exercises } } : {}) })} className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-fit-accent py-3 text-sm font-semibold text-fit-bg disabled:opacity-50"><Play size={16} /> Training starten</button><button onClick={onOpenPlans} className="min-h-[48px] rounded-xl border border-fit-line px-3 text-sm">Zum Plan</button></div>
  </section>;
}
