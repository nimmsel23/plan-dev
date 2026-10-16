// Same imported Yuhonas records used by the existing KB; no second downloader.
import { EXERCISE_BULK_DATA } from '../../../lib/db/firestore/exerciseBulkData.generated.js';

const list = (value) => Array.isArray(value) ? value : value ? [value] : [];
export function normalizePlanExercise(raw = {}) {
  const ref = raw.yuhonas_id || list(raw.external_ids?.yuhonas)[0] || null;
  const equipment = list(raw.equipment);
  const category = raw.category || '';
  return {
    ...raw,
    id: raw.exercise_id || raw.id,
    name: raw.display_name || raw.displayName || raw.name || raw.exercise_id,
    yuhonas_id: ref,
    primaryMuscles: list(raw.primaryMuscles || raw.primary_muscles),
    secondaryMuscles: list(raw.secondaryMuscles || raw.secondary_muscles),
    equipment,
    instructions: list(raw.instructions || raw.steps || raw.coaching_notes),
    trackingType: raw.trackingType || (category === 'cardio' ? 'distance_time'
      : equipment.some((e) => /body only|bodyweight/i.test(e)) ? 'bodyweight_reps' : 'weight_reps'),
  };
}
export const YUHONAS_EXERCISES = EXERCISE_BULK_DATA.filter((ex) => ex.yuhonas_id).map(normalizePlanExercise);

export function mergeCatalog(curated = []) {
  const byRef = new Map(YUHONAS_EXERCISES.map((ex) => [ex.yuhonas_id, ex]));
  const others = [];
  for (const raw of curated) {
    const ex = normalizePlanExercise(raw);
    if (ex.yuhonas_id) {
      const base = byRef.get(ex.yuhonas_id);
      byRef.set(ex.yuhonas_id, base ? {
        ...base, ...ex,
        primaryMuscles: ex.primaryMuscles.length ? ex.primaryMuscles : base.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles.length ? ex.secondaryMuscles : base.secondaryMuscles,
        equipment: ex.equipment.length ? ex.equipment : base.equipment,
        instructions: ex.instructions.length ? ex.instructions : base.instructions,
      } : ex);
    }
    else others.push(ex);
  }
  return [...byRef.values(), ...others];
}

export function filterCatalog(items, { q = '', muscle = '', equipment = '' } = {}) {
  const fold = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]/g, ' ');
  const tokens = fold(q).split(/\s+/).filter(Boolean);
  return items.filter((ex) => (!muscle || ex.primaryMuscles.includes(muscle))
    && (!equipment || ex.equipment.includes(equipment))
    && tokens.every((word) => fold([ex.name, ex.yuhonas_id, ...(ex.aliases || []), ...ex.primaryMuscles, ...ex.equipment].join(' ')).includes(word)))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
