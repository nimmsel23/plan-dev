import { useState } from 'react';
import { Trophy, Clock, Dumbbell, Layers } from "lucide-react";
import { effortLabel, normFeedback } from "../lib/workoutFeedback.js";
import { formatDuration, formatKg, formatSet, groupWorkoutSets, bestSet, workoutTotals } from "../lib/history.js";

// Strong-Abschluss-Screen nach "Fertig": Dauer, Volumen, Sätze, neue
// persönliche Rekorde und bester Satz pro Übung.
export default function WorkoutSummary({ workout, prs = [], onDone, onSaveTemplate, onUpdateTemplate, onSaveFeedback }) {
  const [effort, setEffort] = useState(workout.feedback?.effort || 0);
  const [note, setNote] = useState(workout.feedback?.note || '');
  const [fbState, setFbState] = useState(workout.feedback ? 'saved' : '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(action, done) {
    setBusy(true); setMessage('');
    try { await action(); setMessage(done); } catch (err) { setMessage(err.message || 'Vorlage konnte nicht gespeichert werden.'); } finally { setBusy(false); }
  }
  const totals = workoutTotals(workout);
  const groups = groupWorkoutSets(workout);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500">
          <Trophy size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Gut gemacht!</h1>
        <p className="mt-1 text-sm text-fit-muted">{workout.name}</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <Stat icon={<Clock size={16} />} label="Dauer" value={formatDuration(totals.durationMs)} />
        <Stat icon={<Dumbbell size={16} />} label="Volumen" value={`${formatKg(totals.volume)} kg`} />
        <Stat icon={<Layers size={16} />} label="Sätze" value={totals.sets} />
      </div>

      {prs.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fit-muted">Neue Rekorde ({prs.length})</h2>
          <div className="flex flex-col gap-1.5">
            {prs.map((pr, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm">
                <Trophy size={14} className="shrink-0 text-yellow-500" />
                <span className="flex-1 truncate">{pr.name} · {pr.kind}</span>
                <span className="font-mono font-semibold">{pr.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-xl border border-fit-line bg-fit-card p-3">
        <div className="mb-2 grid grid-cols-[1fr_auto] text-[10px] font-bold uppercase tracking-wide text-fit-muted">
          <span>Übung</span><span>Bester Satz</span>
        </div>
        {groups.length === 0 && <p className="text-sm text-fit-muted">Keine Sätze abgehakt.</p>}
        {groups.map((g) => (
          <div key={g.exercise_id || g.name} className="grid grid-cols-[1fr_auto] gap-2 py-1 text-sm">
            <span className="truncate">{g.sets.length} × {g.name}</span>
            <span className="font-mono text-fit-muted">{formatSet(bestSet(g.sets))}</span>
          </div>
        ))}
      </section>

      {onSaveFeedback && <section className="mb-5 rounded-xl border border-fit-line p-4">
        <h2 className="text-sm font-semibold">Wie war das Training?</h2>
        <p className="my-1 text-xs text-fit-muted">Dein Coach sieht deine Rückmeldung.</p>
        <div role="group" aria-label="Anstrengung 1 bis 10" className="mt-2 grid grid-cols-10 gap-1">{[1,2,3,4,5,6,7,8,9,10].map((n) => <button key={n} aria-pressed={effort === n} onClick={() => { setEffort(effort === n ? 0 : n); setFbState(''); }} className={`min-h-[44px] rounded-lg text-sm font-semibold ${effort === n ? 'bg-fit-accent text-fit-bg' : 'bg-fit-card text-fit-muted'}`}>{n}</button>)}</div>
        <p className="mt-1 h-4 text-xs text-fit-muted">{effort ? `Anstrengung ${effort}/10 · ${effortLabel(effort)}` : ''}</p>
        <textarea value={note} maxLength={1000} onChange={(e) => { setNote(e.target.value); setFbState(''); }} aria-label="Notiz an den Coach" placeholder="Notiz an den Coach (optional): Schmerzen, Gewichte zu leicht/schwer …" rows={3} className="mt-2 w-full rounded-xl border border-fit-line bg-fit-bg p-3 text-sm" />
        <button disabled={busy || fbState === 'saved' || !normFeedback({ effort, note })} onClick={async () => { setBusy(true); setFbState(''); try { await onSaveFeedback(normFeedback({ effort, note })); setFbState('saved'); } catch { setFbState('error'); } finally { setBusy(false); } }} className="mt-2 min-h-[44px] rounded-xl bg-fit-card px-4 text-sm font-semibold text-fit-accent disabled:opacity-50">{fbState === 'saved' ? 'Gesendet ✓' : 'Rückmeldung senden'}</button>
        {fbState === 'error' && <p role="alert" className="mt-2 text-sm text-fit-red">Rückmeldung konnte nicht gespeichert werden. Bitte erneut versuchen.</p>}
      </section>}

      {(onSaveTemplate || onUpdateTemplate) && <section className="mb-5 rounded-xl border border-fit-line p-4">
        <h2 className="text-sm font-semibold">Beim nächsten Mal wiederverwenden</h2>
        <p className="my-2 text-xs text-fit-muted">Dein Workout ist gespeichert. Vorlagen ändern sich nur, wenn du es hier auswählst.</p>
        <div className="flex flex-wrap gap-2">
          {onUpdateTemplate && <button disabled={busy} onClick={() => save(onUpdateTemplate, 'Vorlage mit diesen Werten aktualisiert.')} className="rounded-xl bg-fit-card px-3 py-2 text-sm text-fit-accent">Vorlage aktualisieren</button>}
          {onSaveTemplate && <button disabled={busy} onClick={() => save(onSaveTemplate, '')} className="rounded-xl bg-fit-card px-3 py-2 text-sm text-fit-accent">Als neue Vorlage speichern</button>}
        </div>{message && <p role="status" className="mt-2 text-sm">{message}</p>}
      </section>}
      <p className="mb-4 text-center text-xs text-fit-muted">Deine Sätze sind im Verlauf gespeichert. Beim nächsten Training stehen sie als „Vorher“-Werte bereit.</p>
      <button
        disabled={busy}
        onClick={onDone}
        className="w-full rounded-2xl bg-fit-accent py-3.5 text-sm font-semibold text-fit-bg transition-opacity hover:opacity-90"
      >
        Zurück zum Training
      </button>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-fit-line bg-fit-card p-3 text-center">
      <div className="mb-1 flex justify-center text-fit-muted">{icon}</div>
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-fit-muted">{label}</div>
    </div>
  );
}
