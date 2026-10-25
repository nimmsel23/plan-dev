import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { api as defaultApi } from "./api.js";
import ExerciseSearch from "./components/ExerciseSearch.jsx";
import MuscleHeatmap from "./components/MuscleHeatmap.jsx";
import ExerciseRow from "./components/ExerciseRow.jsx";
import { patchTemplateSets } from "./lib/templateSets.js";

export default function RoutineBuilder({ routineId, onBack, apiClient = defaultApi }) {
  const api = apiClient;
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState({});
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function load() {
    const d = await api.get(`/routines/${routineId}`);
    setRoutine(d.routine);
    setExercises(d.routine.exercises);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, [routineId, apiClient]);

  async function addExercise(ex) {
    await savePatches();
    await api.post(`/routines/${routineId}/exercises`, {
      exercise_id: ex.id,
      name: ex.name,
      primaryMuscles: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles,
      yuhonas_id: ex.yuhonas_id,
      equipment: ex.equipment || [],
      instructions: ex.instructions || [],
      trackingType: ex.trackingType || "weight_reps",
    });
    await load();
  }

  async function removeExercise(rowId) {
    await savePatches();
    await api.delete(`/routines/${routineId}/exercises/${rowId}`);
    await load();
  }

  function patchLocal(rowId, key, val) {
    setExercises((prev) => prev.map((e) => {
      if (e.id !== rowId) return e;
      const next = key === "templateSets"
        ? patchTemplateSets(e, () => val)
        : { ...e, [key]: val };
      return key === "trackingType" ? { ...next, weight_type: val === "bodyweight_reps" ? "bodyweight" : "kg" } : next;
    }));
    setDirty((d) => {
      const currentExercise = exercises.find((e) => e.id === rowId);
      const nextExercise = currentExercise
        ? (key === "templateSets" ? patchTemplateSets(currentExercise, () => val) : { ...currentExercise, [key]: val })
        : { [key]: val };
      const patch = key === "templateSets"
        ? {
            templateSets: nextExercise.templateSets,
            target_sets: nextExercise.target_sets,
            target_reps: nextExercise.target_reps,
            target_weight: nextExercise.target_weight,
            drop_set: nextExercise.drop_set,
            effort: nextExercise.effort,
          }
        : { [key]: val };
      return { ...d, [rowId]: { ...(d[rowId] ?? {}), ...patch } };
    });
  }

  async function savePatches() {
    setSaving(true);
    try {
      if (routine) await api.patch(`/routines/${routineId}`, { name: routine.name.trim() || "Workout-Vorlage", goal: routine.goal || null });
      await Promise.all(
        Object.entries(dirty).map(([id, patch]) =>
          api.patch(`/routines/${routineId}/exercises/${id}`, patch)
        )
      );
      setDirty({});
    } finally {
      setSaving(false);
    }
  }

  async function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    await savePatches();
    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(exercises, oldIndex, newIndex);
    setExercises(reordered);
    await api.put(`/routines/${routineId}/exercises/order`, {
      order: reordered.map((e, i) => ({ id: e.id, order: i })),
    });
  }

  const hasDirty = Object.keys(dirty).length > 0;
  const excludeIds = exercises.map((e) => e.exercise_id);

  if (error && !routine) return <p role="alert" className="p-6 text-fit-red">{error}<button aria-label="Zurück zu den Vorlagen" onClick={async () => { try { await savePatches(); onBack(); } catch (err) { setError(err.message); } }} className="ml-3 underline">Zurück</button></p>;

  if (!routine) return <div className="flex items-center justify-center min-h-[100dvh] text-fit-muted text-sm">Lädt…</div>;

  return (
    <fieldset disabled={saving} className="min-w-0 max-w-2xl mx-auto border-0 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button aria-label="Zurück zu den Vorlagen" onClick={async () => { try { await savePatches(); onBack(); } catch (err) { setError(err.message); } }} className="p-2 rounded-xl text-fit-muted hover:text-fit-ink hover:bg-fit-bg2 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-fit-muted">Workout-Vorlage<input aria-label="Name der Vorlage" value={routine.name} onChange={(e) => setRoutine({ ...routine, name: e.target.value })} className="mt-1 w-full bg-transparent text-xl font-bold text-fit-ink outline-none" /></label>
          {routine.goal && <p className="text-sm text-fit-muted">{routine.goal}</p>}
        </div>
        {(
          <button onClick={() => savePatches().catch((err) => setError(err.message))} disabled={saving}
            className="px-4 py-2 rounded-xl bg-fit-accent text-fit-bg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
            {saving ? "Speichert…" : "Speichern"}
          </button>
        )}
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-fit-red">{error}</p>}
      <p className="mb-4 text-sm text-fit-muted">Übungen hinzufügen, Satzvorgaben festlegen und die Reihenfolge am Griff ändern. Deine Vorlage bleibt beim Training wiederverwendbar.</p>
      {/* Exercise Search */}
      <div className="mb-5">
        <ExerciseSearch onAdd={addExercise} exclude={excludeIds} />
      </div>

      {/* Exercise List */}
      {exercises.length === 0 ? (
        <div className="text-center py-14 text-fit-muted text-sm">
          Noch keine Übungen. Suche oben nach einer Übung.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => onDragEnd(event).catch((err) => setError(err.message))}>
          <SortableContext items={exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 mb-6">
              {exercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  onPatch={(key, val) => patchLocal(ex.id, key, val)}
                  onDelete={() => removeExercise(ex.id).catch((err) => setError(err.message))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Muscle Heatmap */}
      {exercises.length > 0 && <MuscleHeatmap exercises={exercises} />}
    </fieldset>
  );
}
