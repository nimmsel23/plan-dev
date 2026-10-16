import { useState } from 'react';
import ExercisePhotoStrip from '../../../components/ExercisePhotoStrip.jsx';
import { Plus, Trash2 } from "lucide-react";
import { muskelDe, muskelColor, dedupeMuskeln } from "../../../lib/kb/muscles.js";
import SetRow, { setRowGrid } from "./SetRow.jsx";

// Eine Übung innerhalb der laufenden WorkoutSession: Kopfzeile (Name,
// Muskeln, letzte Performance) + Satzliste (SetRow) + "Satz hinzufügen".
// `previousSets` (optional): Sätze der letzten abgeschlossenen Ausführung —
// schaltet die Strong-"Vorher"-Spalte ein. `onShowHistory` (optional) macht
// den Übungsnamen antippbar (Verlauf/Rekorde der Übung).
export default function ExerciseBlock({ ex, previousSets, onShowHistory, onAddSet, onPatchSet, onDeleteSet, onDeleteExercise, onCompletedSet }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const showPrevious = Array.isArray(previousSets);
  const trackingType = ex.trackingType || "weight_reps";
  return (
    <div className="rounded-xl bg-fit-card border border-fit-line overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex-1 min-w-0">
          {onShowHistory ? (
            <button type="button" onClick={onShowHistory} className="block max-w-full text-left text-sm font-semibold text-fit-accent truncate hover:underline">
              {ex.name}
            </button>
          ) : (
            <div className="text-sm font-semibold text-fit-ink truncate">{ex.name}</div>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {dedupeMuskeln(ex.primaryMuscles).slice(0, 3).map((m) => (
              <span key={m} className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: muskelColor(m) + "22", color: muskelColor(m) }}>
                {muskelDe(m)}
              </span>
            ))}
          </div>
          {ex.lastPerformedAt && (
            <div className="mt-1 text-[11px] text-fit-muted">
              Letztes Mal: {new Date(ex.lastPerformedAt).toLocaleDateString("de-AT")}
            </div>
          )}
        </div>
        <button onClick={onDeleteExercise} className="p-1.5 rounded-lg text-fit-muted hover:text-fit-red hover:bg-red-500/10 transition-all">
          <Trash2 size={14} />
        </button>
      </div>

      {ex.notes && <p className="px-3 pb-3 text-sm text-fit-dim">{ex.notes}</p>}
      {ex.yuhonas_id && <div className="px-3 pb-3"><button onClick={() => setShowInstructions(!showInstructions)} aria-expanded={showInstructions} className="text-xs text-fit-accent">{showInstructions ? 'Anleitung ausblenden' : 'Ausführung ansehen'}</button>{showInstructions && <div className="mt-3"><ExercisePhotoStrip ex={ex} className="h-40" /><ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-fit-muted">{(ex.instructions || []).map((step,i) => <li key={i}>{step}</li>)}</ol></div>}</div>}
      <div className="px-3 pb-2">
        <div className={`grid gap-2 px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-fit-muted ${setRowGrid(trackingType, showPrevious)}`}>
          <span className="text-center">#</span>
          {showPrevious && <span className="text-center">Vorher</span>}
          <span className="text-center">
            {ex.trackingType === "weight_reps" ? "kg" : ex.trackingType === "distance_time" ? "km" : ex.trackingType === "duration" ? "Sek" : "Wdh"}
          </span>
          {ex.trackingType !== "duration" && (
            <span className="text-center">{ex.trackingType === "bodyweight_reps" ? "Stage" : ex.trackingType === "distance_time" ? "Sek" : "Wdh"}</span>
          )}
          <span />
          <span />
        </div>
        {ex.sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            index={i}
            trackingType={trackingType}
            showPrevious={showPrevious}
            previous={showPrevious ? previousSets[i] : undefined}
            onPatch={(patch) => onPatchSet(set.id, patch)}
            onDelete={() => onDeleteSet(set.id)}
            onCompleted={() => onCompletedSet?.(set)}
          />
        ))}
        <button
          onClick={onAddSet}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-fit-accent hover:bg-fit-accent/10 text-xs font-semibold transition-colors"
        >
          <Plus size={13} strokeWidth={2.7} /> Satz hinzufügen
        </button>
      </div>
    </div>
  );
}
