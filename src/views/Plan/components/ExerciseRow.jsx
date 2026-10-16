import { useState } from "react";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { muskelDe, muskelColor, dedupeMuskeln } from "../../../lib/kb/muscles.js";
import ExercisePhotoStrip from "../../../components/ExercisePhotoStrip.jsx";
import { ensureTemplateSets } from "../lib/templateSets.js";

// Eine Übungszeile im RoutineBuilder: Drag-Handle (dnd-kit sortable),
// Kopfzeile mit Zusammenfassung, aufklappbares Detail-Formular
// (Ziel-Sätze/Reps/Gewicht/Tracking/Satz-Typ/RIR/Tempo/Progression/Notiz).
export default function ExerciseRow({ ex, onPatch, onDelete }) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const templateSets = ensureTemplateSets(ex);
  const leadSet = templateSets[0] || {};

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl bg-fit-card border border-fit-line overflow-hidden">
      <ExercisePhotoStrip ex={ex} className="h-32 m-2 mb-0" />
      <div className="flex items-center gap-2 px-3 py-3">
        <button {...attributes} {...listeners} className="text-fit-muted hover:text-fit-ink cursor-grab active:cursor-grabbing p-1">
          <GripVertical size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-fit-ink truncate">{ex.name}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {dedupeMuskeln(ex.primaryMuscles).slice(0, 3).map((m) => (
              <span key={m} className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: muskelColor(m) + "22", color: muskelColor(m) }}>
                {muskelDe(m)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {templateSets.some((set) => set.setType === "failure") && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">Failure</span>}
          {templateSets.some((set) => set.setType === "drop") ? <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">Drop</span> : null}
          <span className="font-mono text-xs text-fit-muted">
            {templateSets.length}×{(ex.trackingType || "weight_reps") === "duration" ? (leadSet.targetDuration ?? "10s") : (leadSet.targetReps ?? "8-12")}
          </span>
          <button aria-label={`${ex.name}: Satzvorgaben bearbeiten`} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg text-fit-muted hover:text-fit-ink transition-colors">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-fit-muted hover:text-fit-red hover:bg-red-500/10 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-fit-line/50 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">Ziel-Sätze</span>
            <input type="number" min="1" value={templateSets.length}
              onChange={(e) => onPatch("templateSets", Array.from({ length: Math.max(1, Number(e.target.value) || 1) }, (_, index) => ({
                ...(templateSets[index] || leadSet || {}),
                setIndex: index + 1,
                setType: templateSets[index]?.setType || leadSet.setType || "normal",
                targetReps: templateSets[index]?.targetReps ?? leadSet.targetReps ?? "8-12",
                targetWeight: templateSets[index]?.targetWeight ?? leadSet.targetWeight ?? null,
                targetDistance: templateSets[index]?.targetDistance ?? leadSet.targetDistance ?? null,
                targetDuration: templateSets[index]?.targetDuration ?? leadSet.targetDuration ?? null,
                progressionStage: templateSets[index]?.progressionStage ?? leadSet.progressionStage ?? ex.progressionStage ?? null,
              })))}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono focus:outline-none focus:border-fit-accent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">{(ex.trackingType || "weight_reps") === "duration" ? "Ziel-Sekunden" : "Ziel-Wdh"}</span>
            <input value={(ex.trackingType || "weight_reps") === "duration" ? (leadSet.targetDuration ?? "") : (leadSet.targetReps ?? "")}
              onChange={(e) => onPatch("templateSets", templateSets.map((set) => (
                (ex.trackingType || "weight_reps") === "duration"
                  ? { ...set, targetDuration: e.target.value === "" ? null : Number(e.target.value) }
                  : { ...set, targetReps: e.target.value }
              )))}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono focus:outline-none focus:border-fit-accent"
              placeholder={(ex.trackingType || "weight_reps") === "duration" ? "10" : "8-12 / AMRAP"} />
          </label>
          {(ex.trackingType || "weight_reps") === "weight_reps" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fit-muted font-medium">Ziel-Gewicht</span>
              <input type="number" min="0" value={leadSet.targetWeight ?? ""}
                onChange={(e) => onPatch("templateSets", templateSets.map((set) => ({ ...set, targetWeight: e.target.value === "" ? null : Number(e.target.value) })))}
                className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono focus:outline-none focus:border-fit-accent"
                placeholder="60" />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">Pause (s)</span>
            <input type="number" min="0" value={ex.rest_seconds}
              onChange={(e) => onPatch("rest_seconds", Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono focus:outline-none focus:border-fit-accent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">Tracking</span>
            <select value={ex.trackingType || "weight_reps"}
              onChange={(e) => onPatch("trackingType", e.target.value)}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm focus:outline-none focus:border-fit-accent">
              <option value="weight_reps">Gewicht + Wdh</option>
              <option value="bodyweight_reps">Bodyweight + Wdh</option>
              <option value="duration">Dauer</option>
              <option value="distance_time">Distanz + Zeit</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">Satz-Typ</span>
            <select value={leadSet.setType || "normal"}
              onChange={(e) => onPatch("templateSets", templateSets.map((set) => ({ ...set, setType: e.target.value })))}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm focus:outline-none focus:border-fit-accent">
              <option value="normal">Normal</option>
              <option value="warmup">Warm-up</option>
              <option value="drop">Drop</option>
              <option value="failure">Failure</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">RIR</span>
            <input type="number" min="0" max="5" value={ex.rir ?? ""}
              onChange={(e) => onPatch("rir", e.target.value === "" ? null : Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono focus:outline-none focus:border-fit-accent"
              placeholder="0–5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">Tempo</span>
            <input value={ex.tempo ?? ""}
              onChange={(e) => onPatch("tempo", e.target.value)}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm font-mono focus:outline-none focus:border-fit-accent"
              placeholder="30X0" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fit-muted font-medium">Progression Stage</span>
            <input value={leadSet.progressionStage ?? ex.progressionStage ?? ""}
              onChange={(e) => onPatch("templateSets", templateSets.map((set) => ({ ...set, progressionStage: e.target.value || null })))}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm focus:outline-none focus:border-fit-accent"
              placeholder="tuck / adv_tuck / full" />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-fit-muted font-medium">Notiz</span>
            <input value={ex.notes ?? ""}
              onChange={(e) => onPatch("notes", e.target.value)}
              className="px-3 py-2 rounded-lg bg-fit-bg2 border border-fit-line text-fit-ink text-sm focus:outline-none focus:border-fit-accent"
              placeholder="Technik-Hinweis, Tempo, …" />
          </label>
        </div>
      )}
    </div>
  );
}
