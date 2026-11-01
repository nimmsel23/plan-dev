import { useEffect, useState } from 'react';
import { planResponses } from '../lib/planResponses.js';

const time = (value) => value?.toDate?.().toLocaleString('de-AT') || '';

// Key the component by client/plan/version when embedding it in another view.
export default function PlanFeedback({ clientUid, plan, coach = false, store = planResponses }) {
  const [state, setState] = useState({ receipt: null, entries: [], loading: true, fromCache: true });
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setError(''); setText(''); setNotice('');
    setState({ receipt: null, entries: [], loading: true, fromCache: true });
    const stop = store.watch(clientUid, plan, (value) => { if (active) setState(value); }, () => {
      if (active) { setError('Plan-Rückmeldungen konnten nicht geladen werden. Bitte Verbindung und Freigabe prüfen.'); setState((s) => ({ ...s, loading: false })); }
    });
    return () => { active = false; stop(); };
  }, [clientUid, plan.id, plan.headVersion, store]);
  async function act(action) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err.message || 'Speichern fehlgeschlagen. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  }
  const confirmed = state.receipt && !state.receipt.pending;
  return <section aria-label={`Rückmeldung zu Planversion ${plan.headVersion}`} className="space-y-3 rounded-2xl border border-fit-line bg-fit-card p-4">
    <header><h3 className="font-semibold">Rückmeldung zum Trainingsplan</h3><p className="mt-1 text-sm text-fit-muted">{plan.name} · Version {plan.headVersion}</p></header>
    <p role="status" className="text-sm text-fit-muted">{confirmed ? `${coach ? 'Vom Klienten bestätigt' : 'Empfang bestätigt'}${time(state.receipt.readAt) ? ` · ${time(state.receipt.readAt)}` : ''}` : state.loading ? 'Empfangsstatus lädt…' : state.fromCache ? 'Empfangsstatus noch nicht online geprüft' : 'Empfang noch nicht bestätigt'}</p>
    {!coach && !confirmed && <button disabled={busy || state.loading} type="button" className="min-h-[44px] rounded-xl border border-fit-line px-4 text-sm disabled:opacity-50" onClick={() => act(async () => { await store.confirm(clientUid, plan); setNotice('Empfang dieser Planversion bestätigt.'); })}>Plan gelesen – Empfang bestätigen</button>}
    <p className="text-xs text-fit-muted">Fragen zu Übungen, Vorgaben oder Ablauf bleiben dieser Version zugeordnet.</p>
    {state.fromCache && !state.loading && <p className="text-xs text-fit-muted">Gespeicherter Gerätestand. Online-Änderungen werden nach Verbindung geladen.</p>}
    <ol className="space-y-2" aria-label="Plan-Rückmeldungen">{state.entries.map((entry) => <li key={entry.id} className="rounded-xl border border-fit-line p-3"><p className="text-xs text-fit-muted">{entry.senderRole === 'coach' ? 'Coach' : 'Klient'} · {entry.pending ? 'Wird gespeichert…' : time(entry.createdAt)}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.body}</p></li>)}</ol>
    {!state.loading && !state.entries.length && !error && <p className="text-sm text-fit-muted">Noch keine Rückmeldung zu dieser Version.</p>}
    {state.entries.length === 50 && <p className="text-xs text-fit-muted">Die letzten 50 Rückmeldungen dieser Version.</p>}
    <form onSubmit={(event) => { event.preventDefault(); act(async () => { await store.send(clientUid, plan, text, coach); setText(''); setNotice('Rückmeldung zum Plan gespeichert.'); }); }} className="space-y-2">
      <label className="block text-sm">{coach ? 'Antwort zum Plan' : 'Deine Rückmeldung zum Plan'}<textarea aria-label={coach ? 'Antwort zum Plan' : 'Deine Rückmeldung zum Plan'} maxLength={2000} rows={3} value={text} onChange={(event) => setText(event.target.value)} disabled={busy} placeholder={coach ? 'Frage beantworten oder Vorgaben erklären …' : 'Zum Beispiel: Welche Alternative gibt es für die Klimmzüge?'} className="mt-1 w-full rounded-xl border border-fit-line bg-fit-bg p-3 text-base" /></label>
      <button disabled={busy || !text.trim()} className="min-h-[44px] rounded-xl bg-fit-accent px-4 text-sm font-semibold text-fit-bg disabled:opacity-50">{busy ? 'Speichert…' : coach ? 'Antwort speichern' : 'Rückmeldung senden'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-fit-red">{error}</p>}{notice && <p role="status" className="text-sm text-fit-accent">{notice}</p>}
  </section>;
}
