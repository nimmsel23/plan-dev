import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { getAllUserProfiles, listMacrocycles } from '@db';
import { createPlanApi } from './api.js';
import TrainingPlans from './TrainingPlans.jsx';
import { formatDuration, workoutTotals } from './lib/history.js';

export default function CoachWorkspace({ onBack }) {
  const [profiles, setProfiles] = useState({});
  const [clientUid, setClientUid] = useState('');
  const [routines, setRoutines] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState({});
  const [profilesError, setProfilesError] = useState('');
  const [section, setSection] = useState('plans');
  const [filter, setFilter] = useState('');
  const seq = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);
  const clientApi = useMemo(() => createPlanApi(clientUid), [clientUid]);
  const loadProfiles = useCallback(() => {
    setProfilesError('');
    getAllUserProfiles()
      .then((p) => aliveRef.current && setProfiles(p || {}))
      .catch((err) => aliveRef.current && setProfilesError(err?.message || 'Klienten konnten nicht geladen werden.'));
  }, []);
  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  const clients = useMemo(
    () => Object.entries(profiles).map(([uid, p]) => [uid, p.displayName || p.email || uid]).sort((a, b) => a[1].localeCompare(b[1])),
    [profiles],
  );
  const loadOverview = useCallback(async (uid) => {
    setOverview((o) => ({ ...o, [uid]: undefined }));
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
      if (aliveRef.current) setOverview((o) => ({ ...o, [uid]: info }));
    } catch {
      if (aliveRef.current) setOverview((o) => ({ ...o, [uid]: { failed: true } }));
    }
  }, []);
  useEffect(() => { clients.forEach(([uid]) => loadOverview(uid)); }, [clients, loadOverview]);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? clients.filter(([, label]) => label.toLowerCase().includes(q)) : clients;
  }, [clients, filter]);

  async function load() {
    if (!clientUid) return;
    const mine = ++seq.current;
    setBusy(true);
    setError('');
    try {
      const [r, w] = await Promise.all([clientApi.get('/routines'), clientApi.get('/workouts')]);
      if (mine !== seq.current) return;
      setRoutines(r.routines || []);
      setWorkouts(w.workouts || []);
    } catch (err) {
      if (mine === seq.current) setError(err.message);
    } finally {
      if (mine === seq.current) setBusy(false);
    }
  }
  useEffect(() => {
    seq.current++;
    setRoutines([]);
    setWorkouts([]);
    setError('');
    setBusy(false);
    setSection('plans');
    load();
    return () => { seq.current++; };
  }, [clientUid]);

  const clientLabel = clients.find(([id]) => id === clientUid)?.[1] || clientUid;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-fit-muted">
        <ArrowLeft size={16} /> Zurück
      </button>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Users size={23} /> Klientenpläne</h1>
        <p className="mt-2 text-sm text-fit-muted">Klient → Plan anlegen → gestalten → freigeben.</p>
      </header>

      {!clientUid && (
        <section aria-label="Klienten" className="space-y-2">
          {profilesError && (
            <p role="alert" className="text-sm text-fit-red">
              {profilesError}
              <button onClick={loadProfiles} className="ml-2 min-h-[44px] underline">Erneut</button>
            </p>
          )}
          {clients.length > 8 && (
            <input
              type="search"
              aria-label="Klienten filtern"
              placeholder="Filtern…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-card p-3 text-sm"
            />
          )}
          {!clients.length && !profilesError && <p className="text-sm text-fit-muted">Keine Klienten geladen.</p>}
          {!shown.length && clients.length > 0 && <p className="text-sm text-fit-muted">Kein Treffer.</p>}
          {shown.map(([uid, label]) => {
            const o = overview[uid];
            return (
              <button
                key={uid}
                onClick={() => setClientUid(uid)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-fit-line bg-fit-card p-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{label}</span>
                  <span className="text-xs text-fit-muted">
                    {!o ? '…' : o.failed ? 'Fehler' : o.published ? `${o.published} bereitgestellt` : o.drafts ? `${o.drafts} Entwurf` : 'kein Plan'}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-fit-muted">
                  {o && !o.failed && (
                    <>
                      <span className="block font-semibold text-fit-ink">{o.week}× / 7d</span>
                      {o.last ? new Date(o.last).toLocaleDateString('de-AT') : '—'}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-fit-red">
          {error}
          <button onClick={load} className="ml-2 underline">Erneut</button>
        </p>
      )}

      {clientUid && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-fit-line bg-fit-card p-4">
            <div>
              <p className="text-xs text-fit-muted">Klient</p>
              <h2 className="text-xl font-semibold">{clientLabel}</h2>
            </div>
            <button onClick={() => setClientUid('')} className="min-h-[44px] text-sm text-fit-muted underline">
              Anderen wählen
            </button>
          </div>
          <nav aria-label="Bereich" className="grid grid-cols-2 gap-1 rounded-2xl border border-fit-line bg-fit-card p-1">
            {[['plans', 'Pläne'], ['results', 'Ergebnisse']].map(([id, label]) => (
              <button
                key={id}
                aria-current={section === id ? 'page' : undefined}
                onClick={() => setSection(id)}
                className={`min-h-[48px] rounded-xl px-2 text-sm font-semibold ${section === id ? 'bg-fit-accent text-fit-bg' : 'text-fit-muted'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          {section === 'plans' && (
            <TrainingPlans
              key={clientUid}
              clientUid={clientUid}
              clients={clients}
              templates={routines}
              workouts={workouts}
              onChanged={load}
            />
          )}
          {section === 'results' && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Absolvierte Workouts</h2>
              {busy && <p className="text-sm text-fit-muted">Lädt…</p>}
              {workouts
                .filter((w) => w.finished_at)
                .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
                .slice(0, 12)
                .map((w) => (
                  <div key={w.id} className="mb-2 rounded-xl border border-fit-line p-3">
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-fit-muted">
                      {new Date(w.finished_at).toLocaleDateString('de-AT')} · {workoutTotals(w).sets} Sätze · {formatDuration(workoutTotals(w).durationMs)}
                    </p>
                    {w.feedback && (
                      <p className="mt-1 rounded-lg bg-fit-accent/10 px-2 py-1 text-xs">
                        <span className="font-semibold text-fit-accent">
                          Rückmeldung{w.feedback.effort ? ` · ${w.feedback.effort}/10` : ''}
                        </span>
                        {w.feedback.note ? `: ${w.feedback.note}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              {!busy && !workouts.some((w) => w.finished_at) && (
                <p className="text-sm text-fit-muted">Noch keine Ergebnisse.</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
