import { SET_SCHEMES } from '../lib/planPresets.js';

// Ein Tipp setzt Sätze und Wdh; `label` benennt, worauf das Schema wirkt (für Screenreader).
export default function SchemeChips({ label, onPick, className = '' }) {
  return <div role="group" aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
    {SET_SCHEMES.map((s) => <button key={s.id} type="button" onClick={() => onPick(s)} aria-label={`${label}: ${s.label}`} className="min-h-[44px] rounded-lg border border-fit-line px-3 font-mono text-xs text-fit-muted hover:border-fit-accent hover:text-fit-accent">{s.label}</button>)}
  </div>;
}
