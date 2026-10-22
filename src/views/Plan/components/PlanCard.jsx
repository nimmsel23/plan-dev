import { useEffect, useState } from 'react';
import { Plus, Target, Trash2, CheckCircle2, Play, ChevronDown, Copy, Undo2 } from 'lucide-react';
import { getMacrocycle, deleteMacrocycle, addRoutine, updateRoutine, deleteRoutine, getUid, publishMacrocycle, updateMacrocycle } from '@db';
import { createPlanApi } from '../api.js';
import { countCompletionsInPeriod, pickNextPlanRoutine } from '../../../lib/habitProgress.js';
import TemplatePicker from './TemplatePicker.jsx';
import WeekSlider from '../../../components/WeekSlider.jsx';
import { copyPlanToClient } from '../lib/copyPlan.js';
import { WEEKDAY_LABELS, weekdayIndex, toggleWeekday, hasSchedule, weekGrid, todaysOpenRoutines } from '../lib/weekSchedule.js';

export default function PlanCard({ plan, templates, workouts, clientUid, clients = [], onReload, onStart }) {
  const [detail, setDetail] = useState(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const uid = clientUid || getUid();
  const fromCoach = !clientUid && plan.coachUid && plan.coachUid !== uid;
  const canEdit = !!clientUid || !fromCoach;
  async function load() {
    setError('');
    try {
      const data = await getMacrocycle(uid, plan.id);
      if (!data?.macrocycle) throw new Error('Trainingsplan konnte nicht geladen werden.');
      setDetail(data.macrocycle);
      setNote(null);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { setDetail(null); load(); }, [plan.id, uid]);
  async function act(action) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (err) { setError(err.message || 'Änderung fehlgeschlagen.'); }
    finally { setBusy(false); }
  }
  async function pickTemplate(template) {
    const count = prompt(`Wie oft soll „${template.name}“ trainiert werden?`, '1');
    if (count === null) return;
    const days = prompt('In wie vielen Tagen?', '7');
    if (days === null) return;
    if (!(Number(count) > 0) || !(Number(days) > 0)) throw new Error('Häufigkeit und Zeitraum müssen größer als null sein.');
    const { routine } = await createPlanApi(clientUid).get(`/routines/${template.id}`);
    if (!routine.exercises?.length) throw new Error('Füge zuerst Übungen zur Workout-Vorlage hinzu.');
    const updated = await addRoutine(uid, plan.id, { label: template.name, targetCount: Number(count), targetPeriodDays: Number(days), sourceTemplateId: template.id, exercises: routine.exercises });
    const added = updated?.routines?.at(-1);
    if (!added) throw new Error('Vorlage konnte nicht hinzugefügt werden.');
    // The local macrocycle backend may not yet accept exercises on creation.
    if (!added.exercises?.length && !await updateRoutine(uid, plan.id, added.id, { exercises: routine.exercises })) throw new Error('Übungen konnten nicht gesichert werden.');
    setPicking(false);
    await load(); onReload?.();
  }
  async function saveNote() {
    const text = (note ?? '').trim();
    if (text === (detail.description || '')) { setNote(null); return; }
    if (!await updateMacrocycle(uid, plan.id, { description: text })) throw new Error('Hinweis konnte nicht gespeichert werden.');
    await load();
  }
  async function copyTo(toUid) {
    if (!toUid) return;
    await copyPlanToClient({ fromUid: uid, planId: plan.id, toUid, coachUid: getUid() });
    setCopyOpen(false);
    setCopied(clients.find(([id]) => id === toUid)?.[1] || toUid);
  }
  if (!detail) return <div className="rounded-2xl border border-fit-line p-4 text-sm text-fit-muted">{error ? <p role="alert">{error}<button onClick={load} className="ml-2 underline">Erneut versuchen</button></p> : 'Trainingsplan lädt…'}</div>;
  const routines = detail.routines || [];
  const next = pickNextPlanRoutine(routines, workouts);
  const targets = routines.filter((r) => r.targetCount > 0 && r.targetPeriodDays > 0);
  const met = targets.length > 0 && targets.every((r) => countCompletionsInPeriod(r.sourceTemplateId, workouts, r.targetPeriodDays) >= r.targetCount);
  return (
    <article className="rounded-2xl border border-fit-line bg-fit-card p-4">
      <header className="mb-3 flex items-start justify-between gap-2"><div><p className="text-xs text-fit-accent">{fromCoach ? 'Von deinem Coach' : clientUid ? (detail.status === 'draft' ? 'Entwurf · noch nicht als Plan bereitgestellt' : 'Für diesen Klienten bereitgestellt') : 'Dein Trainingsplan'}</p><h3 className="mt-1 flex items-center gap-2 text-lg font-semibold">{detail.name}{met && <CheckCircle2 size={17} className="text-green-500" />}</h3></div>{canEdit && <button disabled={busy} aria-label={`${detail.name} löschen`} onClick={() => { if (confirm('Trainingsplan löschen? Die Workout-Vorlagen bleiben erhalten.')) act(async () => { if (!await deleteMacrocycle(uid, plan.id)) throw new Error('Löschen fehlgeschlagen.'); onReload?.(); }); }} className="p-2 text-fit-muted hover:text-fit-red"><Trash2 size={15} /></button>}</header>
      {!clientUid && detail.description && <p className="mb-4 whitespace-pre-wrap rounded-xl border border-fit-accent/30 bg-fit-accent/10 p-3 text-sm"><span className="mb-1 block text-xs font-semibold text-fit-accent">{fromCoach ? 'Hinweis von deinem Coach' : 'Hinweis'}</span>{detail.description}</p>}
      {clientUid && <label className="mb-4 block text-xs font-semibold text-fit-muted">Hinweis für den Klienten<textarea aria-label="Hinweis für den Klienten" rows={3} maxLength={2000} placeholder="Ziel, Ablauf, worauf zu achten ist …" value={note ?? detail.description ?? ''} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== null && act(saveNote)} className="mt-1 w-full rounded-xl border border-fit-line bg-fit-bg p-3 text-sm font-normal text-fit-ink" /></label>}
      {clientUid && detail.status === 'draft' && <button disabled={busy} onClick={() => act(async () => { if (!await publishMacrocycle(uid, plan.id)) throw new Error('Bereitstellen fehlgeschlagen.'); await load(); onReload?.(); })} className="mb-4 w-full rounded-xl bg-fit-accent py-3 text-sm font-semibold text-fit-bg disabled:opacity-50">Trainingsplan für Klienten bereitstellen</button>}
      {clientUid && detail.status !== 'draft' && <button disabled={busy} onClick={() => { if (confirm('Plan zurück in den Entwurf setzen? Der Klient sieht ihn dann nicht mehr.')) act(async () => { if (!await updateMacrocycle(uid, plan.id, { status: 'draft' })) throw new Error('Zurückziehen fehlgeschlagen.'); await load(); onReload?.(); }); }} className="mb-3 flex items-center gap-1.5 text-xs text-fit-muted underline"><Undo2 size={13} /> Zurück in den Entwurf setzen</button>}
      {error && <p role="alert" className="mb-3 text-sm text-fit-red">{error}</p>}
      {hasSchedule(routines) && <div aria-label="Wochenplan" className="mb-3 grid grid-cols-7 gap-1">{weekGrid(routines).map((d) => <div key={d.day} className={`rounded-lg border p-1.5 text-center ${d.day === weekdayIndex() ? 'border-fit-accent bg-fit-accent/10' : 'border-fit-line'}`}><span className="block text-[10px] font-semibold uppercase text-fit-muted">{d.label}</span>{d.routines.length ? d.routines.map((r) => <span key={r.id} className="block truncate text-[11px] font-medium">{r.label}</span>) : <span className="block text-[11px] text-fit-dim">–</span>}</div>)}</div>}
      {!clientUid && hasSchedule(routines) && (() => { const open = todaysOpenRoutines(routines, workouts); return open.length ? <p className="mb-3 text-xs text-fit-accent">Heute geplant: <span className="font-semibold">{open.map((r) => r.label).join(' + ')}</span></p> : <p className="mb-3 text-xs text-fit-muted">Heute ist nichts offen.</p>; })()}
      {met ? <p className="mb-3 text-xs text-green-500">Alle Zeitraumziele erreicht.</p> : next && <p className="mb-3 text-xs text-fit-muted">Als Nächstes empfohlen: <span className="text-fit-ink">{next.label}</span></p>}
      {!routines.length && <p className="mb-3 text-sm text-fit-muted">Füge eine Workout-Vorlage hinzu, um den Plan startklar zu machen.</p>}
      <div className="space-y-3">{routines.map((r) => <div key={r.id} className="rounded-xl border border-fit-line bg-fit-bg p-3">
        <div className="flex items-start justify-between gap-2"><button aria-expanded={preview === r.id} onClick={() => setPreview(preview === r.id ? null : r.id)} className="flex flex-1 items-center justify-between gap-2 text-left font-medium"><span>{r.label}<span className="mt-1 block text-xs font-normal text-fit-muted">{r.exercises?.length || 0} Übungen</span></span><ChevronDown size={16} /></button>{canEdit && <button disabled={busy} aria-label={`${r.label} aus Plan entfernen`} onClick={() => act(async () => { if (!await deleteRoutine(uid, plan.id, r.id)) throw new Error('Entfernen fehlgeschlagen.'); await load(); })} className="p-1 text-fit-muted"><Trash2 size={13} /></button>}</div>
        {clientUid && <div role="group" aria-label={`Wochentage ${r.label}`} className="my-2 flex gap-1">{WEEKDAY_LABELS.map((l, d) => { const on = r.weekdays?.includes(d); return <button key={d} type="button" aria-pressed={!!on} disabled={busy} onClick={() => act(async () => { if (!await updateRoutine(uid, plan.id, r.id, { weekdays: toggleWeekday(r.weekdays, d) })) throw new Error('Wochentage konnten nicht gespeichert werden.'); await load(); })} className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ${on ? 'bg-fit-accent text-fit-bg' : 'border border-fit-line text-fit-muted'}`}>{l}</button>; })}</div>}
        {r.targetCount > 0 && <p className="my-2 flex items-center gap-1 text-xs text-fit-accent"><Target size={12} /> {countCompletionsInPeriod(r.sourceTemplateId, workouts, r.targetPeriodDays)}/{r.targetCount} in {r.targetPeriodDays} Tagen</p>}
        {preview === r.id && <ol className="my-3 space-y-2 text-sm">{(r.exercises || []).map((ex, i) => <li key={ex.id || i} className="flex justify-between gap-2"><span>{ex.name}</span><span className="text-xs text-fit-muted">{ex.templateSets?.length || ex.target_sets || 3} Sätze</span></li>)}</ol>}
        {r.sourceTemplateId && <WeekSlider readOnly templateId={r.sourceTemplateId} workouts={workouts} />}
        {!clientUid && onStart && <button disabled={busy} onClick={() => act(() => onStart(r.sourceTemplateId, { sourcePlanId: plan.id, sourcePlanRoutineId: r.id, name: r.label, ...(r.exercises?.length ? { routine_snapshot: { name: r.label, exercises: r.exercises } } : {}) }))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-fit-accent py-2.5 text-sm font-semibold text-fit-bg disabled:opacity-50"><Play size={14} /> Training starten</button>}
      </div>)}</div>
      {clientUid && clients.length > 1 && !!routines.length && (copyOpen
        ? <label className="mt-3 block text-xs font-semibold text-fit-muted">Kopie als Entwurf anlegen für
            <select aria-label="Plan kopieren an" disabled={busy} defaultValue="" onChange={(e) => act(() => copyTo(e.target.value))} className="mt-1 w-full rounded-xl border border-fit-line bg-fit-bg p-3 text-sm font-normal text-fit-ink"><option value="">Klient wählen…</option>{clients.filter(([id]) => id !== uid).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          </label>
        : <button disabled={busy} onClick={() => { setCopied(''); setCopyOpen(true); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-fit-line p-3 text-sm text-fit-muted"><Copy size={14} /> An weiteren Klienten kopieren</button>)}
      {copied && <p role="status" className="mt-2 text-xs text-green-500">Als Entwurf für {copied} angelegt — dort prüfen und bereitstellen.</p>}
      {canEdit && (picking ? <div className="mt-3"><TemplatePicker templates={templates} onPick={(t) => act(() => pickTemplate(t))} onCancel={() => setPicking(false)} /></div> : <button disabled={busy} onClick={() => setPicking(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-fit-line p-3 text-sm text-fit-accent"><Plus size={14} /> Workout-Vorlage hinzufügen</button>)}
    </article>
  );
}
