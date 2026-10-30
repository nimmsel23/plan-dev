import { useEffect, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateMacrocycle, getUid } from '@db';
import ExerciseSearch from './components/ExerciseSearch.jsx';
import ExerciseRow from './components/ExerciseRow.jsx';
import { patchTemplateSets, ensureTemplateSets } from './lib/templateSets.js';
import { WEEKDAY_LABELS, toggleWeekday } from './lib/weekSchedule.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const id = () => crypto.randomUUID();
const input = 'mt-1 min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-bg p-3 text-base';
const button = 'min-h-[44px] rounded-xl border border-fit-line px-3 py-2 text-sm disabled:opacity-40';
const newDay = (label) => ({ id: id(), label, exercises: [], weekdays: [], targetCount: 1, targetPeriodDays: 7, sourceTemplateId: null });
const editable = (plan) => clone({ name: plan.name || '', description: plan.description || '', totalWeeks: plan.totalWeeks || 10, routines: plan.routines || [] });

// Separate composition surface; only the final atomic save touches the remote working copy.
export default function PlanEditor({ plan, uid, templates = [], apiClient, onClose, onSaved }) {
  const key = `plan-composer:v1:${getUid()}:${uid}:${plan.id}`;
  const [draft, setDraft] = useState(() => editable(plan));
  const [base, setBase] = useState(plan.updatedAt || null);
  const [recovery, setRecovery] = useState(null);
  const [active, setActive] = useState(plan.routines?.[0]?.id || '');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [saved, setSaved] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const saving = useRef(false);
  const touched = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(editable(plan));
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached?.draft && Array.isArray(cached.draft.routines)) setRecovery(cached);
    } catch { setStorageError('Lokaler Entwurf kann nicht gelesen werden.'); }
  }, [key]);
  useEffect(() => {
    if (recovery || saved) return;
    if (!dirty) {
      if (touched.current) { try { localStorage.removeItem(key); } catch { setStorageError('Lokaler Entwurf konnte nicht entfernt werden.'); } }
      return;
    }
    try { localStorage.setItem(key, JSON.stringify({ draft, base })); setStorageError(''); }
    catch { setStorageError('Automatisches Speichern auf diesem Gerät fehlgeschlagen. Bitte Entwurf sichern.'); }
  }, [draft, base, key, recovery, saved, dirty]);
  useEffect(() => {
    const warn = (event) => { if ((dirty && !saved) || recovery) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saved, recovery]);
  function change(fn) { touched.current = true; setSaved(false); setDraft(fn); }
  function patchDay(dayId, fn) { change((d) => ({ ...d, routines: d.routines.map((r) => r.id === dayId ? fn(r) : r) })); }
  function addDay(day) { change((d) => ({ ...d, routines: [...d.routines, day] })); setActive(day.id); }
  async function importTemplate() {
    if (!templateId || busy) return;
    setBusy(true); setError('');
    try {
      const { routine } = await apiClient.get(`/routines/${encodeURIComponent(templateId)}`);
      addDay({ ...newDay(routine.name), exercises: clone(routine.exercises || []).map((ex) => ({ ...ex, id: id() })) });
      setTemplateId('');
    } catch (err) { setError(err.message || 'Vorlage konnte nicht geladen werden.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (saving.current) return;
    if (!draft.name.trim() || draft.routines.some((r) => !r.label.trim())) { setError('Bitte Plan und alle Trainingstage benennen.'); return; }
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await updateMacrocycle(uid, plan.id, { ...draft, expectedUpdatedAt: base });
      if (!result) throw new Error('Entwurf konnte nicht gespeichert werden.');
      setBase(result.updatedAt); setSaved(true);
      try { localStorage.removeItem(key); } catch { /* Remote save succeeded. */ }
      onSaved?.(result);
    } catch (err) { setError(err.message || 'Speichern fehlgeschlagen. Dein lokaler Entwurf bleibt erhalten.'); }
    finally { saving.current = false; setBusy(false); }
  }
  const day = draft.routines.find((r) => r.id === active);
  return <section aria-label="Trainingsplan-Editor" className="space-y-4 rounded-2xl border border-fit-line bg-fit-card p-4">
    <header className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-fit-card p-1">
      <button className={button} disabled={busy} onClick={onClose}>Zurück · Entwurf behalten</button>
      <button className={button} disabled={!!recovery || busy} onClick={() => setPreview(!preview)}>{preview ? 'Weiter bearbeiten' : 'Klientenvorschau'}</button>
      <button className={`${button} bg-fit-accent text-fit-bg`} disabled={busy || !!recovery} onClick={save}>{busy ? 'Speichert…' : 'Entwurf sichern'}</button>
    </header>
    <div><h2 className="text-xl font-semibold">{preview ? draft.name : 'Trainingsplan gestalten'}</h2><p role="status" className="mt-1 text-xs text-fit-muted">{saved ? 'Entwurf gesichert. Zurück zum Plan, um ihn freizugeben.' : 'Änderungen bleiben bis zur Freigabe privat. Entwurf wird auf diesem Gerät automatisch gespeichert.'}</p></div>
    {error && <p role="alert" className="text-sm text-fit-red">{error}</p>}
    {storageError && <p role="alert" className="text-sm text-fit-red">{storageError}</p>}
    {recovery && <div className="rounded-xl border border-fit-accent p-3"><p>Auf diesem Gerät liegt ein ungesicherter Entwurf vor.</p>{recovery.base !== (plan.updatedAt || null) && <p className="mt-2 text-sm">Der Plan wurde inzwischen geändert. Dieser Entwurf kann nicht über den neueren Stand gespeichert werden. Verwirf ihn, um den aktuellen Stand zu bearbeiten.</p>}<div className="mt-3 flex flex-wrap gap-2"><button className={button} onClick={() => { setDraft(recovery.draft); setBase(recovery.base); setActive(recovery.draft.routines[0]?.id || ''); setRecovery(null); }}>Entwurf wieder aufnehmen</button><button className={button} onClick={() => { try { localStorage.removeItem(key); setRecovery(null); } catch { setStorageError('Entwurf konnte nicht entfernt werden.'); } }}>Lokalen Entwurf verwerfen</button></div></div>}
    <fieldset disabled={busy || !!recovery} className="min-w-0 space-y-4 disabled:opacity-60">
      {preview ? <><p className="whitespace-pre-wrap text-sm">{draft.description}</p><p className="text-xs text-fit-muted">{draft.totalWeeks} Wochen · {draft.routines.length} Trainingstage</p>{draft.routines.map((r) => <article key={r.id} className="rounded-xl border border-fit-line p-3"><h3 className="font-semibold">{r.label}</h3><p className="text-xs text-fit-muted">{r.weekdays?.length ? r.weekdays.map((d) => WEEKDAY_LABELS[d]).join(' · ') : 'Flexibler Trainingstag'}</p><ol className="mt-3 space-y-3">{r.exercises.map((ex) => <li key={ex.id}><strong>{ex.name}</strong><ul className="text-sm text-fit-muted">{ensureTemplateSets(ex).map((s, i) => <li key={i}>Satz {i + 1}: {s.targetDuration ? `${s.targetDuration} s` : `${s.targetReps} Wdh.`}{s.targetWeight != null ? ` · ${s.targetWeight} kg` : ''}</li>)}</ul><p className="text-xs text-fit-muted">Pause: {ex.rest_seconds ?? 90} s{ex.rir != null ? ` · RIR ${ex.rir}` : ''}</p>{ex.notes && <p className="whitespace-pre-wrap text-sm">{ex.notes}</p>}</li>)}</ol>{!r.exercises.length && <p className="text-sm text-fit-muted">Noch keine Übungen.</p>}</article>)}</> : <>
        <label className="block text-sm">Planname<input className={input} maxLength={80} value={draft.name} onChange={(e) => change((d) => ({ ...d, name: e.target.value }))} /></label>
        <label className="block text-sm">Ziel und Hinweise<textarea className={input} rows={3} maxLength={2000} value={draft.description} onChange={(e) => change((d) => ({ ...d, description: e.target.value }))} /></label>
        <label className="block text-sm">Dauer in Wochen<input className={input} type="number" min="1" max="104" value={draft.totalWeeks} onChange={(e) => change((d) => ({ ...d, totalWeeks: Math.max(1, Math.min(104, Number(e.target.value) || 1)) }))} /></label>
        <div role="group" aria-label="Trainingstage" className="flex flex-wrap gap-2">{draft.routines.map((r) => <button key={r.id} className={`${button} ${active === r.id ? 'border-fit-accent text-fit-accent' : ''}`} aria-pressed={active === r.id} onClick={() => setActive(r.id)}>{r.label || 'Unbenannter Tag'}</button>)}<button className={button} onClick={() => addDay(newDay(`Training ${draft.routines.length + 1}`))}>+ Trainingstag</button></div>
        {!!templates.length && <div className="flex flex-wrap gap-2"><select aria-label="Workout-Vorlage übernehmen" className={`${input} flex-1`} value={templateId} onChange={(e) => setTemplateId(e.target.value)}><option value="">Aus Vorlage starten…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><button className={button} disabled={!templateId} onClick={importTemplate}>Übernehmen</button></div>}
        {!day && <p className="text-sm text-fit-muted">Lege deinen ersten Trainingstag an oder übernimm eine Vorlage.</p>}
        {day && <section className="space-y-4" aria-label="Trainingstag bearbeiten">
          <label className="block text-sm">Name des Trainingstags<input className={input} maxLength={80} value={day.label} onChange={(e) => patchDay(day.id, (r) => ({ ...r, label: e.target.value }))} /></label>
          <div className="flex flex-wrap gap-2"><button className={button} onClick={() => addDay({ ...clone(day), id: id(), label: `${day.label} (Kopie)`, exercises: day.exercises.map((ex) => ({ ...clone(ex), id: id() })) })}>Tag duplizieren</button>{[-1, 1].map((step) => { const i = draft.routines.findIndex((r) => r.id === day.id); return <button key={step} className={button} disabled={i + step < 0 || i + step >= draft.routines.length} onClick={() => change((d) => ({ ...d, routines: arrayMove(d.routines, i, i + step) }))}>{step < 0 ? 'Tag nach vorne' : 'Tag nach hinten'}</button>; })}<button className={button} onClick={() => { if (!confirm('Trainingstag aus dem Entwurf entfernen?')) return; change((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== day.id) })); setActive(draft.routines.find((r) => r.id !== day.id)?.id || ''); }}>Tag entfernen</button></div>
          <div role="group" aria-label="Geplante Wochentage" className="grid grid-cols-7 gap-1">{WEEKDAY_LABELS.map((label, i) => <button key={i} aria-pressed={day.weekdays?.includes(i) || false} className={`min-h-[44px] rounded-lg border text-xs ${day.weekdays?.includes(i) ? 'border-fit-accent text-fit-accent' : 'border-fit-line'}`} onClick={() => patchDay(day.id, (r) => ({ ...r, weekdays: toggleWeekday(r.weekdays, i) }))}>{label}</button>)}</div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active: a, over }) => { if (!over || a.id === over.id) return; patchDay(day.id, (r) => ({ ...r, exercises: arrayMove(r.exercises, r.exercises.findIndex((ex) => ex.id === a.id), r.exercises.findIndex((ex) => ex.id === over.id)) })); }}><SortableContext items={day.exercises.map((ex) => ex.id)} strategy={verticalListSortingStrategy}><div className="space-y-3">{day.exercises.map((ex) => <ExerciseRow key={ex.id} ex={ex} onDelete={() => patchDay(day.id, (r) => ({ ...r, exercises: r.exercises.filter((x) => x.id !== ex.id) }))} onPatch={(field, value) => patchDay(day.id, (r) => ({ ...r, exercises: r.exercises.map((x) => x.id !== ex.id ? x : field === 'templateSets' ? patchTemplateSets(x, () => value) : { ...x, [field]: value }) }))} />)}</div></SortableContext></DndContext>
          <ExerciseSearch onAdd={(ex) => patchDay(day.id, (r) => ({ ...r, exercises: [...r.exercises, patchTemplateSets({ ...clone(ex), id: id(), exercise_id: ex.id, rest_seconds: 90, notes: '', rir: null }, (sets) => sets)] }))} />
        </section>}
      </>}
    </fieldset>
  </section>;
}
