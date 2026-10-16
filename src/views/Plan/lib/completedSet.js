const number = (v) => v === '' || v == null ? null : typeof v === 'string' && !/^\d+(\.\d+)?$/.test(v.trim()) ? null : Number.isFinite(Number(v)) ? Number(v) : null;
export function completedSetPatch(set, trackingType) {
  const choose = (field, ghost) => number(set[field] ?? set[ghost]);
  const patch = { completed: true };
  if (trackingType === 'weight_reps' || trackingType === 'bodyweight_reps') {
    const reps = choose('reps', 'ghostReps');
    if (!(reps > 0) || !Number.isInteger(reps)) throw new Error('Trage die tatsächlich absolvierten Wiederholungen ein.');
    patch.reps = reps;
    if (trackingType === 'weight_reps') {
      const weight = choose('weight', 'ghostWeight');
      if (weight == null || weight < 0) throw new Error('Trage das verwendete Gewicht ein.');
      patch.weight = weight;
    }
  } else {
    const duration = choose('duration', 'ghostDuration');
    if (!(duration > 0)) throw new Error('Trage die tatsächlich absolvierte Zeit in Sekunden ein.');
    patch.duration = duration;
    if (trackingType === 'distance_time') {
      const distance = choose('distance', 'ghostDistance');
      if (!(distance > 0)) throw new Error('Trage die zurückgelegte Distanz ein.');
      patch.distance = distance;
    }
  }
  return patch;
}
