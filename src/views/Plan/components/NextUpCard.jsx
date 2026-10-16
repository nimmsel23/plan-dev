import { Play } from 'lucide-react';

export default function NextUpCard({ routine, onStart, onEdit, busy }) {
  return <section className="mb-5 rounded-2xl border border-fit-accent/30 bg-fit-accent/10 p-4">
    <p className="mb-1 text-xs font-medium text-fit-accent">Vorschlag für deine nächste Einheit</p>
    <h2 className="text-xl font-bold">{routine.name}</h2>
    <p className="mt-1 text-sm text-fit-muted">{routine.exerciseCount || 0} Übungen · Du kannst auch eine andere Vorlage wählen.</p>
    <div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => onStart(routine.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fit-accent py-3 text-sm font-semibold text-fit-bg disabled:opacity-50"><Play size={16} /> Training starten</button><button onClick={() => onEdit(routine.id)} className="rounded-xl border border-fit-line px-3 text-sm">Bearbeiten</button></div>
  </section>;
}
