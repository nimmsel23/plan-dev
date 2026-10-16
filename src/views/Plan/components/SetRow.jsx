import { useState } from 'react';
import { completedSetPatch } from '../lib/completedSet.js';
import { Check, Trash2 } from "lucide-react";
import { formatSet } from "../lib/history.js";

// Eine einzelne Satz-Zeile innerhalb eines ExerciseBlock. Inputs je nach
// trackingType (weight_reps/bodyweight_reps/duration/distance_time).
// toggleCompleted() übernimmt beim ersten Abhaken automatisch den besten
// verfügbaren Wert (echte Eingabe > Ghost/letzte Performance) statt leer
// zu bleiben — Fallback-Kette identisch zu lib/quickComplete.js.
//
// `previous` (optional, Strong-"Vorher"-Spalte): der indexgleiche Satz aus
// der letzten abgeschlossenen Ausführung dieser Übung (eventLog-Eintrag,
// siehe lib/history.js). Hat Vorrang vor den Ghost-Werten, weil er echte
// Leistung statt Template-Ziel ist; Tippen übernimmt ihn in die Inputs.
// Ohne `showPrevious` bleibt das alte Layout ohne Zusatzspalte.
export default function SetRow({ set: rawSet, index, trackingType, previous, showPrevious = false, onPatch, onDelete, onCompleted }) {
  const [error, setError] = useState('');
  const isWeight = trackingType === "weight_reps";
  const isBodyweight = trackingType === "bodyweight_reps";
  const isDuration = trackingType === "duration";
  const isDistanceTime = trackingType === "distance_time";
  const set = {
    ...rawSet,
    ghostWeight: previous?.weight ?? rawSet.ghostWeight,
    ghostReps: previous?.reps ?? rawSet.ghostReps,
    ghostDistance: previous?.distance ?? rawSet.ghostDistance,
    ghostDuration: previous?.seconds ?? rawSet.ghostDuration,
  };

  function applyPrevious() {
    if (!previous || set.completed) return;
    if (isWeight) onPatch({ weight: previous.weight ?? null, reps: previous.reps ?? null });
    else if (isBodyweight) onPatch({ reps: previous.reps ?? null });
    else if (isDistanceTime) onPatch({ distance: previous.distance ?? null, duration: previous.seconds ?? null });
    else if (isDuration) onPatch({ duration: previous.seconds ?? null });
  }

  function toggleCompleted() {
    setError('');
    if (set.completed) { onPatch({ completed: false }); return; }
    try { onPatch(completedSetPatch(set, trackingType)); onCompleted?.(); }
    catch (err) { setError(err.message); }
  }

  return (
    <>
    <div className={`grid items-center gap-2 px-1 py-1.5 rounded-lg transition-colors ${set.completed ? "bg-green-500/10" : ""} ${setRowGrid(trackingType, showPrevious)}`}>
      <span className={`text-xs font-mono text-center ${set.setType && set.setType !== "normal" ? "text-fit-accent font-bold" : "text-fit-muted"}`}>
        {set.setType === "warmup" ? "W" : set.setType === "drop" ? "D" : set.setType === "failure" ? "F" : index + 1}
      </span>
      {showPrevious && (
        <button
          type="button"
          onClick={applyPrevious}
          disabled={!previous || set.completed}
          title={previous ? "Werte vom letzten Mal übernehmen" : undefined}
          className="min-w-0 truncate text-[11px] font-mono text-fit-muted text-center enabled:hover:text-fit-ink"
        >
          {previous ? formatSet(previous) : "–"}
        </button>
      )}
      {(isWeight || isDistanceTime) && (
        <input
          type="number"
          inputMode="decimal"
          placeholder={isWeight ? String(set.ghostWeight ?? set.targetWeight ?? "kg") : String(set.ghostDistance ?? set.targetDistance ?? "km")}
          value={isWeight ? (set.weight ?? "") : (set.distance ?? "")}
          onChange={(e) => onPatch({ [isWeight ? "weight" : "distance"]: e.target.value === "" ? null : Number(e.target.value) })}
          className="px-2 py-1.5 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono text-center focus:outline-none focus:border-fit-accent placeholder:text-fit-muted"
        />
      )}
      {isBodyweight && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={String(set.ghostReps ?? set.targetReps ?? "Wdh")}
          value={set.reps ?? ""}
          onChange={(e) => onPatch({ reps: e.target.value === "" ? null : Number(e.target.value) })}
          className="px-2 py-1.5 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono text-center focus:outline-none focus:border-fit-accent placeholder:text-fit-muted"
        />
      )}
      {isBodyweight && (
        <div className="px-2 py-1.5 rounded-lg bg-fit-bg2/50 border border-fit-line text-fit-muted text-[11px] text-center">
          {set.progressionStage || "Körpergewicht"}
        </div>
      )}
      {isWeight && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={String(set.ghostReps ?? set.targetReps ?? "Wdh")}
          value={set.reps ?? ""}
          onChange={(e) => onPatch({ reps: e.target.value === "" ? null : Number(e.target.value) })}
          className="px-2 py-1.5 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono text-center focus:outline-none focus:border-fit-accent placeholder:text-fit-muted"
        />
      )}
      {isDistanceTime && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={String(set.ghostDuration ?? set.targetDuration ?? "sek")}
          value={set.duration ?? ""}
          onChange={(e) => onPatch({ duration: e.target.value === "" ? null : Number(e.target.value) })}
          className="px-2 py-1.5 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono text-center focus:outline-none focus:border-fit-accent placeholder:text-fit-muted"
        />
      )}
      {isDuration && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={String(set.ghostDuration ?? set.targetDuration ?? "sek")}
          value={set.duration ?? ""}
          onChange={(e) => onPatch({ duration: e.target.value === "" ? null : Number(e.target.value) })}
          className="px-2 py-1.5 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono text-center focus:outline-none focus:border-fit-accent placeholder:text-fit-muted"
        />
      )}
      <button
        aria-label={set.completed ? `Satz ${index + 1} wieder öffnen` : `Satz ${index + 1} abschließen`}
        onClick={toggleCompleted}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ background: set.completed ? "#22c55e33" : "var(--bg2)", color: set.completed ? "#22c55e" : "var(--dim)" }}
      >
        <Check size={16} strokeWidth={3} />
      </button>
      <button aria-label={`Satz ${index + 1} löschen`} onClick={onDelete} className="w-9 h-9 rounded-lg flex items-center justify-center text-fit-muted hover:text-fit-red hover:bg-red-500/10 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
    {error && <p role="alert" className="px-2 pb-2 text-xs text-fit-red">{error}</p>}
    </>
  );
}

// Spaltenraster — von ExerciseBlock für die Kopfzeile mitbenutzt, damit
// Kopf und Zeilen nie auseinanderlaufen.
export function setRowGrid(trackingType, showPrevious) {
  // Literale Klassen-Strings, damit Tailwinds Content-Scan sie findet.
  if (trackingType === "duration") {
    return showPrevious
      ? "grid-cols-[1.5rem_minmax(0,1.3fr)_1fr_2.25rem_2.25rem]"
      : "grid-cols-[1.5rem_1fr_2.25rem_2.25rem]";
  }
  return showPrevious
    ? "grid-cols-[1.5rem_minmax(0,1.3fr)_1fr_1fr_2.25rem_2.25rem]"
    : "grid-cols-[1.5rem_1fr_1fr_2.25rem_2.25rem]";
}
