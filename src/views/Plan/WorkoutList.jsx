import { useEffect, useRef, useState } from 'react';
import { Dumbbell, Plus, FolderPlus, Play, Layers } from 'lucide-react';
import { api } from './api.js';
import { pickNextRoutine } from '../../lib/habitProgress.js';
import TrainingPlans from './TrainingPlans.jsx';
import AssignedPlans from './AssignedPlans.jsx';
import RoutineFolder from './components/RoutineFolder.jsx';
import NextUpCard from './components/NextUpCard.jsx';
import { groupRoutinesIntoFolders } from './lib/splitFolders.js';
import { startWorkout } from './lib/startWorkout.js';
import { readActiveWorkout, writeActiveWorkout } from './lib/activeWorkout.js';
import { getUid, listMacrocycles } from '@db';
import { useUser } from '../../contexts/UserContext.jsx';
import PushOptIn from './components/PushOptIn.jsx';
import { markSeen, readSeen, unseenCoachPlans } from './lib/newPlans.js';

export default function WorkoutList({ onEditRoutine, onOpenWorkout }) {
  const [routines, setRoutines] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState('templates');
  const { user } = useUser();
  const [newPlans, setNewPlans] = useState([]);
  const lock = useRef(false);
  const folderKey = `plan-empty-folders:${getUid()}`;
  const [emptyFolders, setEmptyFolders] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem(folderKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  async function load() {
    setLoading(true); setError('');
    try {
      const [r, w] = await Promise.all([api.get('/routines'), api.get('/workouts')]);
      setRoutines(r.routines || []); setWorkouts(w.workouts || []);
      // Recover unfinished sessions even if the local pointer was lost.
      const unfinished = (w.workouts || []).find((item) => !item.finished_at);
      if (!readActiveWorkout() && unfinished) writeActiveWorkout({ id: unfinished.id, name: unfinished.name, started_at: unfinished.started_at });
    } catch (err) { setError(err.message || 'Training konnte nicht geladen werden.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    let alive = true;
    const uid = getUid();
    listMacrocycles(uid).then((plans) => { if (alive) setNewPlans(unseenCoachPlans(plans, uid, readSeen(uid))); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  function showPlans() { markSeen(getUid(), newPlans); setNewPlans([]); setSection('plans'); }
  async function act(fn) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message || 'Aktion fehlgeschlagen.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function begin(routineId, extra = {}) {
    await act(async () => { const id = await startWorkout({ ...extra, ...(routineId ? { routine_id: routineId } : {}) }); onOpenWorkout(id); });
  }
  function newRoutine() {
    return act(async () => { const r = await api.post('/routines', { name: 'Neue Workout-Vorlage' }); onEditRoutine(r.id); });
  }
  function rename(r) {
    const name = prompt('Name der Workout-Vorlage:', r.name);
    if (name?.trim()) act(async () => { await api.patch(`/routines/${r.id}`, { name: name.trim() }); await load(); });
  }
  function category(r) {
    const name = prompt('Ordner (leer lassen zum Entfernen):', r.category || '');
    if (name !== null) act(async () => { await api.patch(`/routines/${r.id}`, { category: name.trim() || null }); await load(); });
  }
  function remove(id) {
    if (confirm('Workout-Vorlage löschen? Vergangene Workouts bleiben erhalten.')) act(async () => { await api.delete(`/routines/${id}`); await load(); });
  }
  function foldersChanged(next) { setEmptyFolders(next); localStorage.setItem(folderKey, JSON.stringify(next)); }
  function createFolder() { const name = prompt('Name des Ordners:'); if (name?.trim() && !emptyFolders.includes(name.trim())) foldersChanged([...emptyFolders, name.trim()]); }
  const next = !loading ? pickNextRoutine(routines, workouts) : null;
  const { folders, folderNames: detected, uncategorized } = groupRoutinesIntoFolders(routines);
  const folderNames = [...new Set([...detected, ...emptyFolders])];
  const unfinished = workouts.find((w) => !w.finished_at);
  const cardProps = { onEdit: onEditRoutine, onStart: begin, onRename: rename, onDelete: remove, onSetCategory: category, busy, workouts };
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-fit-muted">Dein Trainingslogbuch</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Training starten</h1><p className="mt-2 text-sm text-fit-muted">Vorlage wählen, Sätze abhaken und beim nächsten Mal auf deiner Leistung aufbauen.</p></header>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 p-3 text-sm text-fit-red">{error}<button onClick={load} className="ml-2 underline">Erneut laden</button></div>}
      <PushOptIn user={user} />
      {newPlans.length > 0 && <button onClick={showPlans} className="mb-4 flex w-full items-center justify-between rounded-2xl border border-fit-accent bg-fit-accent/10 p-4 text-left"><span><span className="block font-semibold">{newPlans.length === 1 ? `Neuer Trainingsplan: ${newPlans[0].name}` : `${newPlans.length} neue Trainingspläne von deinem Coach`}</span><span className="text-xs text-fit-muted">Antippen zum Ansehen</span></span><Layers size={20} className="text-fit-accent" /></button>}
      {unfinished ? <button disabled={busy} onClick={() => onOpenWorkout(unfinished.id)} className="mb-6 flex w-full items-center justify-between rounded-2xl border border-fit-accent bg-fit-accent/10 p-4 text-left"><span><span className="block font-semibold">{unfinished.name}</span><span className="text-xs text-fit-muted">Workout läuft · Fortsetzen</span></span><Play size={20} className="text-fit-accent" /></button> : next && <NextUpCard routine={next} onStart={begin} onEdit={onEditRoutine} busy={busy} />}
      <div className="mb-6 grid grid-cols-2 gap-2"><button disabled={busy || loading} onClick={() => begin()} className="rounded-xl border border-fit-line bg-fit-card px-3 py-3 text-sm font-semibold disabled:opacity-50">Leeres Workout</button><button disabled={busy} onClick={newRoutine} className="flex items-center justify-center gap-2 rounded-xl bg-fit-accent px-3 py-3 text-sm font-semibold text-fit-bg disabled:opacity-50"><Plus size={16} /> Neue Vorlage</button></div>
      <div aria-label="Trainingsbereich" className="mb-5 flex gap-1 rounded-xl bg-fit-bg2 p-1">{[['templates', 'Workout-Vorlagen'], ['plans', 'Trainingspläne']].map(([id,label]) => <button key={id} aria-pressed={section === id} onClick={() => { if (id === 'plans' && newPlans.length) markSeen(getUid(), newPlans), setNewPlans([]); setSection(id); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${section === id ? 'bg-fit-card text-fit-ink shadow-sm' : 'text-fit-muted'}`}>{label}{id === 'plans' && newPlans.length > 0 && <span aria-label="neu" className="ml-1.5 inline-block h-2 w-2 rounded-full bg-fit-accent align-middle" />}</button>)}</div>
      {section === 'plans' ? <><p className="mb-4 text-sm text-fit-muted">Ein Trainingsplan bündelt deine Workout-Vorlagen und zeigt, wie oft du sie trainieren möchtest.</p><AssignedPlans onStart={(body) => begin(null, body)} /><TrainingPlans templates={routines} workouts={workouts} onChanged={load} onStart={begin} /></> : <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Deine Vorlagen {!loading && `(${routines.length})`}</h2><button onClick={createFolder} className="flex items-center gap-1 text-xs text-fit-muted"><FolderPlus size={15} /> Ordner</button></div>
        {loading ? <p className="py-12 text-center text-sm text-fit-muted">Vorlagen laden…</p> : !routines.length ? <div className="rounded-2xl border border-dashed border-fit-line p-6 text-center"><Dumbbell size={30} className="mx-auto mb-3 text-fit-accent" /><h3 className="font-semibold">Dein erstes Workout beginnt hier</h3><p className="my-3 text-sm text-fit-muted">Erstelle eine Vorlage, z. B. „Push A“, und füge Übungen aus dem Yuhonas-Katalog hinzu. Oder starte leer und speichere dein Workout danach als Vorlage.</p><button onClick={newRoutine} className="rounded-xl bg-fit-accent px-4 py-2 text-sm font-semibold text-fit-bg">Erste Vorlage erstellen</button><button onClick={() => setSection('plans')} className="mt-3 block w-full text-sm text-fit-accent">Trainingspläne vom Coach ansehen</button></div> : <>
          {folderNames.map((name) => <RoutineFolder key={name} label={name} routines={folders[name] || []} defaultOpen onDeleteFolder={() => foldersChanged(emptyFolders.filter((f) => f !== name))} {...cardProps} />)}
          {uncategorized.length > 0 && <RoutineFolder label="Workout-Vorlagen" routines={uncategorized} defaultOpen {...cardProps} />}
        </>}
      </section>}
    </div>
  );
}
