import { Check, Circle, Clock } from 'lucide-react';
import { weekOverview } from '../lib/weekOverview.js';

const STATUS = {
  done: { icon: Check, cls: 'bg-fit-accent text-fit-bg', label: 'erledigt' },
  due: { icon: Circle, cls: 'border-2 border-fit-accent text-fit-accent', label: 'heute fällig' },
  overdue: { icon: Clock, cls: 'bg-yellow-500/20 text-yellow-500', label: 'offen (überfällig)' },
  scheduled: { icon: Circle, cls: 'border border-fit-accent/60 text-fit-accent/70', label: 'ab jetzt möglich' },
  upcoming: { icon: Circle, cls: 'border border-fit-line text-fit-dim', label: 'geplant' },
};

// „Meine Woche“: Wochenplan des Coaches mit Status pro Tag (nur bei Plänen mit Wochentagen).
export default function WeekOverview({ plan, workouts, now = new Date() }) {
  const week = weekOverview(plan, workouts, now);
  if (!week.planned) return null;
  return <section aria-label="Meine Woche" className="mb-5 rounded-2xl border border-fit-line bg-fit-card p-4">
    <div className="mb-3 flex items-baseline justify-between"><h2 className="text-sm font-semibold">Meine Woche</h2><span className="text-xs text-fit-muted">{week.done} von {week.planned} erledigt{week.overdue > 0 ? ` · ${week.overdue} überfällig` : ''}</span></div>
    <div className="grid grid-cols-7 gap-1.5">
      {week.days.map((d) => <div key={d.day} className={`rounded-xl p-1.5 text-center ${d.isToday ? 'bg-fit-accent/10 ring-1 ring-fit-accent/40' : ''}`}>
        <p className={`mb-1 text-[11px] font-semibold ${d.isToday ? 'text-fit-accent' : 'text-fit-muted'}`}>{d.label}</p>
        {d.entries.length === 0 ? <span aria-label="frei" className="block text-xs text-fit-dim">–</span> : d.entries.map(({ routine, status }) => {
          const { icon: Icon, cls, label } = STATUS[status];
          return <span key={routine.id} title={`${routine.label} · ${label}`} aria-label={`${routine.label}, ${label}`} className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full ${cls}`}><Icon size={13} /></span>;
        })}
      </div>)}
    </div>
    <ul className="mt-3 space-y-0.5 text-xs text-fit-muted">{week.days.flatMap((d) => d.entries.map((e) => ({ ...e, d }))).filter((e) => ['due', 'overdue'].includes(e.status)).map((e) => <li key={e.d.day + e.routine.id}>{e.d.label}: {e.routine.label} · {STATUS[e.status].label}</li>)}</ul>
  </section>;
}
