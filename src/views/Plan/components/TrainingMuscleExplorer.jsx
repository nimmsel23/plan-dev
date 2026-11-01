import { useId } from 'react';
import Model from 'react-body-highlighter';
import { getStaticMuscleViz, muskelDe, muscleToRbhSlug } from '../../../lib/kb/muscles.js';
import ExercisePhotoStrip from '../../../components/ExercisePhotoStrip.jsx';
import './TrainingMuscleExplorer.css';

const list = (value) => Array.isArray(value) ? value : value ? [value] : [];
const roles = (ex, role) => [...new Set(list(role === 'primary' ? ex.primaryMuscles || ex.primary_muscles : ex.secondaryMuscles || ex.secondary_muscles).filter((v) => typeof v === 'string' && v))];
const label = (id) => getStaticMuscleViz().labels[id] || muskelDe(id);

export default function TrainingMuscleExplorer({ exercises = [], selectedId = null, onSelect, title = 'Was trainiert diese Einheit?' }) {
  const heading = useId();
  const selected = exercises.find((ex) => ex.id === selectedId);
  const visible = selected ? [selected] : exercises;
  const primary = [...new Set(visible.flatMap((ex) => roles(ex, 'primary')))];
  const secondary = [...new Set(visible.flatMap((ex) => roles(ex, 'secondary')))].filter((m) => !primary.includes(m));
  const highlights = new Map();
  secondary.forEach((id) => { const slug = muscleToRbhSlug(id); if (slug) highlights.set(slug, 1); });
  primary.forEach((id) => { const slug = muscleToRbhSlug(id); if (slug) highlights.set(slug, 2); });
  const data = [...highlights].map(([muscle, frequency]) => ({ name: muscle, muscles: [muscle], frequency }));
  const missing = visible.filter((ex) => !roles(ex, 'primary').length && !roles(ex, 'secondary').length).length;
  const steps = list(selected?.instructions || selected?.coaching_notes || selected?.steps).filter((step) => typeof step === 'string');
  return <section className="training-muscles" aria-labelledby={heading}>
    <header className="training-muscles__header"><div><p className="training-muscles__eyebrow">Körper & Bewegung</p><h3 id={heading}>{selected ? selected.name : title}</h3><p>{selected ? 'Muskelbeteiligung dieser Übung' : `${exercises.length} Übungen · Überblick über den Trainingstag`}</p></div>{selected && <button type="button" onClick={() => onSelect?.(null)}>Gesamtes Workout</button>}</header>
    <div className="training-muscles__layout">
      <div className="training-muscles__anatomy" aria-label={selected ? `Muskelkarte: ${selected.name}` : 'Muskelkarte des Workouts'}>
        <div className="training-muscles__bodies">{[['anterior', 'Vorne'], ['posterior', 'Hinten']].map(([type, name]) => <figure key={type}><Model type={type} data={data} bodyColor="#263344" highlightedColors={['#38bdf8', '#fb923c']} style={{ width: '100%', maxWidth: 150 }} /><figcaption>{name}</figcaption></figure>)}</div>
        <p className="training-muscles__legend"><span><i style={{ background: '#fb923c' }} />Hauptmuskeln</span><span><i style={{ background: '#38bdf8' }} />Unterstützend</span></p>
        <p className="training-muscles__disclaimer">Vereinfachte Körperregionen, keine Messung der Belastung. Die genaue Muskelzuordnung steht daneben.</p>
      </div>
      <div className="training-muscles__detail" aria-live="polite">
        {[['Hauptmuskeln', primary, 'primary'], ['Unterstützende Muskeln', secondary, 'secondary']].map(([name, ids, role]) => <div key={role}><h4>{name}</h4><div className={`training-muscles__chips training-muscles__chips--${role}`}>{ids.length ? ids.map((id) => <span key={id}>{label(id)}</span>) : <p>Keine Angabe hinterlegt.</p>}</div></div>)}
        {!!missing && <p className="training-muscles__notice">{missing === 1 ? 'Für eine Übung fehlt' : `Für ${missing} Übungen fehlt`} die Muskelzuordnung. Es wird keine Zuordnung aus dem Namen geraten.</p>}
        {selected && <><ExercisePhotoStrip ex={selected} className="h-40" />{!!list(selected.equipment).length && <p className="training-muscles__equipment">Equipment · {list(selected.equipment).join(' · ')}</p>}{selected.notes && <div><h4>Dein Coaching-Hinweis</h4><p className="training-muscles__notes">{selected.notes}</p></div>}<div><h4>Ausführung</h4>{steps.length ? <ol>{steps.map((step, i) => <li key={i}>{step}</li>)}</ol> : <p>Keine Ausführungsbeschreibung hinterlegt.</p>}</div></>}
        {!selected && <p className="training-muscles__hint">Wähle eine Übung: Die Karte und die Details wechseln zu ihrer Muskelbeteiligung.</p>}
      </div>
    </div>
    {!!exercises.length && <div className="training-muscles__exercises" role="group" aria-label="Übung für Muskelansicht auswählen"><button type="button" aria-pressed={!selected} onClick={() => onSelect?.(null)}>Gesamtes Workout</button>{exercises.map((ex, index) => <button key={ex.id || index} type="button" aria-pressed={selected?.id === ex.id} onClick={() => onSelect?.(ex.id)}><small>{String(index + 1).padStart(2, '0')}</small>{ex.name}</button>)}</div>}
  </section>;
}
