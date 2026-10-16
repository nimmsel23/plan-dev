import { X, ExternalLink } from 'lucide-react';
import ExercisePhotoStrip from '../../../components/ExercisePhotoStrip.jsx';
import { muskelDe } from '../../../lib/kb/muscles.js';
import { useEscapeKey } from '../../../hooks/useEscapeKey.js';

export default function CatalogDetail({ exercise, onClose, onAdd }) {
  useEscapeKey(onClose, true);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-2 sm:items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={exercise.name} className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-fit-line bg-fit-bg p-5" onClick={(e) => e.stopPropagation()}>
        <header className="mb-4 flex items-start gap-3">
          <div className="flex-1"><p className="text-xs text-fit-muted">Yuhonas · Übungsdetails</p><h2 className="text-xl font-bold">{exercise.name}</h2></div>
          <button onClick={onClose} aria-label="Übungsdetails schließen" className="p-2"><X size={20} /></button>
        </header>
        <ExercisePhotoStrip ex={exercise} className="mb-4 h-52" />
        <p className="mb-2 text-sm text-fit-muted">{exercise.equipment.join(' · ') || 'Ohne Equipment-Angabe'}</p>
        <p className="mb-4 text-sm">{exercise.primaryMuscles.map(muskelDe).join(' · ')}</p>
        <h3 className="mb-2 text-sm font-semibold">Ausführung · Originaltext</h3>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-fit-dim">{exercise.instructions.map((step, i) => <li key={i}>{step}</li>)}</ol>
        {!exercise.instructions.length && <p className="text-sm text-fit-muted">Keine Anleitung hinterlegt.</p>}
        <a href="https://vos-atlas.web.app" target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center gap-2 text-sm text-fit-accent"><ExternalLink size={14} /> VOS Atlas öffnen</a>
        {onAdd && <button onClick={() => onAdd(exercise)} className="mt-4 w-full rounded-xl bg-fit-accent py-3 font-semibold text-fit-bg">Übung hinzufügen</button>}
      </section>
    </div>
  );
}
