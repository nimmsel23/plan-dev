import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Users } from 'lucide-react';
import { getAllUserProfiles, listMacrocycles } from '@db';
import { createPlanApi } from './api.js';
import RoutineBuilder from './RoutineBuilder.jsx';
import TrainingPlans from './TrainingPlans.jsx';
import { formatDuration, workoutTotals } from './lib/history.js';

export default function CoachWorkspace({ onBack }) {
  const [profiles, setProfiles] = useState({});
  const [clientUid, setClientUid] = useState('');
  const [routines, setRoutines] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState({});
  const clientApi = useMemo(() => createPlanApi(clientUid), [clientUid]);
  useEffect(() => { getAllUserProfiles().then(setProfiles).catch((err) => setError(err.message)); }, []);
  const clients = useMemo(() => Object.entries(profiles).map(([uid, p]) => [uid, p.displayName || p.email || uid]).sort((a, b) => a[1].localeCompare(b[1])), [profiles]);
  // Pro Klient: bereitgestellte/Entwurfs-Pläne und letztes absolviertes Workout.
  useEffect(() => {
    let alive = true;
    clients.forEach(async ([uid]) => {
      try {
        const [plans, w] = await Promise.all([listMacrocycles(uid), createPlanApi(uid).get('/workouts')]);
        const finished = (w.workouts || []).filter((x) => x.finished_at).map((x) => x.finished_at).sort();
        const weekAgo = Date.now() - 7 * 86400000;
        const info = {
          published: plans.filter((p) => p.status !== 'draft').length,
          drafts: plans.filter((p) => p.status === 'draft').length,
          last: finished.at(-1) || null,
          week: finished.filter((d) => Date.parse(d) >= weekAgo).length,
        };
        if (alive) setOverview((o) => ({ ...o, [uid]: info }));
      } catch { if (alive) setOverview((o) => ({ ...o, [uid]: { failed: true } })); }
    });
    return () => { alive = false; };
  }, [clients]);
  async function load() {
    if (!clientUid) return;
    setBusy(true); setError('');
    try {
      const [r, w] = await Promise.all([clientApi.get('/routines'), clientApi.get('/workouts')]);
      setRoutines(r.routines || []); setWorkouts(w.workouts || []);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { setRoutines([]); setWorkouts([]); setEditing(null); load(); }, [clientUid]);
  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try { const r = await clientApi.post('/routines', { name: name.trim() }); setName(''); setEditing(r.id); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (editing) return <div><p className="px-4 pt-4 text-xs text-fit-accent">Für {profiles[clientUid]?.displayName || profiles[clientUid]?.email || clientUid}</p><RoutineBuilder key={`${clientUid}:${editing}`} routineId={editing} apiClient={clientApi} onBack={() => { setEditing(null); load(); }} /></div>;
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-fit-muted"><ArrowLeft size={16} /> Mein Training</button>
      <header><h1 className="flex items-center gap-2 text-2xl font-bold"><Users size={23} /> Klienten-Training</h1><p className="mt-2 text-sm text-fit-muted">Klient wählen, Workout-Vorlagen erstellen und zu einem Trainingsplan bündeln. Die Vorlagen sind im persönlichen Plan des Klienten direkt startbar.</p></header>
      <label className="block text-sm font-medium">Klient
        <select aria-label="Klient auswählen" value={clientUid} onChange={(e) => setClientUid(e.target.value)} className="mt-2 w-full rounded-xl border border-fit-line bg-fit-card p-3">
          <option value="">Klient auswählen…</option>
          {clients.map(([uid, label]) => <option key={uid} value={uid}>{label}</option>)}
        </select>
      </label>
      {!clientUid && clients.length > 0 && <section aria-label="Klienten-Übersicht" className="space-y-2">
        <h2 className="text-lg font-semibold">Klienten-Übersicht</h2>
        {clients.map(([uid, label]) => { const o = overview[uid]; return <button key={uid} onClick={() => setClientUid(uid)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-fit-line bg-fit-card p-3 text-left">
          <span className="min-w-0"><span className="block truncate font-semibold">{label}</span>
            <span className="text-xs text-fit-muted">{!o ? 'Lädt…' : o.failed ? 'Keine Daten' : o.published ? `${o.published} Plan${o.published > 1 ? 'e' : ''} bereitgestellt` : o.drafts ? 'Nur Entwurf — noch nichts bereitgestellt' : 'Noch kein Plan'}{o && !o.failed && o.drafts > 0 && o.published > 0 ? ` · ${o.drafts} Entwurf` : ''}</span></span>
          <span className="shrink-0 text-right text-xs text-fit-muted">{o && !o.failed && <><span className="block font-semibold text-fit-ink">{o.week} / 7 Tage</span>{o.last ? `zuletzt ${new Date(o.last).toLocaleDateString('de-AT')}` : 'noch kein Workout'}</>}</span>
        </button>; })}
      </section>}
      {error && <p role="alert" className="text-sm text-fit-red">{error}<button onClick={load} className="ml-2 underline">Erneut versuchen</button></p>}
      {clientUid && <>
        <section className="space-y-3"><h2 className="text-lg font-semibold">Workout-Vorlagen</h2>
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex gap-2"><input aria-label="Neue Workout-Vorlage" placeholder="z. B. Push A" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-fit-line bg-fit-card p-3 text-sm" /><button disabled={busy || !name.trim()} className="flex items-center gap-1 rounded-xl bg-fit-accent px-4 text-sm font-semibold text-fit-bg disabled:opacity-50"><Plus size={16} /> Erstellen</button></form>
          {busy ? <p className="text-sm text-fit-muted">Lädt…</p> : routines.map((r) => <button key={r.id} onClick={() => setEditing(r.id)} className="flex w-full items-center justify-between rounded-xl border border-fit-line bg-fit-card p-4 text-left"><span><span className="block font-semibold">{r.name}</span><span className="text-xs text-fit-muted">{r.exerciseCount || 0} Übungen · Sätze, Pausen und Hinweise bearbeiten</span></span><Pencil size={16} /></button>)}
          {!busy && !routines.length && <p className="text-sm text-fit-muted">Erstelle die erste Einheit. Füge anschließend ihre Übungen und Satzvorgaben hinzu.</p>}
        </section>
        <TrainingPlans key={clientUid} clientUid={clientUid} clients={clients} templates={routines} workouts={workouts} onChanged={load} />
        <section><h2 className="mb-3 text-lg font-semibold">Absolvierte Workouts</h2>{workouts.filter((w) => w.finished_at).sort((a,b) => b.finished_at.localeCompare(a.finished_at)).slice(0, 12).map((w) => <div key={w.id} className="mb-2 rounded-xl border border-fit-line p-3"><p className="font-medium">{w.name}</p><p className="text-xs text-fit-muted">{new Date(w.finished_at).toLocaleDateString('de-AT')} · {workoutTotals(w).sets} Sätze · {formatDuration(workoutTotals(w).durationMs)}</p>{(w.eventLog || []).map((s,i) => <p key={i} className="mt-1 text-xs text-fit-dim">{s.name} · {s.reps != null ? `${s.reps} Wdh` : `${s.seconds || 0} s`}{s.weight != null ? ` · ${s.weight} kg` : ''}</p>)}</div>)}{!workouts.some((w) => w.finished_at) && <p className="text-sm text-fit-muted">Hier erscheinen die tatsächlichen Ergebnisse des Klienten.</p>}</section>
      </>}
    </div>
  );
}
