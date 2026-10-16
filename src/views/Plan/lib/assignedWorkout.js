import { normalizePlanExercise, YUHONAS_EXERCISES } from './catalog.js';

const byId = new Map(YUHONAS_EXERCISES.map((ex) => [ex.id, ex]));
const byRef = new Map(YUHONAS_EXERCISES.map((ex) => [ex.yuhonas_id, ex]));
// Adapt legacy coach assignments once, retaining source identity and prescriptions.
export function assignedWorkoutBody(plan) {
  const exercises = (plan.exercises || []).map((raw, order) => {
    const catalog = byId.get(raw.exercise_id) || byRef.get(raw.yuhonas_id) || {};
    const normalized = normalizePlanExercise({ ...catalog, ...raw, exercise_id: raw.exercise_id || catalog.id });
    return {
      ...normalized,
      exercise_id: normalized.id,
      order,
      target_sets: Number(raw.target_sets || (typeof raw.sets === 'number' ? raw.sets : 0)) || 3,
      target_reps: raw.target_reps ?? raw.reps ?? '8-12',
      rest_seconds: raw.rest_seconds ?? 90,
      templateSets: raw.templateSets?.length ? raw.templateSets : Array.from({ length: Number(raw.target_sets || (typeof raw.sets === 'number' ? raw.sets : 0)) || 3 }, (_, index) => ({
        setIndex: index + 1, setType: 'normal', targetReps: raw.target_reps ?? raw.reps ?? '8-12',
        targetWeight: raw.weight === '' || raw.weight == null ? null : Number(raw.weight),
        targetDuration: raw.duration ?? null,
      })),
    };
  });
  if (!exercises.length) throw new Error('Der zugewiesene Plan enthält noch keine Übungen.');
  return { name: plan.name || 'Coach-Workout', sourceAssignmentId: plan.id, routine_snapshot: { name: plan.name, exercises } };
}
