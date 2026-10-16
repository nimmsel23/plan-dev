import { useState } from 'react';
import { Play, Pencil, MoreHorizontal, ChevronDown } from 'lucide-react';
import { api } from '../api.js';

export default function RoutineCard({ r, onEdit, onStart, onRename, onDelete, onSetCategory, busy, workouts = [] }) {
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  const [exercises, setExercises] = useState(null);
  const [error, setError] = useState('');
  const previous = workouts.filter((w) => w.routine_id === r.id && w.finished_at).sort((a,b) => b.finished_at.localeCompare(a.finished_at))[0];
  async function toggle() {
    setPreview(!preview);
    if (!exercises) try { const d = await api.get(`/routines/${r.id}`); setExercises(d.routine.exercises || []); } catch (err) { setError(err.message); }
  }
  return <article className="rounded-2xl border border-fit-line bg-fit-card p-4">
    <header className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="font-semibold">{r.name}</h3><p className="mt-1 text-xs text-fit-muted">{previous ? `Zuletzt ${new Date(previous.finished_at).toLocaleDateString('de-AT')}` : 'Noch nicht trainiert'}</p></div><button aria-label={`${r.name}: Optionen`} aria-expanded={menu} onClick={() => setMenu(!menu)} className="p-1 text-fit-muted"><MoreHorizontal size={20} /></button></header>
    {menu && <div className="my-3 flex flex-wrap gap-3 rounded-xl bg-fit-bg p-3 text-xs"><button onClick={() => { setMenu(false); onRename?.(r); }}>Umbenennen</button><button onClick={() => { setMenu(false); onSetCategory?.(r); }}>Ordner ändern</button><button onClick={() => onDelete?.(r.id)} className="text-fit-red">Löschen</button></div>}
    <button aria-expanded={preview} onClick={toggle} className="my-4 flex w-full items-center justify-between text-left text-sm text-fit-muted">{r.exerciseCount || 0} Übungen <ChevronDown size={16} /></button>
    {preview && <div className="mb-4 space-y-2 text-xs">{error ? <p role="alert" className="text-fit-red">{error}<button onClick={toggle} className="ml-2 underline">Erneut laden</button></p> : exercises === null ? 'Lädt…' : exercises.map((ex) => <div key={ex.id} className="flex justify-between gap-2"><span>{ex.name}</span><span className="shrink-0 text-fit-muted">{ex.templateSets?.length || ex.target_sets || 3} Sätze</span></div>)}</div>}
    <div className="flex gap-2"><button disabled={busy} onClick={() => onStart(r.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fit-accent py-2.5 text-sm font-semibold text-fit-bg disabled:opacity-50"><Play size={14} /> Starten</button><button aria-label={`${r.name} bearbeiten`} onClick={() => onEdit(r.id)} className="rounded-xl border border-fit-line px-3"><Pencil size={16} /></button></div>
  </article>;
}
