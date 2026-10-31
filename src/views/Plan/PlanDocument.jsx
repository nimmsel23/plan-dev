import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { prescriptionGroups, pauseLabel, frequencyLabel } from './lib/planDocument.js';
import { WEEKDAY_LABELS } from './lib/weekSchedule.js';
import './PlanDocument.css';

function Target({ value, suffix = '' }) {
  return value == null || value === '' || value === 'offen'
    ? <span className="plan-open-value">offen</span>
    : <>{value}{suffix}</>;
}
function Sheets({ plan, clientName }) {
  const routines = plan.routines || [];
  return routines.map((day, index) => <article key={day.id || index} className="plan-sheet" aria-label={`Trainingsblatt ${day.label}`}>
    <div className="plan-sheet-masthead"><span className="plan-wordmark">VITAL<span>TRAINING</span></span><span>{clientName || 'Trainingsprogramm'}<span className="plan-masthead-separator"> / </span>{plan.totalWeeks} Wochen</span></div>
    <header className="plan-day-heading"><span className="plan-day-letter">{index < 26 ? String.fromCharCode(65 + index) : index + 1}</span><div><p className="plan-eyebrow">Trainingseinheit {String(index + 1).padStart(2, '0')}</p><h2>{day.label.replace(/^[A-Z]\s*[·:-]\s*/, '')}</h2><p className="plan-day-meta">{day.exercises?.length || 0} Übungen{day.weekdays?.length ? ` · ${day.weekdays.map((d) => WEEKDAY_LABELS[d]).join(' / ')}` : ' · Reihenfolge nach Trainingsrhythmus'}</p></div><span className="plan-day-status">{plan.headVersion ? `Version ${plan.headVersion}` : 'Entwurf'}</span></header>
    {day.warmup && <section className="plan-preparation"><span className="plan-section-label">01 / Warm-up</span><p>{day.warmup}</p></section>}
    <div className="plan-training-label"><span className="plan-section-label">{day.warmup ? '02' : '01'} / Training</span><span>Saubere Ausführung · Vorgaben je Übung</span></div>
    <div className="plan-table-scroll" tabIndex={0} role="region" aria-label={`Übungstabelle ${day.label}`}>
      <table className="plan-training-table"><caption className="plan-visually-hidden">Übungen und Trainingsvorgaben für {day.label}</caption><colgroup><col className="plan-col-number" /><col className="plan-col-exercise" /><col className="plan-col-sets" /><col className="plan-col-reps" /><col className="plan-col-weight" /><col className="plan-col-rest" /></colgroup><thead><tr><th scope="col">#</th><th scope="col">Übung</th><th scope="col">Sätze</th><th scope="col">Wdh. / Zeit</th><th scope="col">Gewicht</th><th scope="col">Pause</th></tr></thead>
        {(day.exercises || []).map((ex, i) => { const groups = prescriptionGroups(ex); return <tbody key={ex.id || i} className="plan-exercise-group">
          {groups.map((group, n) => <tr key={n} className={n ? 'plan-extra-set' : undefined}>
            {n === 0 && <><td rowSpan={groups.length} className="plan-exercise-number">{String(i + 1).padStart(2, '0')}</td><th rowSpan={groups.length} scope="row" className="plan-exercise-name">{ex.name}{ex.optional && <span className="plan-exercise-tag">optional</span>}{ex.prescriptionIncomplete && <span className="plan-exercise-tag plan-tag-open">Vorgaben prüfen</span>}{ex.rir != null && <small>RIR {ex.rir}</small>}</th></>}
            <td className="plan-value plan-sets" data-label="Sätze"><Target value={group.count} /></td><td className="plan-value plan-reps" data-label="Wdh. / Zeit"><Target value={group.duration ?? group.reps} suffix={group.duration != null ? ' s' : ''} />{group.type === 'warmup' && <small>Aufwärmsatz</small>}{group.type === 'failure' && <small>Intensivierung</small>}{group.type === 'drop' && <small>Drop-Satz</small>}</td><td className="plan-value plan-weight" data-label="Gewicht">{group.weight == null || group.weight === '' ? <span className="plan-unset-weight">—</span> : `${group.weight} kg`}</td><td className="plan-value plan-rest" data-label="Pause"><Target value={pauseLabel(ex)} /></td>
          </tr>)}
          {ex.notes && <tr className="plan-exercise-note"><td /><td colSpan={5}><span>Hinweis</span> {ex.notes}</td></tr>}
        </tbody>; })}
      </table>
    </div>
    {!day.exercises?.length && <p className="plan-empty">Hier sind noch keine Übungen eingetragen.</p>}
    <p className="plan-table-legend">— keine feste kg-Angabe · <span className="plan-open-value">offen</span> noch zu ergänzen</p>
    {day.finisher && <section className="plan-finisher"><span className="plan-section-label">{day.warmup ? '03' : '02'} / Finisher</span><p>{day.finisher}</p></section>}
    <footer className="plan-sheet-footer"><span>{plan.name}</span><span>Training {index + 1} / {routines.length}</span></footer>
  </article>);
}

export default function PlanDocument({ plan, clientName }) {
  const routines = plan.routines || [];
  const open = routines.reduce((n, r) => n + (r.exercises || []).filter((ex) => ex.prescriptionIncomplete).length, 0);
  return <>
    <section className="plan-document" aria-label="Trainingsplan-Dokument">
      <header className="plan-overview"><div className="plan-overview-top"><span className="plan-eyebrow">Persönlicher Trainingsplan</span><button className="plan-print-button" type="button" onClick={() => window.print()}><Printer size={15} /> Drucken / PDF</button></div>{clientName && <p className="plan-client-name">{clientName}</p>}<h1>{plan.name}</h1><div className="plan-facts"><span><small>Rhythmus</small><strong>{frequencyLabel(routines)}</strong></span><span><small>Zeitraum</small><strong>{plan.totalWeeks} Wochen</strong></span><span><small>Stand</small><strong>{plan.headVersion ? `Version ${plan.headVersion}` : 'Entwurf'}</strong></span></div>{open > 0 && <p className="plan-review-notice">{open} {open === 1 ? 'Übung enthält' : 'Übungen enthalten'} offene Vorgaben. Vor der Freigabe ergänzen.</p>}</header>
      <Sheets plan={plan} clientName={clientName} />
      {plan.description && <details className="plan-program-notes"><summary>Programmhinweise und Herkunft</summary><p>{plan.description}</p></details>}
    </section>
    {typeof document !== 'undefined' && createPortal(<div className="plan-print-root"><Sheets plan={plan} clientName={clientName} /></div>, document.body)}
  </>;
}
