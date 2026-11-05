import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { MICROCYCLE_KINDS, newMicrocycle, normalizeMicrocycles, microcyclesTotalWeeks, microcycleTimeline } from '../lib/microcycles.js';

const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-card p-2 text-sm font-normal text-fit-ink';

// Coach: Mikrozyklen (Mikrozyklen) des Makrozyklus anlegen. Speichern setzt microcycles + totalWeeks in einem PATCH.
export default function MicrocycleEditor({ microcycles, disabled, onSave }) {
  const [draft, setDraft] = useState(() => normalizeMicrocycles(microcycles));
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizeMicrocycles(microcycles));
  const patch = (i, p) => setDraft(draft.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= draft.length) return; const n = [...draft]; [n[i], n[j]] = [n[j], n[i]]; setDraft(n); };
  const total = microcyclesTotalWeeks(draft);
  return <section aria-label="Mikrozyklen" className="mb-4 rounded-xl border border-fit-line bg-fit-bg p-3">
    <h4 className="text-sm font-semibold">Mikrozyklen{total ? <span className="ml-2 text-xs font-normal text-fit-muted">{total} Wochen gesamt</span> : null}</h4>
    {!draft.length && <p className="mt-1 text-xs text-fit-muted">Ohne Mikrozyklen trainiert der Klient jede Woche gleich. Lege z. B. 3 Wochen Aufbau + 1 Woche Deload an.</p>}
    {microcycleTimeline(draft).length > 0 && <div aria-hidden className="mt-2 flex h-2 overflow-hidden rounded-full">{microcycleTimeline(draft).map((p) => <span key={p.id} style={{ flex: p.weeks }} className={`${p.kind === 'deload' ? 'bg-green-500' : p.kind === 'peak' ? 'bg-fit-red' : 'bg-fit-accent'} border-r border-fit-bg opacity-80`} />)}</div>}
    <ol className="mt-3 space-y-3">{draft.map((p, i) => <li key={p.id} className="rounded-xl border border-fit-line p-3">
      <div className="flex items-center gap-1">
        <input aria-label={`Mikrozyklus ${i + 1} Name`} maxLength={60} value={p.name} onChange={(e) => patch(i, { name: e.target.value })} className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-fit-line bg-fit-card p-2 text-sm font-semibold" />
        <button type="button" aria-label="Mikrozyklus nach oben" disabled={i === 0} onClick={() => move(i, -1)} className="p-2 text-fit-muted disabled:opacity-30"><ChevronUp size={16} /></button>
        <button type="button" aria-label="Mikrozyklus nach unten" disabled={i === draft.length - 1} onClick={() => move(i, 1)} className="p-2 text-fit-muted disabled:opacity-30"><ChevronDown size={16} /></button>
        <button type="button" aria-label={`Mikrozyklus ${p.name} entfernen`} onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="p-2 text-fit-muted"><Trash2 size={14} /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-fit-muted">Art<select value={p.kind} onChange={(e) => { const k = e.target.value; patch(i, { kind: k, volumePct: MICROCYCLE_KINDS[k].volumePct, rirDelta: MICROCYCLE_KINDS[k].rirDelta }); }} className={field}>{Object.entries(MICROCYCLE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label className="text-xs font-semibold text-fit-muted">Wochen<input type="number" inputMode="numeric" min="1" max="52" value={p.weeks} onChange={(e) => patch(i, { weeks: e.target.value })} className={field} /></label>
        <label className="text-xs font-semibold text-fit-muted">Volumen %<input type="number" inputMode="numeric" min="30" max="150" step="5" value={p.volumePct} onChange={(e) => patch(i, { volumePct: e.target.value })} className={field} /></label>
        <label className="text-xs font-semibold text-fit-muted">RIR ±<input type="number" inputMode="numeric" min="-3" max="3" value={p.rirDelta} onChange={(e) => patch(i, { rirDelta: e.target.value })} className={field} /></label>
        <label className="col-span-2 text-xs font-semibold text-fit-muted">Gewicht +% pro Woche in der Mikrozyklus<input type="number" inputMode="numeric" min="0" max="10" value={p.weeklyWeightPct ?? 0} onChange={(e) => patch(i, { weeklyWeightPct: e.target.value })} className={field} /></label>
      </div>
      <label className="mt-2 block text-xs font-semibold text-fit-muted">Hinweis<input maxLength={300} value={p.note} onChange={(e) => patch(i, { note: e.target.value })} className={field} /></label>
    </li>)}</ol>
    <div className="mt-3 flex gap-2">
      <button type="button" disabled={disabled || microcyclesTotalWeeks(draft) >= 104} onClick={() => setDraft([...draft, newMicrocycle(draft.length ? 'build' : 'base', 1)])} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-fit-line text-sm text-fit-accent disabled:opacity-50"><Plus size={14} /> Mikrozyklus hinzufügen</button>
      <button type="button" disabled={disabled || !dirty} onClick={() => onSave(normalizeMicrocycles(draft))} className="min-h-[44px] flex-1 rounded-xl bg-fit-accent text-sm font-semibold text-fit-bg disabled:opacity-40">Mikrozyklen speichern</button>
    </div>
  </section>;
}
