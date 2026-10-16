// A workout is a historical snapshot. Only an explicit action changes a template.
export function workoutTemplateExercises(workout) {
  return (workout.exercises || []).map((ex, order) => ({
    exercise_id: ex.exercise_id || null, name: ex.name,
    primaryMuscles: ex.primaryMuscles || [], secondaryMuscles: ex.secondaryMuscles || [],
    yuhonas_id: ex.yuhonas_id || null, equipment: ex.equipment || [], instructions: ex.instructions || [],
    trackingType: ex.trackingType || 'weight_reps', rest_seconds: ex.rest_seconds ?? 90,
    notes: ex.notes || null, order,
    templateSets: (ex.sets || []).map((s, i) => ({
      setIndex: i + 1, setType: s.setType || 'normal',
      targetReps: s.reps ?? s.targetReps ?? null, targetWeight: s.weight ?? s.targetWeight ?? null,
      targetDistance: s.distance ?? s.targetDistance ?? null, targetDuration: s.duration ?? s.targetDuration ?? null,
    })),
  }));
}
