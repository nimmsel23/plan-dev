import { phaseProgress } from '../lib/phaseProgress.js';

const STATE = { past: 'abgeschlossen', current: 'läuft', upcoming: 'kommt' };

// Coach-Ansicht: Fortschritt des Klienten je Phase (nur wenn der Plan Phasen hat).
export default function PhaseProgress({ plan, workouts }) {
  const rows = phaseProgress(plan, workouts);
  if (!rows.length) return null;
  return <section aria-label="Fortschritt je Phase" className="mb-4 rounded-xl border border-fit-line bg-fit-bg p-3">
    <h4 className="mb-2 text-sm font-semibold">Fortschritt je Phase</h4>
    <ul className="space-y-2">{rows.map((r) => {
      const pct = r.dueSoFar > 0 ? Math.min(100, Math.round((r.done / r.dueSoFar) * 100)) : 0;
      return <li key={r.id} className="text-xs">
        <div className="flex justify-between gap-2"><span className="font-semibold">{r.name} <span className="font-normal text-fit-muted">W{r.startWeek}–{r.endWeek} · {STATE[r.state]}</span></span><span>{r.done}/{r.planned}{r.avgEffort != null ? ` · Ø ${r.avgEffort}/10` : ''}</span></div>
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} Soll bisher erfüllt`} className="mt-1 h-1.5 overflow-hidden rounded-full bg-fit-line"><div style={{ width: `${pct}%` }} className="h-full bg-fit-accent" /></div>
      </li>;
    })}</ul>
  </section>;
}
