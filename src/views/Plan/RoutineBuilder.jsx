import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { api } from "./api.js";
import ExerciseSearch from "./components/ExerciseSearch.jsx";
import MuscleHeatmap from "./components/MuscleHeatmap.jsx";
import ExerciseRow from "./components/ExerciseRow.jsx";
import { patchTemplateSets } from "./lib/templateSets.js";

export default function RoutineBuilder({ routineId, onBack }) {
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function load() {
    const d = await api.get(`/routines/${routineId}`);
    setRoutine(d.routine);
    setExercises(d.routine.exercises);
  }

  useEffect(() => { load(); }, [routineId]);

  async function addExercise(ex) {
    await api.post(`/routines/${routineId}/exercises`, {
      exercise_id: ex.id,
      name: ex.name,
      primaryMuscles: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles,
      yuhonas_id: ex.yuhonas_id,
      trackingType: ex.trackingType || "weight_reps",
    });
    load();
  }

  async function removeExercise(rowId) {
    await api.delete(`/routines/${routineId}/exercises/${rowId}`);
    load();
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

  if (!routine) return <div className="flex items-center justify-center min-h-[100dvh] text-fit-muted text-sm">Lädt…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl text-fit-muted hover:text-fit-ink hover:bg-fit-bg2 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{routine.name}</h1>
          {routine.goal && <p className="text-sm text-fit-muted">{routine.goal}</p>}
        </div>
        {hasDirty && (
          <button onClick={savePatches} disabled={saving}
            className="px-4 py-2 rounded-xl bg-fit-accent text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {saving ? "…" : "Speichern"}
          </button>
        )}
      </div>

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 mb-6">
              {exercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  onPatch={(key, val) => patchLocal(ex.id, key, val)}
                  onDelete={() => removeExercise(ex.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Muscle Heatmap */}
      {exercises.length > 0 && <MuscleHeatmap exercises={exercises} />}
    </div>
  );
}
