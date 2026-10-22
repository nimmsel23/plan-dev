import { useState } from 'react';

const whole = (v) => /^\d+$/.test(String(v).trim()) && Number(v) >= 1;

// Kleines Inline-Formular statt prompt(): Häufigkeit und Zeitraum (ganze Zahlen ≥ 1) für eine Vorlage.
export default function TemplateTargetForm({ name, disabled, onSubmit, onCancel }) {
  const [count, setCount] = useState('1');
  const [days, setDays] = useState('7');
  const valid = whole(count) && whole(days);
  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-card p-3 text-sm font-normal text-fit-ink';
  return <form onSubmit={(e) => { e.preventDefault(); if (valid && !disabled) onSubmit({ count: Number(count), days: Number(days) }); }} className="space-y-3 rounded-xl border border-fit-line bg-fit-bg p-3">
    <p className="text-sm font-semibold">„{name}“ im Plan</p>
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs font-semibold text-fit-muted">Wie oft?<input aria-label="Häufigkeit" type="number" inputMode="numeric" min={1} step={1} value={count} onChange={(e) => setCount(e.target.value)} className={field} /></label>
      <label className="text-xs font-semibold text-fit-muted">In wie vielen Tagen?<input aria-label="Zeitraum in Tagen" type="number" inputMode="numeric" min={1} step={1} value={days} onChange={(e) => setDays(e.target.value)} className={field} /></label>
    </div>
    {!valid && <p role="alert" className="text-xs text-fit-red">Bitte ganze Zahlen ab 1 eingeben.</p>}
    <div className="flex gap-2">
      <button type="submit" disabled={!valid || disabled} className="min-h-[44px] flex-1 rounded-xl bg-fit-accent text-sm font-semibold text-fit-bg disabled:opacity-50">Hinzufügen</button>
      <button type="button" onClick={onCancel} className="min-h-[44px] rounded-xl border border-fit-line px-4 text-sm text-fit-muted">Abbrechen</button>
    </div>
  </form>;
}
